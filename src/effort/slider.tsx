// 努力强度滑块：codex-ui Composer.tsx 的 EffortSlider / EffortName / ChargeCanvas 原样移植
// （c8e04f916 EffortControl + c2d9b9a76 Slider）。分档的 range，松开指针或松开按键时才提交；拖动时
// 手柄和填充朝指针「探身」；换档时档位名带模糊过渡；每一档都有 WebGL 充能场；减弱动效时只留填充色。
// 纯 UI：档位、文案、当前值都由调用方给，选中的档经 onPick 交回。样式在 styles/effort.css。

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

import { chargeField } from './charge'

export type EffortSliderProps = {
  /** 档位 id，由低到高 */
  levels: string[]
  /** 当前档 */
  value: string
  /** 档位显示名；缺的档显示 id */
  labels: Record<string, string>
  /** 档位说明：「?」悬停卡里显示；粗指针（触屏）下改在滑块下方显示 */
  descriptions?: Record<string, string>
  /** 推荐/默认档：滑块下方标出，停在该档时读屏也会念出 */
  recommended?: string
  /** 快速模式：充能场加上条纹 */
  fast: boolean
  /** 标题，也是滑块的无障碍名称 */
  title: string
  /** 轨道两端的说明：[左端（低档）, 右端（高档）] */
  ends: [string, string]
  /** 推荐标记的文字 */
  recommendedLabel: string
  /** 「?」按钮的无障碍名称 */
  helpLabel: string
  /** max 档名字后警告图标的悬停文字；不给就不显示图标 */
  warningText?: string
  /** 挂载后把焦点放到滑块上（快捷键打开时用） */
  autoFocus?: boolean
  onPick(level: string): void
}

/** 带用量警告的档（c8e04f916 徽标的 warning 变体）。 */
const WARNING_EFFORT = 'max'
/** 最高档：名字用 pro 紫，充能更猛（像 Ultracode）。 */
const PRO_EFFORT = 'ultra'
/**
 * 各档的充能色。画布上的 CSS 滤镜 hue-rotate → saturate → brightness（Chromium 在 sRGB 上算，逐档解出）
 * 把充能场的基色——底色深端 #1F5FE0，亮色的 --ui-accent——带到该档的颜色。每档都是同样三个函数，
 * 换档时滤镜从一档平滑过渡到下一档。low→max 是同一蓝色系由浅到深、由冷（偏青）到热（偏靛），
 * 色相偏移单调递增，max 就是基色本身；ultra 把蓝色场转回原版的 pro 紫（暗色基色 #7AA2FF → #A096EB，
 * 与原版暗色一致）。表里没有的档（如 minimal）按 low 充能，与原版一样。
 */
const EFFORT_CHARGE: Record<string, [hue: number, saturate: number, brightness: number]> = {
  low: [-40.2, 0.049, 1.928], // #B6C2C5
  medium: [-40.2, 0.282, 1.713], // #7AB6C5
  high: [-28.8, 0.5, 1.53], // #4AA3D2
  xhigh: [-16.3, 0.687, 1.311], // #2686DB
  max: [0, 1, 1], // #1F5FE0
  ultra: [22.9, 0.812, 0.991], // #574FCF
}

// 减弱动效只看系统的 prefers-reduced-motion（Hermes 自己也只看它）。
const REDUCE = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (onChange: () => void) => {
  const query = matchMedia(REDUCE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const reducedNow = () => matchMedia(REDUCE).matches

/** 减弱动效时为 true；JS 驱动的动效都先看它。 */
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, reducedNow)
}

