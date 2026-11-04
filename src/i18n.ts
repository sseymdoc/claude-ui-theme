// 插件自有文案。Hermes 已有的说法（推理强度各档、上下文用量分类等）直接用 useI18n() 取官方字符串，
// 这里只放 Hermes 里没有对应项的部分，措辞跟随 Hermes 的口吻。

export const BUNDLES = {
  en: {
    effort: {
      faster: 'Faster',
      smarter: 'Smarter',
      default: 'Default',
      help: 'About reasoning effort'
    },
    quota: {
      title: 'Plan usage',
      limited: 'Limit reached',
      ring: (name: string, percent: number) => `Plan usage: ${name} ${percent}% used`
    },
    rail: {
      title: 'Session',
      toggle: 'Session panel',
      environment: 'Environment',
      goal: 'Goal',
      context: 'Context',
      connectors: 'Connectors',
      background: 'Background',
      folder: 'Folder',
      branch: 'Branch',
      project: 'Project',
      gateway: 'Gateway',
      noFolder: 'No folder',
      noSession: 'Start a session to see its details here.',
      noGoal: 'No goal or to-dos yet',
      todos: (done: number, total: number) => `${done} / ${total} to-dos`,
      turns: (used: number, max: number) => `${used} / ${max} turns`,
      compress: 'Compress',
      signIn: 'Sign in',
      refresh: 'Refresh',
      noConnectors: 'No MCP servers',
      tools: (n: number) => `${n} tools`,
      noBackground: 'Nothing in the background',
      stop: 'Stop',
      finished: 'Finished',
      subagent: 'Subagent'
    }
  },
  zh: {
    effort: {
      faster: '更快',
      smarter: '更聪明',
      default: '默认',
      help: '关于推理强度'
    },
    quota: {
      title: '套餐用量',
      limited: '已达上限',
      ring: (name: string, percent: number) => `套餐用量：${name} 已用 ${percent}%`
    },
    rail: {
      title: '会话',
      toggle: '会话面板',
      environment: '环境',
      goal: '目标',
      context: '上下文',
      connectors: '连接器',
      background: '后台',
      folder: '文件夹',
      branch: '分支',
      project: '项目',
      gateway: '网关',
      noFolder: '未选择文件夹',
      noSession: '开始一个会话后，这里会显示它的详情。',
      noGoal: '还没有目标或待办',
      todos: (done: number, total: number) => `待办 ${done} / ${total}`,
      turns: (used: number, max: number) => `${used} / ${max} 轮`,
      compress: '压缩',
      signIn: '登录',
      refresh: '刷新',
      noConnectors: '没有 MCP 服务器',
      tools: (n: number) => `${n} 个工具`,
      noBackground: '后台没有任务',
      stop: '停止',
      finished: '已结束',
      subagent: '子代理'
    }
  }
}
