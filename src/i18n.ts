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
    // 文件夹、分支、上下文用量、待办、轮次、停止、刷新、登录等用 Hermes 官方词条（useI18n），这里只放官方没有的。
    // 标签名不叫 Session：中文下会和左侧原生的「会话」重名。
    rail: {
      title: 'Session details',
      environment: 'Environment',
      goal: 'Goal',
      connectors: 'Connectors',
      background: 'Background',
      compress: 'Compress',
      compressUnavailable: "This chat's input isn't on screen. Switch to it, then compress.",
      noSession: 'No session',
      noGoal: 'No goal or to-dos',
      noConnectors: 'No MCP servers',
      noBackground: 'Nothing running'
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
      title: '会话详情',
      environment: '环境',
      goal: '目标',
      connectors: '连接器',
      background: '后台',
      compress: '压缩',
      compressUnavailable: '这个会话的输入框不在屏幕上，先切到它再压缩。',
      noSession: '没有会话',
      noGoal: '没有目标或待办',
      noConnectors: '没有 MCP 服务器',
      noBackground: '后台没有任务'
    }
  }
}
