// 推理强度入口：输入框选择器行里的档位名，点开是 codex-ui 的分档滑块。
// 读：会话变化时 config.get reasoning/fast，之后跟随 session.info 事件。
// 写：config.set reasoning（只对已有会话；新对话草稿阶段不渲染，由原生入口负责——
// 草稿时调 config.set 会改写全局配置）。原生 pill 的隐藏/让位规则在 components.css。
import { host, Popover, PopoverContent, PopoverTrigger, useI18n, usePluginI18n, useValue } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'

import { PLUGIN_ID, useThemeActive } from '../state'
import { EffortSlider } from './slider'

export const LEVELS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']

interface EffortState {
  effort: string
  fast: boolean
}

const isFast = (value: unknown) => value === 'fast' || value === 'ultrafast' || value === 'priority' || value === true

function useSessionEffort(sessionId: null | string): [EffortState | null, (next: EffortState | null) => void] {
  const [state, setState] = useState<EffortState | null>(null)

  useEffect(() => {
    setState(null)

    if (!sessionId) {
      return
    }

    let live = true

    Promise.all([
      host.request('config.get', { key: 'reasoning', session_id: sessionId }),
      host.request('config.get', { key: 'fast', session_id: sessionId })
    ])
      .then(([reasoning, fast]: any[]) => {
        if (live) {
          setState({ effort: String(reasoning?.value ?? ''), fast: isFast(fast?.value) })
        }
      })
      .catch(() => undefined)

    const off = host.onEvent('session.info', (event: any) => {
      if (event?.session_id && event.session_id !== sessionId) {
        return
      }

      const payload = event?.payload ?? {}

      setState(prev => ({
        effort: typeof payload.reasoning_effort === 'string' ? payload.reasoning_effort : (prev?.effort ?? ''),
        fast: 'fast' in payload ? isFast(payload.fast) : (prev?.fast ?? false)
      }))
    })

    return () => {
      live = false

      if (typeof off === 'function') {
        off()
      }
    }
  }, [sessionId])

  return [state, setState]
}

export function EffortControl() {
  const active = useThemeActive()
  const sessionId = useValue(host.state.activeSessionId)
  const { t } = useI18n()
  const pt = usePluginI18n(PLUGIN_ID)
  const [state, setState] = useSessionEffort(active ? sessionId : null)
  const [open, setOpen] = useState(false)

  if (!active || !sessionId || !state || !LEVELS.includes(state.effort)) {
    return null
  }

  const options = t?.shell?.modelOptions ?? {}
  const title: string = options.effort ?? 'Effort'
  const labels = Object.fromEntries(LEVELS.map(level => [level, options[level] ?? level]))

  const pick = async (level: string) => {
    const previous = state

    setState({ ...state, effort: level })

    try {
      await host.request('config.set', { key: 'reasoning', session_id: sessionId, value: level })
    } catch {
      setState(previous)
      host.notify({ kind: 'error', message: options.updateFailed ?? 'Model option update failed' })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cx-pill cx-effort-trigger"
          data-cxui-effort=""
          data-pro={state.effort === 'ultra' || undefined}
          aria-label={`${title}: ${labels[state.effort]}`}
        >
          {labels[state.effort]}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} className="cx-effort-pop">
        <EffortSlider
          levels={LEVELS}
          value={state.effort}
          labels={labels}
          recommended="medium"
          fast={state.fast}
          title={title}
          ends={[pt('effort.faster'), pt('effort.smarter')]}
          recommendedLabel={pt('effort.default')}
          helpLabel={pt('effort.help')}
          autoFocus
          onPick={level => void pick(level)}
        />
      </PopoverContent>
    </Popover>
  )
}