export function EffortSlider({
  levels,
  value,
  labels,
  descriptions,
  recommended,
  fast,
  title,
  ends,
  recommendedLabel,
  helpLabel,
  warningText,
  autoFocus = false,
  onPick,
}: EffortSliderProps) {
  const n = levels.length
  const current = Math.max(0, levels.indexOf(value))
  const [preview, setPreview] = useState(null as number | null)
  // 选中的档要等调用方把 value 改过来；在那之前一直显示它，免得手柄和名字回跳一帧（c8e04f916 B）。
  const [picked, setPicked] = useState(null as number | null)
  if (picked !== null && (levels[picked] === undefined || levels[picked] === value)) setPicked(null)
  const range = useRef(null as HTMLInputElement | null)
  const track = useRef(null as HTMLDivElement | null)
  const handle = useRef(null as HTMLSpanElement | null)
  const drag = useRef(null as { x: number; grab: number } | null)
  const reduced = useReducedMotion()
  const shown = Math.min(preview ?? picked ?? current, n - 1)
  // 触屏下的说明跟着已提交的档走，不跟拖动中的预览，免得拖动时卡片忽高忽矮；松手时才变一次（c8e04f916 Fe）。
  const chosen = Math.min(picked ?? current, n - 1)
  // c2d9b9a76：指针按住滑块时，手柄和填充朝它探身，至多 0.12 档（按 1 − e^(−d/0.12) 缓出，取到半像素），
  // 松手后滑回档位。
  const lean = () => {
    const el = track.current
    if (!el || !drag.current || !range.current || n < 2) return
    const inset = (handle.current?.offsetWidth ?? 0) / 2
    const box = el.getBoundingClientRect()
    const span = box.width - 2 * inset
    const steps = (Math.min(Math.max((drag.current.x - drag.current.grab - box.left - inset) / span, 0), 1) - Number(range.current.value) / (n - 1)) * (n - 1)
    const px = `${(Math.round((Math.sign(steps) * 0.12 * (1 - Math.exp(-Math.abs(steps) / 0.12)) * span) / (n - 1) / 0.5) * 0.5).toFixed(1)}px`
    if (span > 0 && el.style.getPropertyValue('--lean') !== px) el.style.setProperty('--lean', px)
  }
  const release = () => {
    drag.current = null
    track.current?.style.removeProperty('--lean')
  }
  useLayoutEffect(lean, [shown])
  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => range.current?.focus())
  }, [autoFocus])
  if (n < 2) return null

  const name = (index: number) => labels[levels[index]] ?? levels[index]
  const info = (index: number) => descriptions?.[levels[index]] ?? ''
  const mark = recommended === undefined ? -1 : levels.indexOf(recommended)
  const level = levels[shown]
  // 每一档都像 Ultracode 的最高档那样充能，用该档的颜色。减弱动效时没有底板也没有场（yK），由填充上色。
  const [hue, saturate, brightness] = EFFORT_CHARGE[level] ?? EFFORT_CHARGE.low
  const commit = () => {
    const index = Number(range.current?.value ?? current)
    setPreview(null)
    const next = levels[index]
    if (next !== undefined && next !== value) {
      setPicked(index)
      onPick(next)
    }
  }

  return (
    <div className="cx-effort-section">
      <div className="cx-effort-head">
        <div className="cx-effort-title">
          <span>{title}</span>
          <EffortName index={shown} label={name(shown)} pro={level === PRO_EFFORT} reduced={reduced} />
          {level === WARNING_EFFORT && warningText && (
            <span className="cx-effort-warn" role="img" aria-label={warningText}>
              <i className="codicon codicon-warning" aria-hidden="true" />
              <span className="cx-effort-warn-card" aria-hidden="true">
                {warningText}
              </span>
            </span>
          )}
        </div>
        {info(shown) && (
          <button type="button" className="cx-effort-help" aria-label={helpLabel}>
            <i className="codicon codicon-question" aria-hidden="true" />
            <span className="cx-effort-help-card" role="tooltip">
              <span>{name(shown)}</span>
              <span>{info(shown)}</span>
            </span>
          </button>
        )}
      </div>
      <div className="cx-effort-body">
        <div className="cx-effort-ends" dir="ltr">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
        <div className="cx-effort-slider">
          <div
            ref={track}
            className="cx-effort-track"
            style={{ '--pos': shown / (n - 1), '--charge': `hue-rotate(${hue}deg) saturate(${saturate}) brightness(${brightness})` }}
          >
            <span className="cx-effort-fill" />
            <span className="cx-effort-charge" data-on={!reduced || undefined}>
              <ChargeCanvas lit={!reduced} stop={shown / (n - 1)} power={level === PRO_EFFORT} rush={fast} handle={handle} />
            </span>
            <span className="cx-effort-stops" aria-hidden="true">
              {levels.map((id, index) => (
                <span key={id} data-mark={index === mark || undefined} />
              ))}
            </span>
            <input
              ref={range}
              type="range"
              className="cx-effort-range"
              min={0}
              max={n - 1}
              step={1}
              value={shown}
              aria-label={title}
              aria-valuetext={shown === mark ? `${name(shown)} (${recommendedLabel})` : name(shown)}
              onChange={(event) => setPreview(Number(event.target.value))}
              onPointerDown={(event) => {
                if (event.button !== 0 || reduced || !track.current) return
                const inset = (handle.current?.offsetWidth ?? 0) / 2
                const box = track.current.getBoundingClientRect()
                const offset = event.clientX - (box.left + inset + (shown / (n - 1)) * (box.width - 2 * inset))
                // 按在手柄上就记住按住的位置；按在轨道上则对准手柄中心。
                drag.current = { x: event.clientX, grab: Math.abs(offset) <= 0.7 * inset ? offset : 0 }
                lean()
              }}
              onPointerMove={(event) => {
                if (!drag.current) return
                if (event.buttons === 0) return release()
                drag.current.x = event.clientX
                lean()
              }}
              onPointerUp={() => {
                release()
                commit()
              }}
              onPointerCancel={() => {
                release()
                setPreview(null)
              }}
              // Home / End 留给滑块，不让外层菜单拿去跳项。
              onKeyDown={(event) => {
                if (event.key === 'Home' || event.key === 'End') event.stopPropagation()
              }}
              onKeyUp={(event) => {
                if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key.startsWith('Page')) commit()
              }}
            />
            <span ref={handle} className="cx-effort-handle" aria-hidden="true" />
          </div>
          {mark >= 0 && (
            <div className="cx-effort-mark" data-on={shown === mark || undefined} style={{ '--mark': mark / (n - 1) }} aria-hidden="true">
              <span>{recommendedLabel}</span>
            </div>
          )}
        </div>
        {info(chosen) && <span className="cx-effort-desc">{info(chosen)}</span>}
      </div>
    </div>
  )
}

