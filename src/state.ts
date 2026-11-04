// 插件级共享状态：register 时拿到的 ctx，以及"本主题是否正在绘制"的判断。
import { useTheme } from '@hermes/plugin-sdk'

import { THEME_NAME } from './theme'

export const PLUGIN_ID = 'claude-ui'

let ctx: any = null

export const setPluginContext = (next: any) => {
  ctx = next
}

export const pluginContext = () => ctx

/** 自建组件只在本主题（含强调色衍生的 claude-ui-accent-*）激活时出现。 */
export function useThemeActive(): boolean {
  const { themeName } = useTheme()

  return typeof themeName === 'string' && themeName.startsWith(THEME_NAME)
}
