// 会话详情：codex-ui「会话栏」的五张卡，作为 Hermes 右侧栏里和「文件」叠在一起的标签，跟随当前聚焦的会话（含分屏）。
// 数据全部走 SDK：host.request / host.requestProfile（按会话归属）+ useQuery，host.onEvent 驱动刷新；不读宿主 DOM。
// 判定规则和文案照搬 Hermes 原生（状态栏、输入框上方的状态栈），纯逻辑与出处见 ./logic.ts。
import {
  atom,
  Button,
  Codicon,
  compactNumber,
  ConnectionGlyph,
  DisclosureCaret,
  GlyphSpinner,
  host,
  PANES_AREA,
  queryClient,
  Tip,
  useI18n,
  usePluginI18n,
  useQuery,
  useValue
} from '@hermes/plugin-sdk'
import { type ReactNode, useEffect, useReducer, useState } from 'react'

import { PLUGIN_ID, pluginContext, useThemeActive } from '../state'

import {
  contextReading,
  findRoute,
  isActiveOwner,
  lingering,
  type Owner,
  ownerKey,
  processState,
  segments,
  subagentRunning
} from './logic'

const RAIL_ID = `${PLUGIN_ID}:rail`
// = 后端 compression.threshold 的默认值 0.50；小于 512K 的窗口后端抬到 0.75，50–75% 正好是手动提前压缩的区间
const COMPRESS_FROM = 50

// ── 待办：Hermes 没有读取 RPC，借 composer.microActions 的 ctx.todos 拿到每个会话的实时列表（键是运行时 id）──
export const $todos = atom<Record<string, readonly any[]>>({})

export const todoProvider = {
  // 宿主在 effect 里调用 resolve（composer/hooks/use-micro-actions.ts），可以直接写入
  resolve(context: { sessionId: string; todos: readonly any[] }) {
    if ($todos.get()[context.sessionId] !== context.todos) {
      $todos.set({ ...$todos.get(), [context.sessionId]: context.todos })
    }

    return []
  }
}

// ── 每个会话最近一次 session.info 带来的 cwd / branch / project，按运行时 id 存 ──
// ponytail: 不清理，一个会话一条；会话多到要管再换 LRU
const $info = atom<Record<string, { cwd?: string; branch?: null | string; project?: any }>>({})

// ── 按会话归属发请求（同原生 store/session-request-router.ts）──
// 旧版桌面端没有 focusedSessionOwner：当作归属未知
const $owner = host.state.focusedSessionOwner ?? atom<null | Owner>(null)
const activeGateway = () => ({ connectionId: host.state.connectionId.get(), profile: host.state.profile.get() })
// ponytail: 路由按归属缓存到插件卸载，连接注册表改了要重载插件；没找到的不缓存（冷启动时路由表可能还不全）
const routes = new Map<string, Promise<any>>()

/** 归属未知、就是活动网关、宿主没有路由入口时走 host.request；归属明确却找不到路由时报错，不落回活动网关。 */
async function rpc<T = any>(owner: null | Owner, method: string, params: Record<string, unknown>, foreground = false): Promise<T> {
  const canRoute = typeof host.requestProfile === 'function' && typeof host.profileRoutes === 'function'

  if (!canRoute || isActiveOwner(owner, activeGateway())) {
    return host.request(method, params)
  }

  const key = ownerKey(owner)
  let route = routes.get(key)

  if (!route) {
    // 旧 Electron 没有 getProfileRoutes 时 profileRoutes 会抛错：退回活动网关，和改动前一样
    route = host.profileRoutes().then(
      (list: any[]) => findRoute(owner!, list ?? []),
      () => 'active'
    )
    routes.set(key, route)
    void route.then(found => found || routes.delete(key))
  }

  const found = await route

  if (found === 'active') {
    return host.request(method, params)
  }

  if (!found) {
    throw new Error(`claude-ui: no gateway route for ${key}`)
  }

  return foreground
    ? host.requestProfile(found, method, params, undefined, { spawnPriority: 'foreground' })
    : host.requestProfile(found, method, params)
}

