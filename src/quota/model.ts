// 额度用量的纯函数：分级、挑占用最高的一行、重置时间文案。
// 不 import 任何东西，只用可擦除的类型语法，Node 能直接剥掉类型运行（test/quota.test.mjs）。

export type Level = 'normal' | 'warning' | 'critical'

/** 用量分级，沿用 codex-ui 的阈值：75% 起警告，90% 起危险；没有数据算普通。 */
export function level(percent: number | null): Level {
  const p = percent ?? 0
  return p >= 90 ? 'critical' : p >= 75 ? 'warning' : 'normal'
}

/** 占用最高且有百分比的一行；并列时取靠前的，一行都没有百分比时为 null。 */
export function pickTop<T extends { percent: number | null }>(rows: readonly T[]): T | null {
  return rows.reduce<T | null>((top, row) => (row.percent !== null && row.percent > (top?.percent ?? -1) ? row : top), null)
}

/**
 * 重置时间的简短文案，语义同 codex-ui 的 resetLabel：不到 1 小时说分钟，不到 1 天说小时（分钟不为 0 时带上），
 * 不到 7 天说星期几，再远说月日。时间已过算 0 分钟；没有重置时间（null / 0）返回 null。
 * 星期与日期按本机时区取。
 */
export function resetText(resetsAtMs: number | null, now: number, locale: 'en' | 'zh'): string | null {
  if (!resetsAtMs) return null
  const zh = locale === 'zh'
  const minutes = Math.max(0, Math.round((resetsAtMs - now) / 60000))
  if (minutes < 60) return zh ? `${minutes} 分钟后重置` : `resets in ${minutes}m`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return zh ? `${h} 小时${m ? ` ${m} 分钟` : ''}后重置` : `resets in ${h}h${m ? ` ${m}m` : ''}`
  }
  const when = new Date(resetsAtMs).toLocaleDateString(
    zh ? 'zh-CN' : 'en-US',
    minutes < 10080 ? { weekday: 'short' } : { month: 'short', day: 'numeric' }
  )
  return zh ? `${when}重置` : `resets ${when}`
}
