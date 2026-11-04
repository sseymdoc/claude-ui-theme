// 会话栏：codex-ui「会话栏」的五张卡，停靠在聊天区右侧。跟随当前聚焦的会话（focusedSessionId）。
// 数据全部走 SDK：host.state、host.request（网关 JSON-RPC）、host.onEvent；不读宿主 DOM。
import { atom, compactNumber, ConnectionGlyph, host, PANES_AREA, useI18n, usePluginI18n, useValue } from '@hermes/plugin-sdk'
import { type ReactNode, useEffect, useState } from 'react'

import { PLUGIN_ID, pluginContext, useThemeActive } from '../state'

// ── 待办：Hermes 没有读取 RPC，借 composer.microActions 的 ctx.todos 拿到当前会话的实时列表 ──
export const $todos = atom<Record<string, readonly any[]>>({})

export const todoProvider = {
  resolve(context: { sessionId: string; todos: readonly any[] }) {
    if ($todos.get()[context.sessionId] !== context.todos) {
      // 组件渲染期间调用，推迟写入，避免在别人的 render 里触发我们的订阅者
      queueMicrotask(() => $todos.set({ ...$todos.get(), [context.sessionId]: context.todos }))
    }

    return []
  }
}

/** 拉取一次数据；deps 变化或收到 events 中的事件（防抖）时重拉。 */
function useLive<T>(load: () => Promise<T>, deps: unknown[], events: string[] = [], debounceMs = 600): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true

    load()
      .then(value => live && setData(value))
      .catch(() => live && setData(null))

    return () => {
      live = false
    }
  }, [...deps, tick])

  useEffect(() => {
    if (events.length === 0) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const offs = events.map(type =>
      host.onEvent(type, () => {
        clearTimeout(timer)
        timer = setTimeout(() => setTick(n => n + 1), debounceMs)
      })
    )

    return () => {
      clearTimeout(timer)
      offs.forEach(off => typeof off === 'function' && off())
    }
  }, deps)

  return [data, () => setTick(n => n + 1)]
}

const basename = (path: string) => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || path

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
          {title}
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

// ── 环境：文件夹、分支、项目，以及网关与 profile（代替 codex-ui 的 Remote Control）──
function EnvironmentCard({ sessionId }: { sessionId: null | string }) {
  const pt = usePluginI18n(PLUGIN_ID)
  const primaryCwd = useValue(host.state.cwd)
  const profile = useValue(host.state.profile)
  const connectionId = useValue(host.state.connectionId)
  const [info, setInfo] = useState<{ cwd?: string; branch?: string }>({})

  useEffect(() => {
    setInfo({})

    const off = host.onEvent('session.info', (event: any) => {
      if (event?.session_id && event.session_id !== sessionId) {
        return
      }

      const p = event?.payload ?? {}

      setInfo(prev => ({ cwd: p.cwd ?? prev.cwd, branch: p.branch ?? prev.branch }))
    })

    return () => typeof off === 'function' && off()
  }, [sessionId])

  const folder = info.cwd || primaryCwd || ''
  const [project] = useLive<any>(() => (folder ? host.request('projects.for_cwd', { cwd: folder }) : Promise.resolve(null)), [folder])
  const [connections] = useLive<any[]>(() => host.connections().catch(() => []), [])
  const connection = connections?.find(c => c.id === connectionId) ?? connections?.find(c => c.primary)
  const branch = info.branch || project?.branch

  return (
    <Card id="environment" title={pt('rail.environment')}>
      <Row label={pt('rail.folder')} title={folder || undefined}>
        {folder ? <span className="cx-strong">{basename(folder)}</span> : <span className="cx-muted">{pt('rail.noFolder')}</span>}
      </Row>
      {branch && (
        <Row label={pt('rail.branch')}>
          <span className="cx-mono">{branch}</span>
        </Row>
      )}
      {project?.project?.name && <Row label={pt('rail.project')}>{project.project.name}</Row>}
      <Row label={pt('rail.gateway')}>
        <span className="cx-inline">
          {connection && <ConnectionGlyph connection={connection} className="cx-glyph" />}
          <span>{connection?.label ?? 'local'}</span>
          {profile && <span className="cx-muted">· {profile}</span>}
        </span>
      </Row>
    </Card>
  )
}

// ── 目标：Hermes 的 goal（session.control）与待办（计划）──
const TODO_GLYPH: Record<string, string> = { completed: '●', in_progress: '◐', cancelled: '⊘' }

