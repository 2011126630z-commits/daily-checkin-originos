// Storage module for localStorage management
import { sanitizeWeightRecords, sanitizeWeightUnit } from './weight';

const STORAGE_KEY_CHECKIN = 'checkinData';
const STORAGE_KEY_PROFILE = 'profile';

// Default checkin data structure
const DEFAULT_CHECKIN_DATA = {
  // Format: "YYYY-MM-DD": [true, false, true, true, false, true, false]
  // Index 0-6 corresponds to the 7 tasks
};

// Default profile data
const DEFAULT_PROFILE = {
  nickname: '',
  goal: '',
  morningReminder: false,
  eveningReminder: false
};

export const TASK_COUNT = 7;

// 统一的本地日期格式化(YYYY-MM-DD)
// 不使用 toISOString():它按 UTC 截日期,东八区凌晨会得到"昨天"
export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get all checkin data
export function getCheckinData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CHECKIN);
    return data ? JSON.parse(data) : { ...DEFAULT_CHECKIN_DATA };
  } catch (error) {
    console.error('Error reading checkin data:', error);
    return { ...DEFAULT_CHECKIN_DATA };
  }
}

// Save all checkin data
export function saveCheckinData(data) {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKIN, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving checkin data:', error);
  }
}

// 日期字符串必须是真实存在的 YYYY-MM-DD（防御 2026-02-31 这类脏数据）
export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// 把任意来源的某天数据规范成固定长度的布尔数组（旧版本/手工改坏的存储也能安全读取）
export function sanitizeDayData(dayData) {
  const out = Array(TASK_COUNT).fill(false);
  if (!Array.isArray(dayData)) return out;
  for (let i = 0; i < TASK_COUNT; i += 1) out[i] = Boolean(dayData[i]);
  return out;
}

// Get checkin data for a specific date (always TASK_COUNT booleans)
export function getCheckinForDate(dateStr) {
  const data = getCheckinData();
  return sanitizeDayData(data[dateStr]);
}

// Save checkin data for a specific date
export function saveCheckinForDate(dateStr, data) {
  const allData = getCheckinData();
  allData[dateStr] = data;
  saveCheckinData(allData);
}

// Toggle checkin status for a specific task
export function toggleCheckin(dateStr, taskIndex) {
  const data = getCheckinForDate(dateStr);
  data[taskIndex] = !data[taskIndex];
  saveCheckinForDate(dateStr, data);
  return data[taskIndex];
}

// Get profile data
export function getProfile() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PROFILE);
    return data ? JSON.parse(data) : { ...DEFAULT_PROFILE };
  } catch (error) {
    console.error('Error reading profile:', error);
    return { ...DEFAULT_PROFILE };
  }
}

// Save profile data
export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving profile:', error);
  }
}

// Get today's date string (YYYY-MM-DD, 本地时间)
export function getTodayString() {
  return formatLocalDate(new Date());
}

// 统计单日完成数（容错：非数组一律按 0 处理）
function countCompleted(dayData) {
  return Array.isArray(dayData) ? dayData.filter(Boolean).length : 0;
}

// 有效打卡日:当天至少完成 1 项才算已打卡(全部取消后不再计入)
export function isActiveDay(dayData) {
  return countCompleted(dayData) > 0;
}

// Get statistics (累计口径:只统计至少完成 1 项的日期;全取消的日期不计入)
export function getStatistics() {
  const data = getCheckinData();
  const activeDates = Object.keys(data).filter((date) => isActiveDay(data[date]));
  const totalDays = activeDates.length;
  const totalTasks = totalDays * TASK_COUNT;
  const completedTasks = activeDates.reduce((sum, date) => {
    return sum + countCompleted(data[date]);
  }, 0);

  return {
    totalDays,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    avgPerDay: totalDays > 0 ? Math.round(completedTasks / totalDays) : 0
  };
}

