import assert from 'node:assert/strict'
import test from 'node:test'

import {
  contextReading,
  findRoute,
  isActiveOwner,
  lingering,
  processState,
  ROUTING_UNAVAILABLE,
  routeResolver,
  segments,
  subagentRunning
} from '../src/rail/logic.ts'

test('上下文：有窗口的 breakdown 优先，否则用流式 usage', () => {
  const usage = { context_used: 50, context_max: 100, context_percent: 50 }

  assert.deepEqual(contextReading(usage, { context_used: 30, context_max: 200, context_percent: 15, context_estimated: true }), {
    used: 30,
    max: 200,
    percent: 15,
    estimated: true
  })
  assert.deepEqual(contextReading(usage, { context_max: 0 }), { used: 50, max: 100, percent: 50, estimated: false })
  assert.deepEqual(contextReading(usage, null), { used: 50, max: 100, percent: 50, estimated: false })
})

test('上下文：用后端的 context_percent，夹到 0–100 并取整；没有窗口时为 null', () => {
  assert.equal(contextReading({ context_max: 10, context_used: 9, context_percent: 140 }, null).percent, 100)
  assert.equal(contextReading({ context_max: 10, context_percent: -3 }, null).percent, 0)
  assert.equal(contextReading({ context_max: 10, context_percent: 37.5 }, null).percent, 38)
  assert.equal(contextReading({ context_max: 0, context_used: 5 }, null), null)
  assert.equal(contextReading(null, undefined), null)
})

test('分段：按 tokens 占总和铺满整条，总和为 0 时退回已用量', () => {
  const widths = parts => parts.map(part => part.width)

  assert.deepEqual(widths(segments([{ tokens: 30 }, { tokens: 10 }, { tokens: 0 }], 999)), [75, 25, 0])
  assert.deepEqual(widths(segments([{ tokens: 0 }], 0)), [0])
})

test('进程：不是 exited 就算运行中，退出码非 0 算失败', () => {
  assert.equal(processState({ status: 'running' }), 'running')
  assert.equal(processState({}), 'running')
  assert.equal(processState({ status: 'exited', exit_code: 0 }), 'done')
  assert.equal(processState({ status: 'exited' }), 'done')
  assert.equal(processState({ status: 'exited', exit_code: 2 }), 'failed')
})

test('子代理：终态以外都算运行中，包括缺省值', () => {
  for (const status of ['running', 'queued', undefined]) {
    assert.equal(subagentRunning(status), true)
  }

  for (const status of ['completed', 'failed', 'interrupted', 'timeout', 'error', 'cancelled', 'canceled']) {
    assert.equal(subagentRunning(status), false)
  }
})

test('结束的行：成功留 4 秒、失败留 12 秒，从第一次看到结束算起', () => {
  const seen = new Map()
  const rows = [
    { id: 'a', state: 'running' },
    { id: 'b', state: 'done' },
    { id: 'c', state: 'failed' }
  ]
  const ids = result => result.shown.map(row => row.id)

  let result = lingering(rows, seen, 1000)
  assert.deepEqual(ids(result), ['a', 'b', 'c'])
  assert.equal(result.next, 5000)

  result = lingering(rows, seen, 5000)
  assert.deepEqual(ids(result), ['a', 'c'])
  assert.equal(result.next, 13000)

  result = lingering(rows, seen, 13000)
  assert.deepEqual(ids(result), ['a'])
  assert.equal(result.next, null)
})

test('结束的行重新跑起来会重新计时；不再上报的 id 被清掉', () => {
  const seen = new Map()

  lingering([{ id: 'b', state: 'done' }], seen, 0)
  lingering([{ id: 'b', state: 'running' }], seen, 1000)
  assert.equal(seen.has('b'), false)
  assert.equal(lingering([{ id: 'b', state: 'done' }], seen, 9000).next, 13000)

  lingering([], seen, 9500)
  assert.equal(seen.size, 0)
})

test('路由：归属为空或等于活动网关时走 host.request', () => {
  assert.equal(isActiveOwner(null, {}), true)
  assert.equal(isActiveOwner({ connectionId: 'local', profile: 'default' }, { connectionId: 'local', profile: ' ' }), true)
  assert.equal(isActiveOwner({ connectionId: '', profile: 'default' }, { connectionId: null, profile: 'default' }), true)
  assert.equal(isActiveOwner({ connectionId: 'local', profile: 'work' }, { connectionId: 'local', profile: 'default' }), false)
  assert.equal(isActiveOwner({ connectionId: 'box', profile: 'default' }, { connectionId: 'local', profile: 'default' }), false)
})

test('路由：按 connectionId 和规范化后的桌面端 profile 找，不看 targetProfile', () => {
  const routes = [
    { connectionId: 'local', profile: '', targetProfile: 'default' },
    { connectionId: 'box', profile: 'default', targetProfile: 'ops' }
  ]

  assert.equal(findRoute({ connectionId: 'local', profile: 'default' }, routes), routes[0])
  assert.equal(findRoute({ connectionId: 'box', profile: 'default' }, routes), routes[1])
  assert.equal(findRoute({ connectionId: 'box', profile: 'ops' }, routes), null)
})

test('路由缓存：查询瞬时失败时不退回活动网关，也不缓存，下次重新查', async () => {
  const route = { connectionId: 'box', profile: 'work', targetProfile: 'work' }
  const owner = { connectionId: 'box', profile: 'work' }
  let calls = 0

  const resolve = routeResolver(async () => {
    calls += 1

    if (calls === 1) {
      throw new Error('IPC timeout')
    }

    return [route]
  })

  await assert.rejects(resolve(owner), /IPC timeout/)
  assert.equal(await resolve(owner), route)
  assert.equal(await resolve(owner), route)
  assert.equal(calls, 2)
})

test('路由缓存：宿主没有路由接口时退回活动网关并缓存；查不到的不缓存', async () => {
  const owner = { connectionId: 'box', profile: 'work' }
  let unsupportedCalls = 0
  let missingCalls = 0

  const unsupported = routeResolver(async () => {
    unsupportedCalls += 1
    throw new Error(ROUTING_UNAVAILABLE)
  })

  assert.equal(await unsupported(owner), 'active')
  assert.equal(await unsupported(owner), 'active')
  assert.equal(unsupportedCalls, 1)

  const missing = routeResolver(async () => {
    missingCalls += 1

    return []
  })

  assert.equal(await missing(owner), null)
  assert.equal(await missing(owner), null)
  assert.equal(missingCalls, 2)
})
