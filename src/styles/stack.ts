// ── 工作行堆叠：两段正文之间连续的工具调用按 codex-ui 的 ToolGroup 收成一行（transcript.ts rollUp）──
// 段内的思考不显示。一段以思考开头时，那条思考就是摘要行「已使用 N 个工具」，
// 点开后下面是细环卡片，每个工具行各占一格、都还收着。
// 不以思考开头的段退一步：第一个工具行当摘要行，后面接「以及另外 N 项操作」，点开时它自己的输出是卡片第一格。
// Hermes 没有给插件改分组的入口，这里只靠兄弟选择器，链长有上限。

const C = '[data-slot=aui_assistant-message-content]'
const T = '[data-slot=aui_thinking-disclosure]'
// 一段里的块：思考、工具组（Hermes 的 ToolRun）、单独成行的工具行（文件改动）。正文、委派卡、提问卡都会打断一段。
const S = `:is(${T},[data-tool-group],[data-tool-row])`
// 只装着待办更新（或被关掉的行）的工具组什么也不画，但仍占一个兄弟位
const E = '[data-tool-group]:not(:has(> * > *))'
// 看得见的工具块；等待审批时被 Hermes 收成 0 高的工具组（inert）不算
const TV = `:is([data-tool-group],[data-tool-row]):not(${E},[inert])`
const chain = (n: number) => ` + ${S}`.repeat(n)
// 段里第一个工具块：前面最多隔三个思考或空工具组，再往前是正文或开头
const NT = `:is(${T},${E})`
const lead = (n: number) => [`:not(${S})${` + ${NT}`.repeat(n)} + *`, n ? `${NT}:first-child${` + ${NT}`.repeat(n - 1)} + *` : ':first-child']
const STARTS = [0, 1, 2, 3].flatMap(lead).join(',')
const FIRST = `${TV}:is(${STARTS})`
const MEMBER = `${TV}:not(${STARTS})`
// 看得见的工具块。:has() 里不能再套 :has()：带行头的工具块就是看得见的那些，空工具组没有行头。
// 按类名往下找比 \`> * > *\` 快得多：通配的写法让行里任何节点变化都要重新判断
const TB = ':is([data-tool-group],[data-tool-row])'
const TOOL = `${TB} .group\\/disclosure-row`
// 后面还有工具块（最多隔三个块）
const NEXT = `:has(${[0, 1, 2, 3].map(n => `${chain(n)} + ${TOOL}`).join(',')})`
// 一段以思考开头、紧接着工具块、后面还有别的工具块：这条思考就是整段的开关。
// 它有自己的开关，所以展开整段时第一个工具行不会跟着打开，带差异的文件改动当第一行也不会让整段默认展开
const TOGGLE = `${T}:is(:not(${S}) + *,:first-child):has(+ ${TOOL}):has(${[0, 1, 2, 3].map(n => `+ ${TB}${chain(n)} + ${TOOL}`).join(',')})`
// 不以思考开头的段，退回用第一个工具行当摘要行
const HEAD = `${FIRST}:not(${TOGGLE} + *)`
const LIVE = '[data-slot=aui_assistant-message-root]:has(> [data-message-streaming=true])'

// ponytail: 嵌套兄弟链，匹配开销随段长平方增长；一段超过 61 个块时后面的不再折叠。
// Hermes 哪天开放消息部件的分组入口，就换成真正的分组组件。
const FOLD = 60 // 一段最多折叠的块数
const COUNT = 24 // 计数只看段首后面这么多个位置，再多显示 N+

// 折叠的块顺带清掉卡片格子的样式：正在输出时露出来的段尾不画半个框
const fold = Array.from({ length: FOLD }).reduce<string>(
  inner => `& + ${S} { display: none; --cx-cell-line: transparent; --cx-cell-pad: 0px; --cx-cell-gap: var(--scaffold-block-gap); ${inner} }`,
  ''
)

// 计数：段首后面第 p 个位置是工具块就记 1，加起来就是「另外 N 项」
const bits = Array.from({ length: COUNT }, (_, i) => `&:has(${chain(i)} + ${TOOL}) { --cx-t${i + 1}: 1; }`).join('\n  ')
const sum = Array.from({ length: COUNT }, (_, i) => `var(--cx-t${i + 1}, 0)`).join(' + ')

// 整句写进 1…COUNT 的符号里，0 回退成空白，所以只有一个工具的段不带后缀
const style = (name: string, say: (n: number) => string) =>
  `@counter-style ${name} { system: fixed 1; symbols: ${Array.from({ length: COUNT }, (_, i) => `'${say(i + 1)}'`).join(' ')}; fallback: cx-blank; }`

// 摘要文字的字号、颜色跟行标题一致
const say = `flex: none;
      white-space: pre;
      font-size: var(--conversation-tool-font-size);
      line-height: var(--conversation-line-height);
      color: var(--conversation-scaffold-text);`

// 卡片里每一格里的行展开时不再套一层细环卡片
const flatten = `
    border-color: transparent;
    border-radius: 0;
    background: transparent !important;

    & > :first-child {
      border-bottom-width: 0;
      padding: 0;
    }`

