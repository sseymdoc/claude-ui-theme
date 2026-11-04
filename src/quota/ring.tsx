// 额度用量环与弹层内容，移植自 codex-ui（ui.tsx 的 UsageRingMotion、Composer.tsx 的 PlanUsage）。
// 纯 UI：数据全由调用方给，弹层容器也由调用方提供。只依赖 react 与本目录；样式在 styles/quota.css，类名都以 cx-usage- 开头。
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

import { level } from './model'

// ── 用量环 ──────────────────────────────────────────────────────────────

type Beat = 1 | 2 | 3
type Motion = { entrance: 'draw' | 'quiet' | null; beat: Beat | null; queued: Beat | null; shimmer: number | null }

const QUIET: Motion = { entrance: null, beat: null, queued: null, shimmer: null }
/** 三档心跳的时长（毫秒）：警告、危险、触顶；与 quota.css 里对应 animation 的时长一致。 */
const BEAT_MS: Record<Beat, number> = { 1: 2300, 2: 1450, 3: 2450 }
const BAND = { normal: 0, warning: 1, critical: 2 } as const

/** 本机见过的用量窗口：入场画过没有、哪几档心跳已经跳过。只留最近 100 个窗口。 */
const LEDGER = 'claude-ui:usageRingMotion'
type Ledger = Record<string, { drawn: boolean; beats: number[] }>

