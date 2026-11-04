import assert from 'node:assert/strict'
import { test } from 'node:test'

import { toQuota } from '../src/quota/data.ts'

test('取当前 provider 的额度窗口，并把 ISO 重置时间换成毫秒', () => {
  const q = toQuota({
    provider: 'openai-codex',
    providers: [
      { slug: 'nous', name: 'Nous', usage: { windows: [{ label: 'X', used_percent: 99 }] } },
      {
        slug: 'openai-codex',
        name: 'OpenAI Codex',
        usage: {
          windows: [
            { label: 'Session', used_percent: 62.4, resets_at: '2026-11-04T23:00:00Z' },
            { label: 'Weekly', used_percent: 23, resets_at: null }
          ]
        }
      }
    ]
  })

  assert.equal(q.title, 'OpenAI Codex')
  assert.deepEqual(
    q.rows.map(r => [r.name, r.percent]),
    [
      ['Session', 62.4],
      ['Weekly', 23]
    ]
  )
  assert.equal(q.rows[0].resetsAt, Date.parse('2026-11-04T23:00:00Z'))
  assert.equal(q.rows[1].resetsAt, null)
  assert.equal(q.limited, false)
})

test('没有顶层窗口时取可用账号的窗口；百分比夹在 0–100', () => {
  const q = toQuota({
    providers: [
      {
        slug: 'anthropic',
        name: 'Anthropic',
        is_current: true,
        limit: { scope: 'account' },
        usage: {
          accounts: [
            { id: 'a', state: 'unavailable', windows: [{ label: 'Bad', used_percent: 10 }] },
            { id: 'b', state: 'ready', windows: [{ label: '5h', used_percent: 140 }] }
          ]
        }
      }
    ]
  })

  assert.deepEqual(q.rows, [{ name: '5h', percent: 100, resetsAt: null }])
  assert.equal(q.limited, true)
})

test('Nous 套餐用 left_fraction 换算已用比例，秒级时间戳换成毫秒', () => {
  const q = toQuota({
    provider: 'nous',
    providers: [{ slug: 'nous', name: 'Nous', plan_usage: { gauges: [{ label: 'Today', left_fraction: 0.25, resets_at_ms: 1793808628 }] } }]
  })

  assert.deepEqual(q.rows, [{ name: 'Today', percent: 75, resetsAt: 1793808628000 }])
})

test('找不到当前 provider 或没有任何窗口时返回 null', () => {
  assert.equal(toQuota(null), null)
  assert.equal(toQuota({ provider: 'x', providers: [{ slug: 'y', name: 'Y' }] }), null)
  assert.equal(toQuota({ provider: 'y', providers: [{ slug: 'y', name: 'Y', usage: { windows: [] } }] }), null)
})
