// 额度用量环：输入框选择器行里的小圆环（占用最高的额度窗口），点开是各窗口的进度条与重置时间。
// model.options 在后端是重调用，所以只在有环挂着时轮询：挂载时、窗口可见期间每 5 分钟、
// 打开弹层时、每轮回复结束后（两次至少隔 2 分钟）。
import { atom, host, Popover, PopoverContent, PopoverTrigger, useI18n, usePluginI18n, useValue } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'

import { PLUGIN_ID, pluginContext, useThemeActive } from '../state'
import { type Quota, toQuota } from './data'
import { pickTop, resetText } from './model'
import { QuotaPopoverBody, UsageRing } from './ring'

const POLL_MS = 5 * 60_000
const MIN_GAP_MS = 2 * 60_000

export const $quota = atom<Quota | null>(null)

let users = 0
let stopTimer: (() => void) | null = null
let lastFetch = 0
let inflight = false

export async function refreshQuota(force: boolean): Promise<void> {
  if (users === 0 || inflight || (!force && Date.now() - lastFetch < MIN_GAP_MS)) {
    return
  }

  inflight = true

  try {
    const sessionId = host.state.activeSessionId.get()
    const result = await host.request('model.options', sessionId ? { session_id: sessionId, explicit_only: true } : { explicit_only: true }, 30_000)

    $quota.set(toQuota(result))
  } catch {
    // 后端暂不可用：保留上一次的数据
  } finally {
    inflight = false
    lastFetch = Date.now()
  }
}

/** register 时调用：每轮回复结束后顺手刷新一次（受最小间隔约束）。 */
export function bindQuota(ctx: any): void {
  ctx.onEvent('message.complete', () => void refreshQuota(false))
  ctx.onDispose(() => {
    stopTimer?.()
    stopTimer = null
    users = 0
  })
}

function useQuotaPolling(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    users += 1

    if (users === 1) {
      void refreshQuota(true)
      stopTimer = pluginContext()?.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void refreshQuota(false)
        }
      }, POLL_MS)
    }

    return () => {
      users -= 1

      if (users === 0) {
        stopTimer?.()
        stopTimer = null
      }
    }
  }, [enabled])
}

export function QuotaControl() {
  const active = useThemeActive()
  const quota = useValue($quota)
  const busy = useValue(host.state.busy)
  const { locale } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const [open, setOpen] = useState(false)

  useQuotaPolling(active)

  if (!active || !quota) {
    return null
  }

  const now = Date.now()
  const lang = String(locale ?? '').startsWith('zh') ? 'zh' : 'en'
  const top = pickTop(quota.rows)
  const percent = Math.round(top?.percent ?? 0)
  const label = pt('quota.ring', top?.name ?? '', percent)

  return (
    <Popover
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)

        if (next) {
          void refreshQuota(true)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="cx-pill cx-usage-trigger" data-cxui-quota="" data-limited={quota.limited || undefined} aria-label={label}>
          {/* motionKey 带上重置时间：每个额度周期各跳一次 75%/90%/100% 心跳 */}
          <UsageRing value={percent} size={14} stroke={2} motionKey={`plan:${top?.name ?? ''}:${top?.resetsAt ?? ''}`} streaming={busy} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} className="cx-usage-pop">
        <QuotaPopoverBody
          title={`${pt('quota.title')} · ${quota.title}`}
          rows={quota.rows.map(r => ({ name: r.name, percent: r.percent, resetText: resetText(r.resetsAt, now, lang) }))}
          footnote={quota.limited ? pt('quota.limited') : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
