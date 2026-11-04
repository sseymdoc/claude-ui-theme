// Claude UI 的两套种子色。Hermes 会把它们写到 <html> 上，再在 styles.css 里用 color-mix 推导表面色；
// 推导结果由 styles/tokens.css 钉回下面这些设计值。中性色取自 codex-ui 的 tokens.css，强调色是柔化的 Hermes 蓝。

export const THEME_NAME = 'claude-ui'

const light = {
  background: '#fcfcfb',
  foreground: '#0b0b0b',
  card: '#ffffff',
  cardForeground: '#0b0b0b',
  muted: '#f2f1ee',
  mutedForeground: '#898781',
  popover: '#ffffff',
  popoverForeground: '#0b0b0b',
  primary: '#1f5fe0',
  primaryForeground: '#ffffff',
  secondary: '#f0efeb',
  secondaryForeground: '#0b0b0b',
  accent: '#f0efeb',
  accentForeground: '#0b0b0b',
  border: '#0b0b0b17',
  input: '#0b0b0b24',
  ring: '#1f5fe0',
  midground: '#1f5fe0',
  midgroundForeground: '#ffffff',
  composerRing: '#0b0b0b',
  destructive: '#d03b3b',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#f7f6f3',
  sidebarBorder: '#0b0b0b14',
  userBubble: '#f1f1ef',
  userBubbleBorder: '#0b0b0b14'
}

const dark = {
  background: '#151515',
  foreground: '#f0efec',
  card: '#1a1a19',
  cardForeground: '#f0efec',
  muted: '#222221',
  mutedForeground: '#898781',
  popover: '#20201f',
  popoverForeground: '#f0efec',
  primary: '#7aa2ff',
  primaryForeground: '#0b0b0b',
  secondary: '#252524',
  secondaryForeground: '#f0efec',
  accent: '#252524',
  accentForeground: '#f0efec',
  border: '#ffffff1a',
  input: '#ffffff24',
  ring: '#7aa2ff',
  midground: '#7aa2ff',
  midgroundForeground: '#0b0b0b',
  composerRing: '#f0efec',
  destructive: '#e5534b',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#111111',
  sidebarBorder: '#ffffff14',
  userBubble: '#212121',
  userBubbleBorder: '#ffffff14'
}

// 终端色取自 codex-ui 的 Claude Light / Claude Dark 代码主题，光标与选区换成本主题的蓝。
const terminal = {
  foreground: '#1a1a1a',
  cursor: '#1f5fe0',
  selectionBackground: '#1f5fe040',
  black: '#1a1a1a',
  red: '#ff3a30',
  green: '#1e9e3c',
  yellow: '#98801f',
  blue: '#0073e6',
  magenta: '#cd2054',
  cyan: '#8e6bd9',
  white: '#999999',
  brightBlack: '#666666',
  brightRed: '#ff5047',
  brightGreen: '#1e9e3c',
  brightYellow: '#98801f',
  brightBlue: '#0078f0',
  brightMagenta: '#cd2054',
  brightCyan: '#8e6bd9',
  brightWhite: '#d6d6d6'
}

const darkTerminal = {
  foreground: '#eaecf0',
  cursor: '#7aa2ff',
  selectionBackground: '#7aa2ff4d',
  black: '#262626',
  red: '#ff3a30',
  green: '#32d74b',
  yellow: '#ffd014',
  blue: '#0099ff',
  magenta: '#ff2c56',
  cyan: '#b796ff',
  white: '#a6a6a6',
  brightBlack: '#525252',
  brightRed: '#ff5047',
  brightGreen: '#32d74b',
  brightYellow: '#ffd014',
  brightBlue: '#0087ee',
  brightMagenta: '#ff2c56',
  brightCyan: '#b796ff',
  brightWhite: '#ededed'
}

export const buildTheme = (customCSS: string) => ({
  name: THEME_NAME,
  label: 'Claude UI',
  description: 'Warm paper neutrals, hairline borders and Hermes blue, with codex-ui tool rows, docked cards and the effort slider',
  colors: light,
  darkColors: dark,
  terminal,
  darkTerminal,
  customCSS
})
