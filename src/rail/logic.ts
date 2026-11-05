// 会话栏的纯逻辑：请求路由、上下文读数、后台行状态。不 import 任何东西，test/rail-logic.test.mjs 直接跑。
// 每条规则都照搬 Hermes 原生的写法，注释里标了出处（相对 apps/desktop/src）。

export interface Owner {
  connectionId: string
  profile: string
}

export type RowState = 'running' | 'done' | 'failed'

/** 同宿主 normalizeProfileKey（store/profile.ts）：去空白，空串算 default，区分大小写。 */
export const profileKey = (profile?: null | string): string => (profile ?? '').trim() || 'default'

export const ownerKey = (owner: null | Owner): string => (owner ? `${owner.connectionId}::${owner.profile}` : '')

/** 归属未知（草稿、解析不出）或就是活动网关时，直接走 host.request。connectionId 为 null 当 ''（sdk/index.ts 的 activeConnectionId）。 */
export function isActiveOwner(owner: null | Owner, active: { connectionId?: null | string; profile?: null | string }): boolean {
  return !owner || (owner.connectionId === (active.connectionId ?? '') && owner.profile === profileKey(active.profile))
}

/** 在 host.profileRoutes() 里按 connectionId + 桌面端 profile 找路由；targetProfile 是后端 profile，不参与匹配。 */
export function findRoute<R extends { connectionId: string; profile: string }>(owner: Owner, routes: readonly R[]): null | R {
  return routes.find(route => route.connectionId === owner.connectionId && profileKey(route.profile) === owner.profile) ?? null
}

/** 宿主的 Electron 桥上没有 getProfileRoutes 时，host.profileRoutes() 抛出的报错（sdk/index.ts）。 */
export const ROUTING_UNAVAILABLE = 'Hermes Desktop connection routing unavailable'

/** 按归属查路由并缓存（ponytail: 缓存到插件卸载，连接注册表改了要重载插件）。
 *  - 宿主明确没有路由接口：记为 'active'，退回活动网关，和改动前一样；
 *  - 找到路由：缓存；
 *  - 查不到（冷启动时路由表可能还不全）或查询失败（IPC 等瞬时错误）：不缓存，下次重新查；失败原样抛出，不落回活动网关。 */
export function routeResolver<R extends { connectionId: string; profile: string }>(profileRoutes: () => Promise<readonly R[]>) {
  const cache = new Map<string, Promise<'active' | null | R>>()

  return (owner: Owner): Promise<'active' | null | R> => {
    const key = ownerKey(owner)
    let pending = cache.get(key)

    if (!pending) {
      pending = profileRoutes().then(
        list => findRoute(owner, list ?? []),
        (error: any) => {
          if (String(error?.message ?? error).includes(ROUTING_UNAVAILABLE)) {
            return 'active' as const
          }

          throw error
        }
      )
      cache.set(key, pending)
      pending.then(
        found => {
          if (!found) {
            cache.delete(key)
          }
        },
        () => cache.delete(key)
      )
    }

    return pending
  }
}

export interface ContextReading {
  used: number
  max: number
  percent: number
  estimated: boolean
}

/** 同状态栏：有窗口的 breakdown 优先，否则用流式 usage；百分比取后端的 context_percent，夹到 0–100 再取整
 *  （app/shell/hooks/use-statusbar-items.tsx、lib/statusbar.tsx）。忙时调用方不传 breakdown。 */
export function contextReading(usage: any, breakdown: any): ContextReading | null {
  const source = breakdown?.context_max > 0 ? breakdown : usage
  const max = source?.context_max ?? 0

  if (!(max > 0)) {
    return null
  }

  return {
    used: source.context_used ?? 0,
    max,
    percent: Math.max(0, Math.min(100, Math.round(source.context_percent ?? 0))),
    estimated: Boolean(source.context_estimated)
  }
}

/** 分段按 tokens 占总和铺满整条，总和为 0 时退回已用量（app/shell/context-usage-panel.tsx）。width 是百分比。 */
export function segments<C extends { tokens: number }>(categories: readonly C[], used: number): (C & { width: number })[] {
  const total = categories.reduce((sum, c) => sum + (c.tokens || 0), 0) || used || 1

  return categories.map(c => ({ ...c, width: ((c.tokens || 0) / total) * 100 }))
}

/** 进程：status 不是 exited 就算运行中，退出码非 0 算失败（store/composer-status.ts）。 */
export const processState = (process: any): RowState =>
  process?.status !== 'exited'
    ? 'running'
    : typeof process.exit_code === 'number' && process.exit_code !== 0
      ? 'failed'
      : 'done'

const SUBAGENT_DONE = new Set(['completed', 'failed', 'interrupted', 'timeout', 'error', 'cancelled', 'canceled'])

/** 子代理：原生先归一化，未知状态当 running（store/subagents.ts），还活着的就是 running / queued。 */
export const subagentRunning = (status?: null | string): boolean => !SUBAGENT_DONE.has(status ?? '')

/** 结束的行：成功留 4 秒、失败留 12 秒（store/composer-status.ts），从第一次看到它结束算起。 */
export const LINGER_MS = { done: 4_000, failed: 12_000 }

/** seen 由调用方跨渲染持有；不再上报的 id 顺手清掉。返回要显示的行和最近一次到期的时间。 */
export function lingering<T extends { id: string; state: RowState }>(
  rows: readonly T[],
  seen: Map<string, number>,
  now: number
): { shown: T[]; next: null | number } {
  for (const id of [...seen.keys()]) {
    if (!rows.some(row => row.id === id)) {
      seen.delete(id)
    }
  }

  let next: null | number = null

  const shown = rows.filter(row => {
    if (row.state === 'running') {
      seen.delete(row.id)

      return true
    }

    if (!seen.has(row.id)) {
      seen.set(row.id, now)
    }

    const until = seen.get(row.id)! + LINGER_MS[row.state]

    if (until <= now) {
      return false
    }

    next = next === null ? until : Math.min(next, until)

    return true
  })

  return { shown, next }
}