function readLedger(): Ledger {
  try {
    return JSON.parse(localStorage.getItem(LEDGER) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

/** 记下窗口已画过入场、band 及以下各档心跳都已跳过。先删再插，让它排到最新。 */
function writeLedger(key: string, band: number) {
  const ledger = readLedger()
  const beats = [1, 2, 3].filter(b => b <= band || ledger[key]?.beats.includes(b))
  delete ledger[key]
  ledger[key] = { drawn: true, beats }
  const keys = Object.keys(ledger)
  for (const old of keys.slice(0, Math.max(0, keys.length - 100))) delete ledger[old]
  try {
    localStorage.setItem(LEDGER, JSON.stringify(ledger))
  } catch {
    // 存不下就算了：下次挂载会再画一次入场
  }
}

const REDUCE = '(prefers-reduced-motion: reduce)'

function subscribeMotion(onChange: () => void) {
  const query = matchMedia(REDUCE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const reducedNow = () => matchMedia(REDUCE).matches

export interface UsageRingProps {
  /** 已用百分比 0–100，越界会夹住 */
  value: number
  /** 外径（px），默认 18 */
  size?: number
  /** 线宽（px），默认 2 */
  stroke?: number
  /** 用量窗口的标识（如 `${额度名}:${重置时间}`）：同一窗口在本机只画一次入场，每档心跳只跳一次；不给就每次安静入场、不跳 */
  motionKey?: string
  /** 正在流式回复：由 false 变 true 且用量 ≥ 15% 时，环呼吸一下，一颗彗星跑到弧尾 */
  streaming?: boolean
}

/**
 * 用量环：轨道 + 圆头弧，弧色按分级（普通 / 75% 警告 / 90% 危险）。
 * 一个用量窗口在本机第一次出现时用 900ms 回弹画入，光晕闪一下；之后只做 200ms 的安静入场。
 * 升到警告、危险、触顶（100%）时各跳一次心跳；hover 外层按钮时放大 1.08。减少动效时什么都不动。
 */
export function UsageRing({ value, size = 18, stroke = 2, motionKey, streaming = false }: UsageRingProps) {
  const percent = Math.min(100, Math.max(0, value || 0))
  const severity = level(percent)
  const band = percent >= 100 ? 3 : BAND[severity]
  const reduced = useSyncExternalStore(subscribeMotion, reducedNow)
  const [motion, setMotion] = useState<Motion>(QUIET)
  const seen = useRef<{ key?: string; band: number } | null>(null)
  const wasStreaming = useRef(streaming)

  // 换了窗口：没画过就画入（draw），画过就安静入场（quiet），还没跳过的那档心跳排在入场之后。
  // 同一窗口升档：跳这一档（入场还没完就先排队）。
  useLayoutEffect(() => {
    if (reduced) return
    const entry = motionKey ? readLedger()[motionKey] : undefined
    const unplayed = motionKey && band > 0 && !entry?.beats.includes(band) ? (band as Beat) : null
    const first = seen.current === null || seen.current.key !== motionKey
    const rose = !first && band > (seen.current?.band ?? 0)
    seen.current = { key: motionKey, band }
    if (first) setMotion(m => ({ ...m, entrance: motionKey && !entry?.drawn ? 'draw' : 'quiet', beat: null, queued: unplayed }))
    else if (rose && unplayed) setMotion(m => (m.entrance ? { ...m, queued: unplayed } : { ...m, beat: unplayed }))
    else return
    if (motionKey) writeLedger(motionKey, band)
  }, [motionKey, band, reduced])

  // 入场 1200ms（draw）/ 200ms（quiet）后结束，排队的心跳接着跳。
  useEffect(() => {
    if (!motion.entrance) return
    const timer = setTimeout(() => setMotion(m => ({ ...m, entrance: null, beat: m.queued, queued: null })), motion.entrance === 'draw' ? 1200 : 200)
    return () => clearTimeout(timer)
  }, [motion.entrance])

  useEffect(() => {
    if (!motion.beat) return
    const timer = setTimeout(() => setMotion(m => ({ ...m, beat: null })), BEAT_MS[motion.beat])
    return () => clearTimeout(timer)
  }, [motion.beat])

  useEffect(() => {
    if (streaming && !wasStreaming.current && !reduced && percent >= 15) setMotion(m => ({ ...m, shimmer: (m.shimmer ?? 0) + 1 }))
    wasStreaming.current = streaming
  }, [streaming, reduced, percent])

  useEffect(() => {
    if (motion.shimmer === null) return
    const timer = setTimeout(() => setMotion(m => ({ ...m, shimmer: null })), 2000)
    return () => clearTimeout(timer)
  }, [motion.shimmer])

  const shown = reduced ? QUIET : motion
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const style = {
    '--cx-usage-size': `${size}px`,
    '--cx-usage-c': circumference,
    // 彗星是 10% 圈长（36°）的一段，从 12 点转到尾端与弧尾对齐
    '--cx-usage-travel': `${Math.max(0, percent * 3.6 - 36)}deg`
  } as CSSProperties

  return (
    <span
      className="cx-usage-ring"
      style={style}
      data-level={severity}
      data-entrance={shown.entrance ?? undefined}
      data-beat={shown.beat ?? undefined}
      data-shimmer={shown.shimmer === null ? undefined : ''}
      aria-hidden="true"
    >
      <span className="cx-usage-ring__hover">
        <span className="cx-usage-ring__beat">
          <span className="cx-usage-ring__glow" />
          <span className="cx-usage-ring__beat-glow" />
          <span className="cx-usage-ring__hover-glow" />
          <span className="cx-usage-ring__breath">
            <svg className="cx-usage-ring__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle className="cx-usage-ring__track" cx={center} cy={center} r={radius} strokeWidth={stroke} />
              <circle
                className="cx-usage-ring__arc"
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percent / 100)}
              />
            </svg>
            {shown.shimmer !== null && percent >= 15 && (
              <svg key={shown.shimmer} className="cx-usage-ring__comet" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={center} cy={center} r={radius} strokeWidth={stroke} strokeDasharray={`${circumference * 0.1} ${circumference}`} />
              </svg>
            )}
          </span>
        </span>
      </span>
    </span>
  )
}

// ── 弹层内容 ────────────────────────────────────────────────────────────

/** 弹层里的一行：额度窗口名、已用百分比（没有数据为 null，不画进度条）、重置文案（通常来自 model.ts 的 resetText）。 */
export type QuotaPopoverRow = { name: string; percent: number | null; resetText: string | null }

export interface QuotaPopoverBodyProps {
  /** 标题行，如「套餐使用限额 · Pro」 */
  title: ReactNode
  rows: QuotaPopoverRow[]
  /** 列表下方的一段小字，可换行 */
  footnote?: ReactNode
}

/**
 * 弹层内容：标题行（muted），然后每个额度窗口一块——名称在左，重置文案与 N% 在右（放不下时换行），
 * 下面一条 4px 进度条，按分级着色，有用量时至少 4px 宽。
 */
export function QuotaPopoverBody({ title, rows, footnote }: QuotaPopoverBodyProps) {
  const titleId = useId()
  return (
    <div className="cx-usage-plan">
      <div id={titleId} className="cx-usage-head">
        {title}
      </div>
      <div className="cx-usage-list" role="group" aria-labelledby={titleId}>
        {rows.map((row, index) => {
          const pct = Number.isFinite(row.percent) ? Math.round(Math.min(100, Math.max(0, row.percent))) : null
          return (
            <div key={`${index}-${row.name}`} className="cx-usage-row">
              <div className="cx-usage-row-head">
                <span className="cx-usage-name">{row.name}</span>
                <span className="cx-usage-value">
                  {row.resetText && <span>{row.resetText}</span>}
                  {pct !== null && <span aria-hidden="true">{pct}%</span>}
                </span>
              </div>
              {pct !== null && (
                <div className="cx-usage-bar" role="meter" aria-label={row.name} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  {pct > 0 && <span data-level={level(pct)} style={{ '--cx-usage-pct': `${pct}%` } as CSSProperties} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {footnote && <div className="cx-usage-note">{footnote}</div>}
    </div>
  )
}