// 连续打卡天数:每天至少完成 1 项计为连续一天
// 今天尚未打卡时,保留截至昨天的连续记录(不因今天未打卡而清零)
export function getCurrentStreak() {
  const data = getCheckinData();
  const now = new Date();
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 今天未打卡 → 从昨天开始回溯
  if (!isActiveDay(data[formatLocalDate(cursor)])) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }

  let streak = 0;
  // 理论上限 3650 天,防御死循环
  for (let i = 0; i < 3650; i += 1) {
    if (isActiveDay(data[formatLocalDate(cursor)])) {
      streak += 1;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// 日期 +1 天（用本地日期构造，跨月/跨年/夏令时都安全）
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return formatLocalDate(new Date(y, m - 1, d + days));
}

// 最长连续打卡天数（历史最佳，口径与 getCurrentStreak 一致：每天至少 1 项）
export function getLongestStreak() {
  const data = getCheckinData();
  const dates = Object.keys(data).filter((date) => isActiveDay(data[date])).sort();

  let best = 0;
  let current = 0;
  let prev = null;

  for (const date of dates) {
    if (prev !== null && addDays(prev, 1) === date) current += 1;
    else current = 1;
    if (current > best) best = current;
    prev = date;
  }

  return best;
}

// 本周统计:周一至周日 7 天,固定 7 列
// 已过去的日期按真实数据算(未打卡=0),未来日期标记 isFuture
export function getWeeklyStats() {
  const data = getCheckinData();
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // 计算本周周一(周日 getDay()===0 时回退 6 天)
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const weekData = [];

  for (let i = 0; i < TASK_COUNT; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset + i);
    const dateStr = formatLocalDate(d);
    const dayData = data[dateStr];
    const completed = countCompleted(dayData);
    const isToday = dateStr === todayStr;
    const isFuture = d.getTime() > todayMidnight;

    weekData.push({
      date: dateStr,
      label: labels[i],
      displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
      completed,
      total: TASK_COUNT,
      // 未来日期不算"未完成",仅标记;百分比照常展示
      percentage: Math.round((completed / TASK_COUNT) * 100),
      isToday,
      isFuture,
      hasRecord: Boolean(dayData)
    });
  }

  return weekData;
}

// 本月完成率:本月 1 号到今天,每一天都计入分母(未打卡日期算 0 完成)
export function getMonthlyCompletionRate() {
  const data = getCheckinData();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = now.getDate(); // 1..31,今天也计入

  let totalTasks = 0;
  let completedTasks = 0;

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = formatLocalDate(new Date(year, month, day));
    totalTasks += TASK_COUNT;
    completedTasks += countCompleted(data[dateStr]);
  }

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

// 本月已统计天数与平均(供展示)
export function getMonthSummary() {
  const data = getCheckinData();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = now.getDate();

  let completedTasks = 0;
  let trackedDays = 0;

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = formatLocalDate(new Date(year, month, day));
    const dayData = data[dateStr];
    if (dayData) trackedDays += 1;
    completedTasks += countCompleted(dayData);
  }

  const elapsedDays = lastDay;
  return {
    elapsedDays,
    trackedDays,
    completedTasks,
    avgPerDay: elapsedDays > 0 ? (completedTasks / elapsedDays).toFixed(1) : '0'
  };
}

// 本月日历热力图数据：按「周一为一周起点」给出月首偏移，返回整月每一天
// 只统计到本月最后一天；未来日期标记 isFuture（当月日历不显示未来天，防御用）
export function getMonthCalendar(reference = new Date()) {
  const data = getCheckinData();
  const now = new Date();
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const todayStr = formatLocalDate(now);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // 月首是周几（周一为 0）
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const d = new Date(year, month, day);
    const dateStr = formatLocalDate(d);
    const completed = countCompleted(data[dateStr]);
    const percentage = Math.round((completed / TASK_COUNT) * 100);

    days.push({
      date: dateStr,
      day,
      completed,
      total: TASK_COUNT,
      percentage,
      isToday: dateStr === todayStr,
      isFuture: d.getTime() > todayMidnight,
      hasRecord: Boolean(data[dateStr])
    });
  }

  // 本月「已过去的天数」用于月完成率口径说明
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const elapsedDays = isCurrentMonth ? now.getDate() : lastDay;

  return {
    year,
    month,
    monthLabel: `${year}年${month + 1}月`,
    startOffset,
    days,
    elapsedDays,
    trackedDays: days.filter((d) => d.hasRecord).length,
    completedTasks: days.reduce((sum, d) => sum + d.completed, 0)
  };
}

// 本周 vs 上周同期：按「已过去的天数」对齐比较，避免拿半周和整周对比
export function getWeeklyComparison() {
  const data = getCheckinData();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);

  const dayCount = Math.floor((todayMidnight.getTime() - thisMonday.getTime()) / 86400000) + 1;
  const total = dayCount * TASK_COUNT;

  let thisCompleted = 0;
  let lastCompleted = 0;
  for (let i = 0; i < dayCount; i += 1) {
    const a = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + i);
    const b = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + i);
    thisCompleted += countCompleted(data[formatLocalDate(a)]);
    lastCompleted += countCompleted(data[formatLocalDate(b)]);
  }

  const thisRate = total > 0 ? Math.round((thisCompleted / total) * 100) : 0;
  const lastRate = total > 0 ? Math.round((lastCompleted / total) * 100) : 0;

  // 上周同期窗口内是否有任何真实记录（没有则不做对比，避免「+100%」误导）
  const lastWindowStart = formatLocalDate(lastMonday);
  const lastWindowEnd = formatLocalDate(
    new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + dayCount - 1)
  );
  const hasLastWeekData = Object.keys(data).some(
    (date) => isActiveDay(data[date]) && date >= lastWindowStart && date <= lastWindowEnd
  );

  return {
    dayCount,
    thisCompleted,
    lastCompleted,
    thisRate,
    lastRate,
    delta: thisRate - lastRate,
    hasLastWeekData
  };
}

