import { COMPOSER_AREAS, requestTheme, THEMES_AREA, TITLEBAR_AREAS } from '@hermes/plugin-sdk'

import { EffortControl } from './effort'
import { BUNDLES } from './i18n'
import { bindQuota, QuotaControl } from './quota'
import { RailManager, todoProvider } from './rail'
import { PLUGIN_ID, setPluginContext } from './state'
import components from './styles/components.css'
import composer from './styles/composer.css'
import effort from './styles/effort.css'
import overlays from './styles/overlays.css'
import quota from './styles/quota.css'
import shell from './styles/shell.css'
import stack from './styles/stack'
import tokens from './styles/tokens.css'
import transcript from './styles/transcript.css'
import { buildTheme, THEME_NAME } from './theme'

// customCSS 只在本主题被绘制时存在，宿主负责注入与移除。
const customCSS = [tokens, shell, transcript, stack, composer, overlays, components, effort, quota].join('\n')

export default {
  id: PLUGIN_ID,
  name: 'Claude UI',
  description: 'Hermes, dressed in codex-ui details: warm paper neutrals, one-line tool rows, docked cards, the effort slider, plan usage ring and a session panel.',
  register(ctx) {
    setPluginContext(ctx)
    ctx.i18n?.register?.(BUNDLES)

    ctx.register({ id: 'theme', area: THEMES_AREA, data: buildTheme(customCSS) })
    ctx.register({ id: 'quota', area: COMPOSER_AREAS.actions, order: 10, render: () => <QuotaControl /> })
    ctx.register({ id: 'effort', area: COMPOSER_AREAS.actions, order: 20, render: () => <EffortControl /> })
    ctx.register({ id: 'todos', area: COMPOSER_AREAS.microActions, data: todoProvider })
    ctx.register({ id: 'rail-manager', area: TITLEBAR_AREAS.right, render: () => <RailManager /> })
    bindQuota(ctx)

    // 首次启用时切过来一次；之后尊重用户在 设置 → 外观 里的选择。
    if (!ctx.storage.get('switched', false)) {
      ctx.storage.set('switched', true)
      requestTheme(THEME_NAME)
    }
  }
}
