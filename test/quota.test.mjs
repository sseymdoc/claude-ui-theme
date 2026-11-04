import assert from 'node:assert/strict'
import test from 'node:test'

import { level, pickTop, resetText } from '../src/quota/model.ts'

test('level：75 起警告，90 起危险', () => {
  assert.equal(level(0), 'normal')
  assert.equal(level(74.9), 'normal')
  assert.equal(level(75), 'warning')
  assert.equal(level(89.9), 'warning')
  assert.equal(level(90), 'critical')
  assert.equal(level(100), 'critical')
  assert.equal(level(null), 'normal')
})

test('pickTop：取占用最高的一行，并列取靠前的，跳过没有百分比的行', () => {
  const rows = [
    { name: '会话', percent: 40, resetText: null },
    { name: '空', percent: null, resetText: null },
    { name: '每周', percent: 80, resetText: 'x', extra: 1 },
    { name: '每月', percent: 80, resetText: null }
  ]
  assert.equal(pickTop(rows), rows[2])
  assert.equal(pickTop([{ name: '零', percent: 0, resetText: null }])?.name, '零')
  assert.equal(pickTop([{ name: '空', percent: null, resetText: null }]), null)
  assert.equal(pickTop([]), null)
})

// 用本地时间构造，星期与日期的断言不受时区影响。2026-11-04 是周三，取正午避开夏令时切换。
const now = new Date(2026, 10, 4, 12, 0).getTime()
const min = 60000

test('resetText：没有重置时间', () => {
  assert.equal(resetText(null, now, 'en'), null)
  assert.equal(resetText(0, now, 'zh'), null)
})

test('resetText：分钟', () => {
  assert.equal(resetText(now + 5 * min, now, 'en'), 'resets in 5m')
  assert.equal(resetText(now + 5 * min, now, 'zh'), '5 分钟后重置')
  assert.equal(resetText(now + 59 * min, now, 'en'), 'resets in 59m')
  assert.equal(resetText(now - 3 * min, now, 'zh'), '0 分钟后重置')
})

test('resetText：小时，分钟为 0 时省略', () => {
  assert.equal(resetText(now + 60 * min, now, 'en'), 'resets in 1h')
  assert.equal(resetText(now + 120 * min, now, 'en'), 'resets in 2h')
  assert.equal(resetText(now + 120 * min, now, 'zh'), '2 小时后重置')
  assert.equal(resetText(now + 150 * min, now, 'en'), 'resets in 2h 30m')
  assert.equal(resetText(now + 150 * min, now, 'zh'), '2 小时 30 分钟后重置')
  assert.equal(resetText(now + 1439 * min, now, 'zh'), '23 小时 59 分钟后重置')
})

test('resetText：一天到七天内说星期几', () => {
  assert.equal(resetText(now + 1440 * min, now, 'en'), 'resets Thu')
  assert.equal(resetText(now + 1440 * min, now, 'zh'), '周四重置')
  const sat = new Date(2026, 10, 7, 9, 0).getTime()
  assert.equal(resetText(sat, now, 'en'), 'resets Sat')
  assert.equal(resetText(sat, now, 'zh'), '周六重置')
  assert.equal(resetText(now + 10079 * min, now, 'zh'), '周三重置')
})

test('resetText：七天及以上说月日', () => {
  assert.equal(resetText(now + 10080 * min, now, 'en'), 'resets Nov 11')
  assert.equal(resetText(now + 10080 * min, now, 'zh'), '11月11日重置')
  const later = new Date(2026, 11, 2, 9, 0).getTime()
  assert.equal(resetText(later, now, 'en'), 'resets Dec 2')
  assert.equal(resetText(later, now, 'zh'), '12月2日重置')
})
