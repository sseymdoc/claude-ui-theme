// 把 model.options 的返回整理成额度行。纯函数，不 import 任何东西，供组件与测试共用。
// 数据来源：当前 provider 的 usage.windows（openai-codex 的 Session 5h / Weekly、Anthropic 等）
// 或多账号池里可用账号的窗口；Nous Portal 走 plan_usage.gauges。

export interface QuotaRow {
  name: string
  percent: number
  resetsAt: number | null
}

export interface Quota {
  title: string
  rows: QuotaRow[]
  limited: boolean
}

const clampPercent = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null
}

const toMs = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // 秒级时间戳（< 1e12）换成毫秒
    return value < 1e12 ? value * 1000 : value
  }

  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function toQuota(result: any): Quota | null {
  const providers: any[] = Array.isArray(result?.providers) ? result.providers : []
  const provider = providers.find(p => p?.slug === result?.provider) ?? providers.find(p => p?.is_current)

  if (!provider) {
    return null
  }

  const rows: QuotaRow[] = []
  const usage = provider.usage ?? {}
  const accounts: any[] = Array.isArray(usage.accounts) ? usage.accounts : []
  const windows: any[] =
    Array.isArray(usage.windows) && usage.windows.length > 0
      ? usage.windows
      : (accounts.find(a => a?.state === 'ready') ?? accounts.find(a => a?.state === 'limited'))?.windows ?? []

  for (const w of windows) {
    const percent = clampPercent(w?.used_percent)

    if (percent !== null && typeof w?.label === 'string') {
      rows.push({ name: w.label, percent, resetsAt: toMs(w.resets_at) })
    }
  }

  for (const g of provider.plan_usage?.gauges ?? []) {
    const left = clampPercent(typeof g?.left_fraction === 'number' ? g.left_fraction * 100 : null)

    if (left !== null && typeof g?.label === 'string') {
      rows.push({ name: g.label, percent: 100 - left, resetsAt: toMs(g.resets_at_ms) })
    }
  }

  if (rows.length === 0) {
    return null
  }

  return { title: String(provider.name ?? provider.slug), rows, limited: Boolean(provider.limit) }
}