// 最近 N 天记录(含今天,本地日期,倒序即今天在前)
export function getRecentRecords(count = TASK_COUNT) {
  const data = getCheckinData();
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const records = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = formatLocalDate(d);
    const completed = countCompleted(data[dateStr]);

    records.push({
      date: dateStr,
      displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()],
      isToday: dateStr === todayStr,
      completed,
      total: TASK_COUNT
    });
  }

  return records;
}

// 补打卡：只允许「已存在的过去日期或今天」，未来日期一律拒绝
export function isBackfillable(dateStr, todayStr = getTodayString()) {
  return isValidDateString(dateStr) && dateStr <= todayStr;
}

// Reset all data (for testing)
export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY_CHECKIN);
  localStorage.removeItem(STORAGE_KEY_PROFILE);
}

// ---- 备份 / 恢复(不同来源的 localStorage 不互通,换网址时用此迁移) ----
const BACKUP_VERSION = 2;
const BACKUP_KEYS = ['checkinData', 'profile', 'weightRecords', 'weightUnit'];

// 导出全部数据为 JSON 字符串
export function exportBackup() {
  const payload = {
    app: 'daily-checkin-originos',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {}
  };
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw != null) {
      try { payload.data[key] = JSON.parse(raw); } catch { payload.data[key] = raw; }
    }
  }
  return JSON.stringify(payload, null, 2);
}

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// 逐字段清洗打卡数据：丢弃非法日期/非法结构，数组统一补齐为 7 个布尔值
function sanitizeCheckinData(value) {
  if (!isPlainObject(value)) return { value: null, dropped: 0 };
  const out = {};
  let dropped = 0;
  for (const [date, day] of Object.entries(value)) {
    if (!isValidDateString(date) || !Array.isArray(day)) {
      dropped += 1;
      continue;
    }
    out[date] = sanitizeDayData(day);
  }
  return { value: out, dropped };
}

// 逐字段清洗个人信息：非字符串/超长/类型不符一律回落到默认值
function sanitizeProfileData(value) {
  if (!isPlainObject(value)) return { value: null, dropped: 0 };
  let dropped = 0;
  const str = (v, max) => {
    if (typeof v !== 'string') { if (v != null) dropped += 1; return ''; }
    return v.slice(0, max);
  };
  const bool = (v, fallback) => (typeof v === 'boolean' ? v : (v == null ? fallback : (dropped += 1, fallback)));

  return {
    value: {
      nickname: str(value.nickname, 40).trim(),
      goal: str(value.goal, 200),
      morningReminder: bool(value.morningReminder, false),
      eveningReminder: bool(value.eveningReminder, false)
    },
    dropped
  };
}

// 从备份 JSON 恢复;返回 { ok, keys, dropped, error }
// 加固点:逐字段校验类型与取值范围,脏数据被丢弃而不是写坏 localStorage
export function importBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是有效的 JSON' };
  }
  if (!isPlainObject(parsed) || !isPlainObject(parsed.data)) {
    return { ok: false, error: '备份文件结构不正确' };
  }

  const keys = [];
  let dropped = 0;

  for (const key of BACKUP_KEYS) {
    if (!(key in parsed.data)) continue;
    const raw = parsed.data[key];

    if (key === 'weightUnit') {
      const unit = sanitizeWeightUnit(raw);
      if (!unit) { dropped += 1; continue; }
      localStorage.setItem(key, unit);
      keys.push(key);
      continue;
    }

    if (key === 'weightRecords') {
      const { records, dropped: d } = sanitizeWeightRecords(raw);
      if (!records) { dropped += 1; continue; }
      dropped += d;
      localStorage.setItem(key, JSON.stringify(records));
      keys.push(key);
      continue;
    }

    const sanitized = key === 'checkinData' ? sanitizeCheckinData(raw) : sanitizeProfileData(raw);
    if (!sanitized.value) { dropped += 1; continue; }
    dropped += sanitized.dropped;
    localStorage.setItem(key, JSON.stringify(sanitized.value));
    keys.push(key);
  }

  if (!keys.length) return { ok: false, error: '备份文件中没有可恢复的数据' };
  return { ok: true, keys, dropped };
}