/** 键里带参数（含 session_id）和归属：换会话、换归属就是另一条缓存，不会显示上一个会话的数据。 */
function useRpc<T = any>(method: string, params: null | Record<string, unknown>, options: Record<string, unknown> = {}) {
  const owner: null | Owner = useValue($owner)

  return useQuery<T>({
    queryKey: ['claude-ui', method, params, ownerKey(owner)],
    queryFn: () => rpc<T>(owner, method, params ?? {}),
    enabled: params !== null,
    staleTime: 0, // 宿主 QueryClient 默认 60s（lib/query-client.ts）
    retry: false,
    ...options
  })
}

// ── 事件：都按 event.session_id 定位到那个会话的查询，别的会话的事件不触发重拉 ──
function bindRailEvents(): () => void {
  const refetch = (method: string, sessionId?: string) => {
    if (sessionId) {
      void queryClient.invalidateQueries({ queryKey: ['claude-ui', method, { session_id: sessionId }] })
    }
  }

  const offs = [
    host.onEvent('session.info', (event: any) => {
      const sessionId = event?.session_id
      const payload = event?.payload ?? {}

      if (!sessionId) {
        return // 不带 session_id 的不认，免得混进别的会话的 cwd
      }

      const next = { ...$info.get()[sessionId] }

      for (const key of ['cwd', 'branch', 'project'] as const) {
        if (key in payload) {
          next[key] = payload[key]
        }
      }

      $info.set({ ...$info.get(), [sessionId]: next })

      if (sessionId === host.state.focusedSessionId.get()) {
        void queryClient.invalidateQueries({ queryKey: ['claude-ui', 'mcp.servers.status'] })
      }
    }),
    // payload 就是 { control }，和 session.control.read 的结果同形，直接写缓存
    host.onEvent('session.control.update', (event: any) => {
      if (event?.session_id) {
        queryClient.setQueriesData(
          { queryKey: ['claude-ui', 'session.control.read', { session_id: event.session_id }] },
          { control: event.payload?.control ?? null }
        )
      }
    }),
    host.onEvent('status.update', (event: any) => {
      const kind = event?.payload?.kind

      if (kind === 'process') {
        refetch('process.list', event.session_id)
      }

      // 压缩结束（gateway-event/status.ts）：/compress 不发 message.complete，要在这里重拉
      if (kind === 'compacted' || kind === 'ready') {
        refetch('session.context_breakdown', event.session_id)
      }
    }),
    // 只有 terminal / process 工具会起停后台进程（gateway-event/tools.ts）
    host.onEvent('tool.complete', (event: any) => {
      if (event?.payload?.name === 'terminal' || event?.payload?.name === 'process') {
        refetch('process.list', event.session_id)
      }
    }),
    ...['subagent.spawn_requested', 'subagent.start', 'subagent.complete'].map(type =>
      host.onEvent(type, (event: any) => refetch('subagent.list', event?.session_id))
    ),
    host.onEvent('projects.changed', () => void queryClient.invalidateQueries({ queryKey: ['claude-ui', 'projects.for_cwd'] }))
  ]

  return () => offs.forEach(off => typeof off === 'function' && off())
}

const basename = (path: string) => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || path
const firstLine = (text: string) => text.split('\n')[0].trim()