/** Framer Motion 的 easeOut。 */
const EASE_OUT = 'cubic-bezier(0, 0, 0.58, 1)'
/** c8e04f916 S：档位名的几层模糊副本（px）；进场时各层在 0.342 / 0.563 处的不透明度，以及退场时去往的值。 */
const NAME_BLUR = [0, 0.5, 1, 2]
const NAME_TIMES = [0, 0.342, 0.563, 1]
const NAME_IN = [
  [0, 0, 0, 1],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
]
const NAME_OUT = [0, 0, 0, 1]

/**
 * 档位名（c8e04f916 ae）：换档时新名字从移动方向滑进 0.55em，0.2s 内透过叠起的模糊副本逐渐变清晰
 * （2 → 1 → 0.5px → 清晰，plus-lighter 叠加）；被换下的名字脱离文档流继续滑出，边淡出边变模糊。
 * 第一个名字，以及减弱动效时的任何名字，直接出现。
 */
function EffortName({ index, label, pro, reduced }: { index: number; label: string; pro: boolean; reduced: boolean }) {
  const [names, setNames] = useState([{ seq: 0, index, label, pro, dir: 1 }])
  const current = names[names.length - 1]
  if (current.index !== index) {
    const next = { seq: current.seq + 1, index, label, pro, dir: index > current.index ? 1 : -1 }
    setNames(reduced ? [next] : [...names, next])
  }
  const box = useRef(null as HTMLSpanElement | null)
  const leaving = useRef(new Set<number>())
  useLayoutEffect(() => {
    const nodes = [...(box.current?.children ?? [])] as HTMLElement[]
    if (current.seq === 0 || reduced || nodes.length !== names.length) return
    const layers = (node: HTMLElement) => [...node.children] as HTMLElement[]
    const node = nodes[nodes.length - 1]
    node.animate([{ transform: `translateY(${current.dir * 0.55}em)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: EASE_OUT })
    layers(node).forEach((layer, k) => layer.animate(NAME_IN[k].map((opacity, i) => ({ opacity, offset: NAME_TIMES[i], easing: i === 2 ? EASE_OUT : 'linear' })), 200))
    names.slice(0, -1).forEach(({ seq }, i) => {
      if (leaving.current.has(seq)) return
      leaving.current.add(seq)
      // 从它此刻所在处出发，进场到一半的也一样。
      const old = nodes[i]
      const from = getComputedStyle(old)
      const exit = old.animate([{ transform: from.transform, opacity: from.opacity }, { transform: `translateY(${-current.dir * 0.55}em)`, opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: 'forwards' })
      exit.onfinish = () => {
        leaving.current.delete(seq)
        setNames((list) => list.filter((name) => name.seq !== seq))
      }
      layers(old).forEach((layer, k) => layer.animate([{ opacity: getComputedStyle(layer).opacity }, { opacity: NAME_OUT[k] }], { duration: 200, easing: EASE_OUT, fill: 'forwards' }))
    })
  }, [current.seq])
  return (
    <span ref={box} className="cx-effort-names" aria-hidden="true">
      {names.map((name) => (
        <span key={name.seq} className="cx-effort-name" data-pro={(name === current ? pro : name.pro) || undefined} data-leaving={name !== current || undefined}>
          {NAME_BLUR.map((blur) => (
            <span key={blur} style={blur ? { filter: `blur(${blur}px)` } : undefined}>
              {name === current ? label : name.label}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

/** 充能场的画布（c227f4d5e yK / bK）：场本身见 charge.ts。 */
function ChargeCanvas({ lit, stop, power, rush, handle }: { lit: boolean; stop: number; power: boolean; rush: boolean; handle: { current: HTMLElement | null } }) {
  const canvas = useRef(null as HTMLCanvasElement | null)
  const field = useRef(null as ReturnType<typeof chargeField>)
  const disposing = useRef(0)
  // 卸载时停帧并释放 WebGL context。StrictMode 会先模拟一次卸载、再把同一块画布装回去，所以推迟到
  // 下一个任务再释放，装回时取消——否则这块画布上只剩一个已丢失的 context，场再也亮不起来。
  useEffect(() => {
    clearTimeout(disposing.current)
    return () => {
      disposing.current = window.setTimeout(() => {
        field.current?.dispose()
        field.current = null
      })
    }
  }, [])
  useEffect(() => {
    // 场第一次亮起时才建 context（yK 也是那时才挂上）。
    if (lit && !field.current && canvas.current && handle.current) field.current = chargeField(canvas.current, handle.current, stop, power, rush)
    field.current?.press(lit)
  }, [lit])
  useEffect(() => field.current?.aim(stop, power), [stop, power])
  useEffect(() => field.current?.rush(rush), [rush])
  return <canvas ref={canvas} aria-hidden="true" />
}