export default `
${C} > ${E} { display: none; }

/* 段内的思考不显示，和 codex-ui 默认视图一样；落单的思考照常显示，当开关的那条只留摘要行 */
${C} > :is(${S} + ${T},${T}:has(+ ${S})):not(${TOGGLE}) { display: none; }

/* 正在输出的消息：最末一个工具块留着，读作 codex-ui 那一行「正在做什么」（后面只剩工作行） */
${LIVE} > ${C} > ${TV}:not(:has(+ :not([data-slot=aui_turn-activity],[data-slot=aui_response-loading]))) {
  display: revert-layer !important;
}

@counter-style cx-blank { system: cyclic; symbols: ''; }
${style('cx-more-en', n => `, and ${n} more`)}
${style('cx-more-en-plus', n => `, and ${n}+ more`)}
${style('cx-more-zh', n => `，以及另外 ${n} 项操作`)}
${style('cx-more-zh-plus', n => `，以及另外 ${n}+ 项操作`)}
${style('cx-used-en', n => `Used ${n} tools`)}
${style('cx-used-en-plus', n => `Used ${n}+ tools`)}
${style('cx-used-zh', n => `已使用 ${n} 个工具`)}
${style('cx-used-zh-plus', n => `已使用 ${n}+ 个工具`)}

${C} > :is(${HEAD},${TOGGLE}) {
  ${bits}
}

/* ── 以思考开头的段：这条思考就是摘要行「已使用 N 个工具」，思考内容不显示 ── */
${C} > ${TOGGLE} {
  --cx-more-style: cx-used-en;

  &:has(${chain(COUNT + 1)}) { --cx-more-style: cx-used-en-plus; }
  :root:lang(zh) & { --cx-more-style: cx-used-zh; }
  :root:lang(zh) &:has(${chain(COUNT + 1)}) { --cx-more-style: cx-used-zh-plus; }

  /* 关着时整段折叠。Hermes 实时思考留下的预览（max-h-40 的思考体）一直开着，也按关着算，不让整段默认展开 */
  &:is(:has([aria-expanded=false]),:has(> [data-slot=aui_thinking-body][class~=max-h-40])) { ${fold} }

  & > [data-slot=aui_thinking-body] { display: none; }

  &:has(> [data-slot=aui_thinking-body][class~=max-h-40]) > .group\\/disclosure-row::after { transform: none; }

  & > .group\\/disclosure-row > button[aria-expanded] {
    column-gap: 0;

    & > :first-child { display: none; }

    &::after {
      counter-reset: cx-more calc(${sum});
      content: counter(cx-more, var(--cx-more-style, cx-used-en));
      ${say}
    }
  }

  & > .group\\/disclosure-row:hover > button[aria-expanded]::after { color: var(--ui-text-secondary); }
}

/* ── 不以思考开头的段：第一个工具行当摘要行 ── */
${C} > ${HEAD} {
  --cx-more-style: cx-more-en;

  &:has(${chain(COUNT + 1)}) { --cx-more-style: cx-more-en-plus; }
  :root:lang(zh) & { --cx-more-style: cx-more-zh; }
  :root:lang(zh) &:has(${chain(COUNT + 1)}) { --cx-more-style: cx-more-zh-plus; }

  /* 段首有开关并且关着才折叠。没有开关的行（没有可展开的内容）不折叠，免得收起后再也打不开 */
  &:has([aria-expanded=false]):not(:has([aria-expanded=true])) { ${fold} }

  /* 段首自己那一行：单独成行的工具行、单调用组里的那一行、多调用组的摘要行 */
  &[data-tool-row] > :first-child,
  & > :first-child > [data-tool-row] > :first-child,
  & > [data-tool-summary] {
    /* 按钮里原来的箭头已被隐藏，去掉间距，计数紧跟标题；字号、颜色跟标题一致 */
    & > .group\\/disclosure-row > button[aria-expanded] { column-gap: 0; }

    & > .group\\/disclosure-row > button[aria-expanded]::after {
      counter-reset: cx-more calc(${sum});
      content: counter(cx-more, var(--cx-more-style, cx-more-en));
      ${say}
    }

    & > .group\\/disclosure-row:hover > button[aria-expanded]::after { color: var(--ui-text-secondary); }
  }

  /* ── 展开后的细环卡片（codex-ui .tool-group-card）：段首这一行留在卡片外，它的输出是第一格 ── */
  &${NEXT} {
    &[data-tool-row][data-tool-open],
    & > :first-child > [data-tool-row][data-tool-open] {
      border-width: 0;
      border-radius: 0;
      background: transparent !important;

      & > :first-child {
        border-bottom-width: 0;
        padding: 0;
      }

      /* 摘要行上不放「关掉这一行」：关掉段首会把整段带走 */
      & > :first-child > .group\\/disclosure-row > span[class~=ml-auto] { display: none; }
    }

    &[data-tool-row][data-tool-open] > :last-child,
    & > :first-child > [data-tool-row][data-tool-open] > :last-child,
    & > [data-tool-summary] + * {
      margin-top: 6px;
      padding: 8px 12px;
      border: 1px solid var(--cx-line);
      border-bottom-width: 0;
      border-radius: var(--cx-radius-card) var(--cx-radius-card) 0 0;

      & [data-tool-row][data-tool-open] { ${flatten} }
    }
  }
}

/* 后面每个工具块各占一格：细线分隔，盖掉 Hermes 的相邻间距。以思考开头的段，第一个工具块就是第一格 */
${C} > :is(${MEMBER},${TOGGLE} + ${TV}) {
  margin-block: var(--cx-cell-gap, 0px) 0;
  padding: var(--cx-cell-pad, 6px 12px);
  border: 1px solid var(--cx-cell-line, var(--cx-line));
  border-bottom-width: 0;
  border-radius: 0;
  background: transparent !important;

  &:is(${TOGGLE} + *) {
    margin-top: 6px;
    border-radius: var(--cx-radius-card) var(--cx-radius-card) 0 0;
  }

  &:not(${NEXT}) {
    border-bottom-width: 1px;
    border-radius: 0 0 var(--cx-radius-card) var(--cx-radius-card);
  }

  &[data-tool-row][data-tool-open] {
    & > :first-child {
      border-bottom-width: 0;
      padding: 0;
    }
  }

  & [data-tool-row][data-tool-open] { ${flatten} }
}
`