// ── 通用部件 ──
function Card({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  const storage = pluginContext()?.storage
  const [folded, setFolded] = useState<boolean>(() => Boolean(storage?.get(`fold.${id}`, false)))

  const toggle = () => {
    setFolded(!folded)
    storage?.set(`fold.${id}`, !folded)
  }

  return (
    <section className="cx-card" data-folded={folded || undefined}>
      <header className="cx-card-head">
        <button type="button" className="cx-card-title" aria-expanded={!folded} onClick={toggle}>
          <span className="dither cx-card-dither" aria-hidden="true" />
          <span className="cx-ellipsis">{title}</span>
          <span className="cx-caret" aria-hidden="true">
            <DisclosureCaret open={!folded} />
          </span>
        </button>
        {action}
      </header>
      {!folded && <div className="cx-card-body">{children}</div>}
    </section>
  )
}

function Row({ label, children, title }: { label: ReactNode; children?: ReactNode; title?: string }) {
  return (
    <div className="cx-row" title={title}>
      <span className="cx-row-label">{label}</span>
      {children !== undefined && <span className="cx-row-value">{children}</span>}
    </div>
  )
}

// 同原生右侧栏的 PaneEmptyState：居中、大写、dither 方点
const Empty = ({ children }: { children: ReactNode }) => (
  <p className="cx-empty">
    <span className="dither" aria-hidden="true" />
    {children}
  </p>
)

// SDK 的 Button：ghost + icon-xs = 24px、4px 圆角，hover 用 --chrome-action-hover
const IconAction = ({ label, icon, onClick, disabled }: { label: string; icon: string; onClick: () => void; disabled?: boolean }) => (
  <Tip label={label}>
    <Button type="button" variant="ghost" size="icon-xs" aria-label={label} disabled={disabled} onClick={onClick}>
      <Codicon name={icon} size="0.8125rem" />
    </Button>
  </Tip>
)

const Spinner = ({ label }: { label?: string }) => <GlyphSpinner ariaLabel={label} className="cx-spin" />

// ── 环境：文件夹、分支、项目，以及网关与 profile（代替 codex-ui 的 Remote Control）──
const isDetachedSha = (branch: string) => /^[0-9a-f]{7,40}$/.test(branch)

function EnvironmentCard({ sessionId }: { sessionId: null | string }) {
  const { t } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const owner: null | Owner = useValue($owner)
  const info = useValue($info)[sessionId ?? '']
  const primaryId = useValue(host.state.activeSessionId)
  const primaryCwd = useValue(host.state.cwd)
  const activeConnectionId = useValue(host.state.connectionId)
  const sessionProfile = useValue(host.state.focusedSessionProfile)

  // 先用这个会话自己的 session.info；只有聚焦的是主会话时才拿主会话的 cwd 兜底（分屏会话不能继承主会话的工作区）
  const fallbackCwd = !info && sessionId === primaryId ? primaryCwd : ''
  const lookup = useRpc('projects.for_cwd', fallbackCwd ? { cwd: fallbackCwd } : null)
  const folder = info?.cwd || fallbackCwd || ''
  const branch: null | string | undefined = info ? info.branch : lookup.data?.branch
  const projectName = (info ? info.project : lookup.data?.project)?.name

  const connectionId = owner?.connectionId ?? activeConnectionId ?? ''

  const connections = useQuery({
    queryKey: ['claude-ui', 'connections', connectionId],
    queryFn: () => host.connections(),
    staleTime: 0,
    retry: false
  })

  const list: any[] = connections.data ?? []
  const connection = list.find(c => c.id === connectionId) ?? list.find(c => c.primary)
  const profile = owner?.profile ?? sessionProfile
  const coding = t.statusStack.coding

  return (
    <Card id="environment" title={pt('rail.environment')}>
      <Row label={t.shell.statusbar.toggleWorkspace} title={folder || undefined}>
        {folder ? <span className="cx-strong">{basename(folder)}</span> : <span className="cx-muted">{t.rightSidebar.noFolderSelected}</span>}
      </Row>
      {branch && (
        <Row label={coding.scopeBranch}>
          <span className="cx-mono">{isDetachedSha(branch) ? `${coding.detached} · ${branch}` : branch}</span>
        </Row>
      )}
      {projectName && <Row label={t.sidebar.filter.project}>{projectName}</Row>}
      <Row label={t.shell.statusbar.gateway}>
        <span className="cx-inline">
          {connection && <ConnectionGlyph connection={connection} className="cx-glyph" />}
          <span>{connection?.label ?? t.settings.connections.kindLocal}</span>
          {profile && <span className="cx-muted">· {profile}</span>}
        </span>
      </Row>
    </Card>
  )
}

// ── 目标：Hermes 的 goal（session.control）与待办 ──
// 同输入框上方的目标行（composer/status-stack/session-control-goal.tsx）
function goalLine(goal: any, s: any): string {
  const state = goal.wait_barrier ? 'waiting' : goal.status === 'paused' ? 'paused' : goal.status === 'done' ? 'done' : 'active'
  const labels: Record<string, string> = { waiting: s.goalWaiting, paused: s.goalPaused, done: s.goalDone, active: s.goalActive }
  const label = goal.last_verdict === 'blocked' ? s.goalBlocked : labels[state]
  const turns = goal.turns_used ?? 0

  const count =
    state === 'done'
      ? s.control.goalDoneTurns(turns)
      : goal.max_turns > 0
        ? s.control.goalActiveTurns(turns, goal.max_turns)
        : turns > 0
          ? s.control.goalTurn(turns)
          : ''

  return count ? `${label} · ${count}` : label
}

// 同状态栈的待办行（composer/status-stack/status-row.tsx）：进行中转圈，完成、取消用 codicon，其余虚线圈；完成项不划线
function TodoIcon({ status, label }: { status?: string; label: string }) {
  if (status === 'in_progress') {
    return <Spinner label={label} />
  }

  if (status === 'completed' || status === 'cancelled') {
    return <Codicon name={status === 'completed' ? 'pass-filled' : 'circle-slash'} size="0.8rem" />
  }

  return <span className="cx-pending" />
}

function GoalCard({ sessionId }: { sessionId: string }) {
  const { t } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const control = useRpc('session.control.read', { session_id: sessionId })
  const todos = useValue($todos)[sessionId] ?? []
  const goal = control.data?.control?.goal
  const done = todos.filter((todo: any) => todo?.status === 'completed').length
  const s = t.statusStack

  return (
    <Card id="goal" title={pt('rail.goal')}>
      {control.isFetched && !goal && todos.length === 0 && <Empty>{pt('rail.noGoal')}</Empty>}
      {goal && (
        <div className="cx-goal">
          <span className="cx-strong">{goal.title}</span>
          <span className="cx-muted">{goalLine(goal, s)}</span>
          {(goal.subgoals ?? []).map((subgoal: string, i: number) => (
            <span key={i} className="cx-subgoal">
              {subgoal}
            </span>
          ))}
        </div>
      )}
      {todos.length > 0 && (
        <div className="cx-todos">
          <span className="cx-muted">{s.todos(done, todos.length)}</span>
          {todos.map((todo: any, i: number) => (
            <span key={todo?.id ?? i} className="cx-todo" data-status={todo?.status}>
              <span className="cx-lead" aria-hidden={todo?.status !== 'in_progress' || undefined}>
                <TodoIcon status={todo?.status} label={s.running} />
              </span>
              <span>{todo?.content ?? ''}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── 上下文：读数同状态栏，条形图同状态栏的上下文面板（按分类铺满）──
function ContextCard({ sessionId }: { sessionId: string }) {
  const { t } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const busy = useValue(host.state.busy)
  const usage = useValue(host.state.focusedUsage)
  const storedId = useValue(host.state.focusedStoredSessionId)
  // 忙时不查 breakdown，只看流式 usage（app/shell/hooks/use-context-breakdown.ts）；gcTime 0：回合结束后不先露出回合前的旧数
  const breakdown = useRpc('session.context_breakdown', busy ? null : { session_id: sessionId }, { gcTime: 0 })
  const reading = contextReading(usage, breakdown.data)
  const panel = t.shell.statusbar.contextUsagePanel
  const names = panel?.categories ?? {}
  const parts = segments((breakdown.data?.categories ?? []).filter((c: any) => c?.tokens > 0), reading?.used ?? 0)
  const est = reading?.estimated ? '~' : ''

  // submit 同步返回是否送达：目标会话的输入框不在屏幕上时为 false
  const compress = () => {
    if (!host.composer.submit(storedId ?? sessionId, '/compress')) {
      host.notify({ kind: 'info', message: pt('rail.compressUnavailable') })
    }
  }

  return (
    <Card
      id="context"
      title={t.shell.statusbar.contextUsage}
      // 图标按钮：237px 宽的区里放文字按钮会把「CONTEXT USAGE」挤成省略号。layers 是 Hermes 表示压缩的图标
      action={
        reading && reading.percent >= COMPRESS_FROM ? (
          <IconAction label={pt('rail.compress')} icon="layers" disabled={busy} onClick={compress} />
        ) : undefined
      }
    >
      {reading ? (
        <>
          {/* 没有分类时同原生：dither 空条（context-usage-panel.tsx） */}
          <div className={parts.length > 0 ? 'cx-meter' : 'cx-meter dither'} role="img" aria-label={`${est}${panel.percentFull(reading.percent)}`}>
            {parts.map((part: any) => (
              <span key={part.id} style={{ width: `${part.width}%`, background: part.color }} />
            ))}
          </div>
          <Row label={panel.tokenSummary(`${est}${compactNumber(reading.used)}`, compactNumber(reading.max))}>
            {`${est}${panel.percentFull(reading.percent)}`}
          </Row>
          {parts.length > 0 && (
            <div className="cx-legend">
              {parts.slice(0, 6).map((part: any) => (
                <span key={part.id}>
                  <i style={{ background: part.color }} />
                  {names[part.id] ?? part.label}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        breakdown.isFetched && <Empty>{panel.empty}</Empty>
      )}
    </Card>
  )
}

// ── 连接器：MCP 服务器状态，需要时登录 ──
const TONE: Record<string, string> = { connected: 'good', lazy: 'muted', configured: 'muted', disabled: 'off', failed: 'bad' }

function ConnectorsCard() {
  const { t } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const owner: null | Owner = useValue($owner)
  const status = useRpc('mcp.servers.status', {})
  const servers: any[] = status.data?.servers ?? []

  // 归属不是活动网关时，登录也落到会话所属的 profile（ProfileScope，api/client.ts）
  const signIn = (serverName: string) =>
    host
      .completeMcpOAuth({ serverName, ...(isActiveOwner(owner, activeGateway()) ? {} : { profile: owner }) })
      .catch(() => undefined)
      .finally(() => status.refetch())

  return (
    <Card id="connectors" title={pt('rail.connectors')} action={<IconAction label={t.common.refresh} icon="refresh" onClick={() => status.refetch()} />}>
      {status.isSuccess && servers.length === 0 && <Empty>{pt('rail.noConnectors')}</Empty>}
      {servers.map(server => (
        <div key={server.name} className="cx-item">
          <span className="cx-lead">
            {server.status === 'connecting' ? (
              <Spinner label={t.settings?.mcp?.statusConnecting} />
            ) : (
              <span className="cx-dot" data-tone={server.needs_auth ? 'warn' : (TONE[server.status] ?? 'muted')} />
            )}
          </span>
          <span className="cx-strong cx-ellipsis">{server.name}</span>
          {server.needs_auth ? (
            <Button type="button" variant="outline" size="xs" className="cx-accent" onClick={() => signIn(server.name)}>
              {t.notifications.mcp.signIn}
            </Button>
          ) : (
            <span className="cx-muted">{server.disabled ? '—' : t.agents.toolsCount(server.tools ?? 0)}</span>
          )}
        </div>
      ))}
    </Card>
  )
}

// ── 后台：后台进程与子代理，运行中的可以停止（同状态栈的 background 组与子代理区）──
function BackgroundCard({ sessionId }: { sessionId: string }) {
  const { t } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const owner: null | Owner = useValue($owner)

  // 有运行中的进程时每 5 秒兜底刷新，接住静默退出的进程（composer/status-stack/index.tsx）。
  // 不按 host.paneVisibility 节流：没有文件夹时它会把正在显示的会话栏报成不可见
  const processes = useRpc(
    'process.list',
    { session_id: sessionId },
    {
      refetchInterval: (query: any) =>
        (query.state.data?.processes ?? []).some((p: any) => processState(p) === 'running') ? 5_000 : false
    }
  )

  const subagents = useRpc('subagent.list', { session_id: sessionId })
  const [seen] = useState(() => new Map<string, number>())
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  const rows = (processes.data?.processes ?? []).map((p: any) => ({
    id: String(p.session_id),
    state: processState(p),
    command: String(p.command ?? p.session_id ?? ''),
    exit: p.exit_code
  }))

  const { shown, next } = lingering(rows, seen, Date.now())
  const live = (subagents.data?.subagents ?? []).filter((sub: any) => subagentRunning(sub.status))
  const s = t.statusStack

  // 结束的行到期后重渲染一次，把它移走
  useEffect(() => {
    if (next === null) {
      return
    }

    const timer = setTimeout(rerender, Math.max(0, next - Date.now()))

    return () => clearTimeout(timer)
  }, [next])

  const stopProcess = (id: string) =>
    rpc(owner, 'process.kill', { process_id: id, session_id: sessionId }, true)
      .catch(() => undefined)
      .finally(() => processes.refetch())

  const stopSubagent = (id: string) =>
    rpc(owner, 'subagent.interrupt', { session_id: sessionId, subagent_id: id }, true)
      .then((result: any) => (result?.found ? host.notify({ kind: 'info', message: t.agents.stopRequested }) : Promise.reject()))
      .catch(() => host.notify({ kind: 'error', message: t.agents.requestRejected }))
      .finally(() => subagents.refetch())

  return (
    <Card id="background" title={pt('rail.background')}>
      {processes.isFetched && subagents.isFetched && shown.length === 0 && live.length === 0 && <Empty>{pt('rail.noBackground')}</Empty>}
      {shown.map(row => (
        <div key={row.id} className="cx-item" title={row.command}>
          <span className="cx-lead">
            {row.state === 'running' ? <Spinner label={s.running} /> : <span className="cx-dot" data-tone={row.state === 'failed' ? 'bad' : 'good'} />}
          </span>
          <span className="cx-mono cx-ellipsis">{firstLine(row.command)}</span>
          {row.state === 'failed' && <span className="cx-exit">{s.exit(row.exit)}</span>}
          {row.state === 'running' && <IconAction label={s.stop} icon="debug-stop" onClick={() => stopProcess(row.id)} />}
        </div>
      ))}
      {live.map((sub: any) => (
        <div key={sub.subagent_id} className="cx-item" title={sub.goal ?? undefined}>
          <span className="cx-lead">
            <Spinner label={s.running} />
          </span>
          <span className="cx-ellipsis">{sub.goal || sub.subagent_id}</span>
          <IconAction label={s.stop} icon="debug-stop" onClick={() => stopSubagent(sub.subagent_id)} />
        </div>
      ))}
    </Card>
  )
}

export function Rail() {
  const pt = usePluginI18n(PLUGIN_ID)
  const sessionId = useValue(host.state.focusedSessionId)

  return (
    <div className="cx-rail">
      <EnvironmentCard sessionId={sessionId} />
      {sessionId ? (
        <>
          <GoalCard sessionId={sessionId} />
          <ContextCard sessionId={sessionId} />
        </>
      ) : (
        <Empty>{pt('rail.noSession')}</Empty>
      )}
      <ConnectorsCard />
      {/* key：换会话时「已结束的行」的计时重新开始 */}
      {sessionId && <BackgroundCard key={sessionId} sessionId={sessionId} />}
    </div>
  )
}

// ── 管理器：挂在标题栏中间槽（常驻挂载点，渲染为空），本主题激活时把会话详情注册为原生右侧栏里的一个标签 ──
export function RailManager() {
  const active = useThemeActive()
  const { locale } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const ctx = pluginContext()

  // 依赖里有 locale：换语言就重新注册。窄窗口覆盖层和 ⌘K「切换…标签」只读注册时的 title。
  // ponytail: 每次 register 都往加载器的处置器数组追加一项（contrib/plugin.ts），卸载插件才清；只在切主题、开关全屏面板、换语言时发生
  useEffect(() => {
    if (!active || !ctx) {
      return
    }

    // 与原生「文件」同组堆叠：开关、⌘J、窄窗口覆盖层都由 Hermes 的右侧栏负责。
    // enforce 会把旧版本留在别处的位置在下次加载时挪回这里。
    const dispose = ctx.register({
      id: 'rail',
      area: PANES_AREA,
      title: pt('rail.title'),
      data: {
        placement: 'right',
        collapsible: true,
        hideOnly: true,
        dock: { pane: 'files', pos: 'center', enforce: true },
        // 窄窗口下 ⌘J 和标题栏按钮派发的是 file-browser；没有文件夹时 files 被隐藏，由这里接住
        revealAliases: ['file-browser'],
        // 同 files（store/layout.ts）。同区面板的宽度取最大值，三项都要写：files 被隐藏时这个区只剩会话详情
        width: '237px',
        minWidth: '10rem',
        maxWidth: '20rem'
      },
      render: () => <Rail />
    })

    // 会话详情没有关闭动作；这里只清掉旧版本或误操作留下的关闭记录
    if (typeof host.undismissPane === 'function') {
      host.undismissPane(RAIL_ID)
    }

    return dispose
  }, [active, locale])

  useEffect(() => (active ? bindRailEvents() : undefined), [active])

  return null
}
