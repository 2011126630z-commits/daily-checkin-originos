/**
 * 存储层逻辑测试（不依赖浏览器）
 * 用 esbuild 把 src/storage/storage.js 打成 node 可执行 bundle，再注入 localStorage 桩。
 * 运行：node scripts/test-storage.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.dsh-test');
const outFile = path.join(outDir, 'storage.bundle.mjs');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'src', 'storage', 'storage.js')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'silent',
});

// ---- localStorage 桩 ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const S = await import(`file://${outFile.replace(/\\/g, '/')}`);

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${err.message}`);
    process.exitCode = 1;
  }
};

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const setCheckin = (obj) => localStorage.setItem('checkinData', JSON.stringify(obj));

const today = new Date();
const todayKey = dateStr(today);
const dayMs = 86400000;
const shift = (base, days) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);

console.log('\n[1] 日期与单日数据清洗');
check('isValidDateString 拒绝 2026-02-31 / 2026-13-01', () => {
  assert.equal(S.isValidDateString('2026-02-31'), false);
  assert.equal(S.isValidDateString('2026-13-01'), false);
  assert.equal(S.isValidDateString('2026-2-1'), false);
  assert.equal(S.isValidDateString('2026-02-28'), true);
});

check('sanitizeDayData 补齐为 7 个布尔值', () => {
  assert.deepEqual(S.sanitizeDayData([true, 1]), [true, true, false, false, false, false, false]);
  assert.deepEqual(S.sanitizeDayData('broken'), Array(7).fill(false));
  assert.deepEqual(S.sanitizeDayData([true, false, true, true, false, true, false, true]).length, 7);
});

check('getCheckinForDate 遇到脏存储不抛错', () => {
  setCheckin({ [todayKey]: { not: 'array' } });
  assert.deepEqual(S.getCheckinForDate(todayKey), Array(7).fill(false));
  setCheckin({ [todayKey]: [true, true] });
  assert.deepEqual(S.getCheckinForDate(todayKey), [true, true, false, false, false, false, false]);
  setCheckin({});
  assert.deepEqual(S.getCheckinForDate(todayKey), Array(7).fill(false));
});

console.log('\n[2] 连续天数');
check('getLongestStreak 取历史最佳，缺口会重置', () => {
  // 连续 3 天 + 连续 2 天
  setCheckin({
    '2026-03-01': [true, false, false, false, false, false, false],
    '2026-03-02': [true, false, false, false, false, false, false],
    '2026-03-03': [false, true, false, false, false, false, false],
    '2026-03-10': [true, false, false, false, false, false, false],
    '2026-03-11': [true, false, false, false, false, false, false],
  });
  assert.equal(S.getLongestStreak(), 3);
});

check('getLongestStreak 跨月连续不中断', () => {
  setCheckin({
    '2026-01-30': [true, false, false, false, false, false, false],
    '2026-01-31': [true, false, false, false, false, false, false],
    '2026-02-01': [true, false, false, false, false, false, false],
  });
  assert.equal(S.getLongestStreak(), 3);
});

check('全取消的日期不计入连续（与统计口径一致）', () => {
  setCheckin({
    '2026-03-01': Array(7).fill(true),
    '2026-03-02': Array(7).fill(false),
    '2026-03-03': Array(7).fill(true),
  });
  assert.equal(S.getLongestStreak(), 1);
});

check('getCurrentStreak 今天未打卡时保留到昨天的连续', () => {
  const yesterday = dateStr(shift(today, -1));
  const before = dateStr(shift(today, -2));
  setCheckin({
    [before]: [true, false, false, false, false, false, false],
    [yesterday]: [true, false, false, false, false, false, false],
  });
  assert.equal(S.getCurrentStreak(), 2);
});

console.log('\n[3] 本月日历');
check('getMonthCalendar 周一为起点、天数正确（2026-10）', () => {
  setCheckin({});
  const cal = S.getMonthCalendar(new Date(2026, 9, 1));
  assert.equal(cal.days.length, 31);
  // 2026-10-01 是周四 → 周一为 0 的偏移是 3
  assert.equal(cal.startOffset, 3);
  assert.equal(cal.monthLabel, '2026年10月');
});

check('getMonthCalendar 累加已完成任务数', () => {
  setCheckin({
    '2026-10-01': [true, true, false, false, false, false, false],
    '2026-10-02': [true, false, false, false, false, false, false],
  });
  const cal = S.getMonthCalendar(new Date(2026, 9, 1));
  assert.equal(cal.completedTasks, 3);
  assert.equal(cal.days.find((d) => d.day === 1).completed, 2);
  assert.equal(cal.days.find((d) => d.day === 2).percentage, 14);
});

console.log('\n[4] 周同比（按已过去天数对齐）');
check('getWeeklyComparison 只比较同一进度窗口', () => {
  setCheckin({});
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisMonday = shift(now, mondayOffset);
  const dayCount = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - thisMonday) / dayMs) + 1;

  const data = {};
  let expected = 0;
  for (let i = 0; i < dayCount; i += 1) {
    const day = shift(thisMonday, i);
    const filled = Array(7).fill(false);
    for (let k = 0; k <= i; k += 1) filled[k] = true; // 第 i 天完成 i+1 项
    data[dateStr(day)] = filled;
    expected += Math.min(i + 1, 7);
  }
  // 上周放一条记录，用于验证「有历史可对比」的判定
  data[dateStr(shift(thisMonday, -7))] = [true, false, false, false, false, false, false];
  setCheckin(data);

  const cmp = S.getWeeklyComparison();
  assert.equal(cmp.dayCount, dayCount);
  assert.equal(cmp.thisCompleted, expected);
  assert.equal(cmp.lastCompleted, 1);
  assert.equal(cmp.hasLastWeekData, true);
  assert.equal(cmp.thisRate, Math.round((expected / (dayCount * 7)) * 100));
});

check('getWeeklyComparison 上周无记录时 hasLastWeekData=false', () => {
  setCheckin({ [todayKey]: [true, false, false, false, false, false, false] });
  const cmp = S.getWeeklyComparison();
  assert.equal(cmp.hasLastWeekData, false);
});

console.log('\n[5] 备份 / 恢复加固');
check('exportBackup → importBackup 往返一致', () => {
  setCheckin({ '2026-05-01': [true, true, true, false, false, false, true] });
  localStorage.setItem('profile', JSON.stringify({ nickname: '小明', goal: '坚持', morningReminder: true, eveningReminder: false }));
  localStorage.setItem('weightRecords', JSON.stringify([{ id: 'w1', timestamp: '2026-05-01T08:00:00.000Z', weightKg: 70.5, source: 'manual' }]));
  localStorage.setItem('weightUnit', 'kg');

  const backup = S.exportBackup();
  localStorage.clear();
  const res = S.importBackup(backup);
  assert.equal(res.ok, true);
  assert.equal(res.keys.length, 4);
  assert.equal(res.dropped, 0);
  assert.deepEqual(S.getCheckinForDate('2026-05-01'), [true, true, true, false, false, false, true]);
  assert.equal(JSON.parse(localStorage.getItem('profile')).nickname, '小明');
  assert.equal(JSON.parse(localStorage.getItem('weightRecords')).length, 1);
});

check('importBackup 丢弃脏数据并统计 dropped', () => {
  localStorage.clear();
  const dirty = JSON.stringify({
    app: 'daily-checkin-originos',
    version: 2,
    data: {
      checkinData: {
        '2026-05-01': [true, true],          // 会被补齐保留
        '2026-02-31': [true],                 // 非法日期 → 丢弃
        '2026-05-02': 'oops',                 // 非数组 → 丢弃
      },
      profile: { nickname: 12345, goal: 'x'.repeat(300), morningReminder: 'yes' }, // 类型错误 → 回落
      weightRecords: [
        { timestamp: '2026-05-01T08:00:00Z', weightKg: 70 },   // 有效
        { timestamp: 'bad-date', weightKg: 70 },                // 时间非法 → 丢弃
        { timestamp: '2026-05-01T08:00:00Z', weightKg: 99999 }, // 超范围 → 丢弃
      ],
      weightUnit: 'stone', // 非法单位 → 丢弃整个键
    },
  });

  const res = S.importBackup(dirty);
  assert.equal(res.ok, true);
  assert.equal(res.keys.includes('weightUnit'), false);
  assert.equal(JSON.parse(localStorage.getItem('weightRecords')).length, 1);
  // 2 条体重 + 2 条非法打卡日 + 3 处 profile 类型错误
  assert.equal(res.dropped, 7);
  assert.equal(JSON.parse(localStorage.getItem('profile')).nickname, '');
  assert.equal(JSON.parse(localStorage.getItem('profile')).goal.length, 200);
  assert.equal(JSON.parse(localStorage.getItem('profile')).morningReminder, false);
});

check('importBackup 拒绝非法结构', () => {
  assert.equal(S.importBackup('not json').ok, false);
  assert.equal(S.importBackup('{"foo":1}').ok, false);
  assert.equal(S.importBackup('{"data":{}}').ok, false);
});

console.log('\n[6] 统计口径未回归');
check('getStatistics 只统计至少完成 1 项的日期', () => {
  setCheckin({
    '2026-04-01': [true, true, false, false, false, false, false],
    '2026-04-02': Array(7).fill(false),
    '2026-04-03': Array(7).fill(true),
  });
  const stats = S.getStatistics();
  assert.equal(stats.totalDays, 2);
  assert.equal(stats.completedTasks, 9);
  assert.equal(stats.avgPerDay, 5);
});

console.log('\n[7] 补打卡');
check('isBackfillable 只允许今天及过去的真实日期', () => {
  const today = dateStr(new Date());
  assert.equal(S.isBackfillable(today), true, '今天应可补');
  assert.equal(S.isBackfillable(dateStr(shift(new Date(), -1))), true, '昨天应可补');
  assert.equal(S.isBackfillable(dateStr(shift(new Date(), 1))), false, '明天不可补');
  assert.equal(S.isBackfillable(dateStr(shift(new Date(), 365))), false, '未来不可补');
  assert.equal(S.isBackfillable('2026-02-31'), false, '非法日期不可补');
  assert.equal(S.isBackfillable('not-a-date'), false);
  assert.equal(S.isBackfillable(''), false);
});

check('补打卡写入后连续天数与统计同步更新', () => {
  const d1 = dateStr(shift(new Date(), -2));
  const d2 = dateStr(shift(new Date(), -1));
  setCheckin({});
  assert.equal(S.getCurrentStreak(), 0);

  // 模拟补打卡：直接把过去两天补上
  S.toggleCheckin(d1, 0);
  S.toggleCheckin(d2, 0);
  assert.equal(S.getCurrentStreak(), 2, '补上昨天与前天后应连成 2 天');
  assert.equal(S.getLongestStreak(), 2);
  assert.equal(S.getStatistics().totalDays, 2);
  // 日历里也应出现
  const cal = S.getMonthCalendar();
  if (d1.slice(0, 7) === dateStr(new Date()).slice(0, 7)) {
    assert.equal(cal.days.find((d) => d.date === d1).completed, 1);
  }
});

check('补打卡可以逐项取消，取消到 0 项后不计入连续', () => {
  const d = dateStr(shift(new Date(), -1));
  setCheckin({});
  S.toggleCheckin(d, 3);
  assert.equal(S.getCurrentStreak(), 1);
  S.toggleCheckin(d, 3); // 再点一次取消
  assert.equal(S.getCurrentStreak(), 0);
  assert.equal(S.getStatistics().totalDays, 0);
});

check('getRecentRecords(count) 返回指定天数且今天在最前', () => {
  setCheckin({});
  const today = dateStr(new Date());
  const r14 = S.getRecentRecords(14);
  assert.equal(r14.length, 14);
  assert.equal(r14[0].date, today);
  assert.equal(r14[0].isToday, true);
  assert.equal(r14[13].date, dateStr(shift(new Date(), -13)));
  assert.ok(r14[0].weekday.startsWith('周'));
  assert.equal(S.getRecentRecords().length, S.TASK_COUNT, '默认仍是 7 天');
});

console.log(`\n${process.exitCode ? '有失败用例' : `全部通过：${passed} 项`}`);
