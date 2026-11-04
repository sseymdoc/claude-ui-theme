// 只给编辑器用：构建走 esbuild，不做类型检查。
declare module '*.css' {
  const text: string
  export default text
}
declare module '@hermes/plugin-sdk'
declare module 'react'
declare module 'react/jsx-runtime'