function GoalCard({ sessionId }: { sessionId: null | string }) {
  const pt = usePluginI18n(PLUGIN_ID)
  const todosBySession = useValue($todos)
  const [control] = useLive<any>(
    () => (sessionId ? host.request('session.control.read', { session_id: sessionId }).then((r: any) => r?.control ?? null) : Promise.resolve(null)),
    [sessionId],
    ['session.control.update']
  )

  const goal = control?.goal
  const todos = (sessionId && todosBySession[sessionId]) || []
  const done = todos.filter((t: any) => t?.status === 'completed').length

  return (
    <Card id="goal" title={pt('rail.goal')}>
      {!goal && todos.length === 0 && <span className="cx-muted">{pt('rail.noGoal')}</span>}
      {goal && (
        <div className="cx-goal">
          <span className="cx-strong">{goal.title}</span>
          <span className="cx-muted">
            {goal.status}
            {goal.max_turns ? ` · ${pt('rail.turns', goal.turns_used ?? 0, goal.max_turns)}` : ''}
          </span>
          {(goal.subgoals ?? []).map((s: string, i: number) => (
            <span key={i} className="cx-subgoal">
              {s}
            </span>
          ))}
        </div>
      )}
      {todos.length > 0 && (
        <div className="cx-todos">
          <span className="cx-muted">{pt('rail.todos', done, todos.length)}</span>
          {todos.map((todo: any, i: number) => (
            <span key={todo?.id ?? i} className="cx-todo" data-status={todo?.status}>
              <span className="cx-todo-glyph" aria-hidden="true">
                {TODO_GLYPH[todo?.status] ?? '○'}
              </span>
              <span>{todo?.content ?? ''}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── 上下文：占用条（按 Hermes 的分类着色）+ 压缩 ──
function ContextCard({ sessionId }: { sessionId: null | string }) {
  const pt = usePluginI18n(PLUGIN_ID)
  const { t } = useI18n()
  const usage: any = useValue(host.state.focusedUsage)
  const busy = useValue(host.state.busy)
  const [breakdown] = useLive<any>(
    () => (sessionId ? host.request('session.context_breakdown', { session_id: sessionId }) : Promise.resolve(null)),
    [sessionId],
    ['message.complete'],
    1500
  )

  const used = usage?.context_used ?? breakdown?.context_used ?? 0
  const max = usage?.context_max ?? breakdown?.context_max ?? 0
  const percent = max > 0 ? Math.round((used / max) * 100) : null
  const names = t?.shell?.statusbar?.contextUsagePanel?.categories ?? {}
  const categories: any[] = (breakdown?.categories ?? []).filter((c: any) => c?.tokens > 0)

  return (
    <Card
      id="context"
      title={pt('rail.context')}
      action={
        sessionId && percent !== null && percent >= 50 ? (
          <button type="button" className="cx-mini" disabled={busy} onClick={() => host.composer.submit(sessionId, '/compress')}>
            {pt('rail.compress')}
          </button>
        ) : undefined
      }
    >
      <div className="cx-meter" role="img" aria-label={percent === null ? '' : `${percent}%`}>
        {categories.length > 0 && max > 0
          ? categories.map(c => <span key={c.id} style={{ width: `${(c.tokens / max) * 100}%`, background: c.color }} />)
          : percent !== null && <span style={{ width: `${percent}%`, background: 'var(--ui-text-tertiary)' }} />}
      </div>
      <Row label={max > 0 ? `${compactNumber(used)} / ${compactNumber(max)}` : '—'}>{percent !== null ? `${percent}%` : ''}</Row>
      {categories.length > 0 && (
        <div className="cx-legend">
          {categories.slice(0, 6).map(c => (
            <span key={c.id}>
              <i style={{ background: c.color }} />
              {names[c.id] ?? c.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── 连接器：MCP 服务器状态，需要时登录 ──
const TONE: Record<string, string> = { connected: 'good', connecting: 'busy', lazy: 'muted', configured: 'muted', disabled: 'off', failed: 'bad' }

function ConnectorsCard() {
  const pt = usePluginI18n(PLUGIN_ID)
  const [status, reload] = useLive<any>(() => host.request('mcp.servers.status', {}), [], ['session.info'], 2000)
  const servers: any[] = status?.servers ?? []

  return (
    <Card
      id="connectors"
      title={pt('rail.connectors')}
      action={
        <button type="button" className="cx-icon" aria-label={pt('rail.refresh')} onClick={reload}>
          <i className="codicon codicon-refresh" />
        </button>
      }
    >
      {servers.length === 0 && <span className="cx-muted">{pt('rail.noConnectors')}</span>}
      {servers.map(server => (
        <div key={server.name} className="cx-row">
          <span className="cx-inline">
            <span className="cx-dot" data-tone={server.needs_auth ? 'warn' : (TONE[server.status] ?? 'muted')} />
            <span className="cx-strong">{server.name}</span>
          </span>
          {server.needs_auth ? (
            <button type="button" className="cx-mini cx-accent" onClick={() => host.completeMcpOAuth({ serverName: server.name }).finally(reload)}>
              {pt('rail.signIn')}
            </button>
          ) : (
            <span className="cx-muted">{server.disabled ? '—' : pt('rail.tools', server.tools ?? 0)}</span>
          )}
        </div>
      ))}
    </Card>
  )
}

// ── 后台：后台进程与子代理，运行中的可以停止 ──
const isRunning = (status?: null | string) => !status || /run|start|active|pending/i.test(status)

function BackgroundCard({ sessionId }: { sessionId: null | string }) {
  const pt = usePluginI18n(PLUGIN_ID)
  const [processes, reloadProcesses] = useLive<any[]>(
    () => (sessionId ? host.request('process.list', { session_id: sessionId }).then((r: any) => r?.processes ?? []) : Promise.resolve([])),
    [sessionId],
    ['status.update', 'tool.complete'],
    800
  )
  const [subagents, reloadSubagents] = useLive<any[]>(
    () => (sessionId ? host.request('subagent.list', { session_id: sessionId }).then((r: any) => r?.subagents ?? []) : Promise.resolve([])),
    [sessionId],
    ['subagent.start', 'subagent.complete', 'subagent.progress'],
    800
  )

  const procs = processes ?? []
  const subs = subagents ?? []
  const stop = (method: string, params: Record<string, string>, reload: () => void) =>
    host.request(method, { session_id: sessionId, ...params }).catch(() => undefined).finally(reload)

  return (
    <Card id="background" title={pt('rail.background')}>
      {procs.length === 0 && subs.length === 0 && <span className="cx-muted">{pt('rail.noBackground')}</span>}
      {procs.map(p => {
        const running = isRunning(p.status) && p.exit_code == null

        return (
          <div key={p.session_id} className="cx-row" title={p.command}>
            <span className="cx-inline cx-ellipsis">
              <span className="cx-dot" data-tone={running ? 'busy' : p.exit_code ? 'bad' : 'muted'} />
              <span className="cx-mono cx-ellipsis">{p.command ?? p.session_id}</span>
            </span>
            {running ? (
              <button type="button" className="cx-icon" aria-label={pt('rail.stop')} onClick={() => stop('process.kill', { process_id: p.session_id }, reloadProcesses)}>
                <i className="codicon codicon-debug-stop" />
              </button>
            ) : (
              <span className="cx-muted">{p.exit_code != null ? `exit ${p.exit_code}` : pt('rail.finished')}</span>
            )}
          </div>
        )
      })}
      {subs.map(s => {
        const running = isRunning(s.status)

        return (
          <div key={s.subagent_id} className="cx-row" title={s.goal ?? undefined}>
            <span className="cx-inline cx-ellipsis">
              <span className="cx-dot" data-tone={running ? 'busy' : 'muted'} />
              <span className="cx-ellipsis">{s.goal || pt('rail.subagent')}</span>
            </span>
            {running ? (
              <button type="button" className="cx-icon" aria-label={pt('rail.stop')} onClick={() => stop('subagent.interrupt', { subagent_id: s.subagent_id }, reloadSubagents)}>
                <i className="codicon codicon-debug-stop" />
              </button>
            ) : (
              <span className="cx-muted">{s.status ?? ''}</span>
            )}
          </div>
        )
      })}
    </Card>
  )
}

export function Rail() {
  const pt = usePluginI18n(PLUGIN_ID)
  const sessionId = useValue(host.state.focusedSessionId)

  return (
    <div className="cx-rail" data-cxui-rail="">
      <EnvironmentCard sessionId={sessionId} />
      {sessionId ? (
        <>
          <GoalCard sessionId={sessionId} />
          <ContextCard sessionId={sessionId} />
        </>
      ) : (
        <p className="cx-muted cx-rail-empty">{pt('rail.noSession')}</p>
      )}
      <ConnectorsCard />
      {sessionId && <BackgroundCard sessionId={sessionId} />}
    </div>
  )
}

// ── 管理器：挂在标题栏右侧（常驻挂载点，渲染为空），按主题、偏好与窗口宽度注册/注销面板和开关 ──
const NARROW_PX = 1000

export function RailManager() {
  const active = useThemeActive()
  const pt = usePluginI18n(PLUGIN_ID)
  const viewport: any = useValue(host.state.viewport)
  const ctx = pluginContext()
  const [wanted, setWanted] = useState<boolean>(() => Boolean(ctx?.storage.get('rail', true)))
  const wide = !viewport?.narrow && (viewport?.width ?? NARROW_PX) >= NARROW_PX
  const shown = active && wanted && wide

  useEffect(() => {
    if (!shown || !ctx) {
      return
    }

    return ctx.register({
      id: 'rail',
      area: PANES_AREA,
      title: pt('rail.title'),
      data: {
        placement: 'main',
        dock: { pane: 'workspace', pos: 'right', enforce: true },
        width: '260px',
        minWidth: '232px',
        maxWidth: '360px',
        headerVeto: true,
        uncloseable: true
      },
      render: () => <Rail />
    })
  }, [shown])

  useEffect(() => {
    if (!active || !ctx) {
      return
    }

    return ctx.register({
      id: 'rail-toggle',
      area: 'titleBar.tools.right',
      data: {
        id: 'claude-ui-rail',
        label: pt('rail.toggle'),
        icon: <i className="codicon codicon-layout-sidebar-right" />,
        active: shown,
        disabled: !wide,
        onSelect: () => {
          ctx.storage.set('rail', !wanted)
          setWanted(!wanted)
        }
      }
    })
  }, [active, wanted, wide, shown, pt])

  return null
}
