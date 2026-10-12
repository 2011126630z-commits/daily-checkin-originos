// Storage module for localStorage management
import { sanitizeWeightRecords, sanitizeWeightUnit } from './weight';

const STORAGE_KEY_CHECKIN = 'checkinData';
const STORAGE_KEY_PROFILE = 'profile';
const STORAGE_KEY_TASKS = 'tasks';

// 默认任务：icon 是字符串 key，具体图形由 components/icons.jsx 的 TASK_ICON_MAP 提供
// （storage 不依赖 React，才能在 node 里直接单测）
export const DEFAULT_TASKS = [
  { id: 'water', title: '喝水 2L', desc: '保持身体水分充足', icon: 'droplet' },
  { id: 'gym', title: '健身房训练', desc: '力量或有氧训练', icon: 'dumbbell' },
  { id: 'protein', title: '吃够蛋白质', desc: '每公斤体重 1.6g 以上', icon: 'egg' },
  { id: 'veggie', title: '吃蔬菜', desc: '至少一份绿叶蔬菜', icon: 'leaf' },
  { id: 'words', title: '背单词 30 个', desc: '坚持每日积累', icon: 'book' },
  { id: 'math', title: '复习数学 1 小时', desc: '保持数学思维敏捷', icon: 'calculator' },
  { id: 'sleep', title: '早睡 23:00 前', desc: '保证充足睡眠', icon: 'moon' },
];

export const DEFAULT_TASK_COUNT = DEFAULT_TASKS.length;
export const TASK_COUNT = DEFAULT_TASK_COUNT; // 兼容旧引用（默认任务数）
export const MAX_TASKS = 12;

const DEFAULT_PROFILE = {
  nickname: '',
  goal: '',
  morningReminder: false,
  eveningReminder: false
};

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// 统一的本地日期格式化(YYYY-MM-DD)
// 不使用 toISOString():它按 UTC 截日期,东八区凌晨会得到"昨天"
export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日期字符串必须是真实存在的 YYYY-MM-DD（防御 2026-02-31 这类脏数据）
export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// ---- 任务定义（用户可自定义） ----

function normalizeTask(raw, index) {
  if (!isPlainObject(raw)) return null;
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 20) : '';
  if (!title) return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `t_${index}_${title}`;
  return {
    id,
    title,
    desc: typeof raw.desc === 'string' ? raw.desc.trim().slice(0, 40) : '',
    icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : 'check'
  };
}

// 规范任务列表：过滤非法项、去重 id、限制数量
export function sanitizeTasks(value) {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  const out = [];
  value.forEach((raw, i) => {
    const t = normalizeTask(raw, i);
    if (!t) return;
    let id = t.id;
    let n = 1;
    while (seen.has(id)) id = `${t.id}_${n++}`;
    seen.add(id);
    out.push({ ...t, id });
  });
  return out.slice(0, MAX_TASKS);
}

export function getTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) return DEFAULT_TASKS.map((t) => ({ ...t }));
    const parsed = sanitizeTasks(JSON.parse(raw));
    return parsed && parsed.length ? parsed : DEFAULT_TASKS.map((t) => ({ ...t }));
  } catch {
    return DEFAULT_TASKS.map((t) => ({ ...t }));
  }
}

export function saveTasks(tasks) {
  const clean = sanitizeTasks(tasks);
  if (!clean || !clean.length) return { ok: false, error: '至少保留一个任务' };
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(clean));
    return { ok: true, tasks: clean };
  } catch (error) {
    console.error('Error saving tasks:', error);
    return { ok: false, error: '保存失败' };
  }
}

export function resetTasks() {
  localStorage.removeItem(STORAGE_KEY_TASKS);
  return getTasks();
}

export function getTaskCount() {
  return getTasks().length;
}

// ---- 打卡数据 ----
// 每天存成 { 任务id: true }，与任务列表顺序解耦：
// 用户增删/排序任务后，历史记录仍然对应到正确的任务。

// 旧数据是 [true,false,...] 数组（按下标对应默认任务），读取时迁移成 id 映射
function migrateDay(value, legacyIds) {
  const out = {};
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      if (v && legacyIds[i]) out[legacyIds[i]] = true;
    });
    return out;
  }
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (v === true) out[k] = true;
    }
  }
  return out;
}

export function getCheckinData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKIN);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};
    const legacyIds = DEFAULT_TASKS.map((t) => t.id);
    const out = {};
    for (const [date, day] of Object.entries(parsed)) {
      if (!isValidDateString(date)) continue;
      out[date] = migrateDay(day, legacyIds);
    }
    return out;
  } catch (error) {
    console.error('Error reading checkin data:', error);
    return {};
  }
}

export function saveCheckinData(data) {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKIN, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving checkin data:', error);
  }
}

// 返回某天的 { 任务id: true } 映射（缺失的任务视为未完成）
export function getCheckinForDate(dateStr) {
  const data = getCheckinData();
  return data[dateStr] || {};
}

// 切换某个任务在指定日期的完成状态，返回新状态
export function toggleCheckin(dateStr, taskId) {
  const all = getCheckinData();
  const day = { ...(all[dateStr] || {}) };
  const next = !day[taskId];
  if (next) day[taskId] = true;
  else delete day[taskId];
  if (Object.keys(day).length) all[dateStr] = day;
  else delete all[dateStr];
  saveCheckinData(all);
  return next;
}

// 迁移或手动清理后，把已删除任务的历史打卡一并清掉（可选调用）
export function pruneCheckinData(taskIds) {
  const valid = new Set(taskIds);
  const all = getCheckinData();
  let changed = false;
  const out = {};
  for (const [date, day] of Object.entries(all)) {
    const kept = {};
    for (const [id, v] of Object.entries(day)) {
      if (valid.has(id)) kept[id] = true;
    }
    if (Object.keys(kept).length !== Object.keys(day).length) changed = true;
    if (Object.keys(kept).length) out[date] = kept;
  }
  if (changed) saveCheckinData(out);
  return changed;
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

// 统计单日完成数（映射里 true 的个数）
export function countCompleted(dayMap) {
  if (!isPlainObject(dayMap)) return 0;
  let n = 0;
  for (const v of Object.values(dayMap)) if (v) n += 1;
  return n;
}

// 有效打卡日:当天至少完成 1 项才算已打卡(全部取消后不再计入)
export function isActiveDay(dayMap) {
  return countCompleted(dayMap) > 0;
}

// Get statistics (累计口径:只统计至少完成 1 项的日期;全取消的日期不计入)
export function getStatistics() {
  const data = getCheckinData();
  const total = getTaskCount();
  const activeDates = Object.keys(data).filter((date) => isActiveDay(data[date]));
  const totalDays = activeDates.length;
  const completedTasks = activeDates.reduce((sum, date) => sum + countCompleted(data[date]), 0);

  return {
    totalDays,
    completedTasks,
    completionRate: totalDays > 0 ? Math.round((completedTasks / (totalDays * total)) * 100) : 0,
    avgPerDay: totalDays > 0 ? Math.round((completedTasks / totalDays) * 100) / 100 : 0
  };
}

// 连续打卡天数:每天至少完成 1 项计为连续一天
// 今天尚未打卡时,保留截至昨天的连续记录(不因今天未打卡而清零)
export function getCurrentStreak() {
  const data = getCheckinData();
  const now = new Date();
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!isActiveDay(data[formatLocalDate(cursor)])) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }

  let streak = 0;
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

// 最长连续打卡天数（历史最佳）
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

// 本周统计:周一至周日,固定 7 列（与任务数量无关）
export function getWeeklyStats() {
  const data = getCheckinData();
  const total = getTaskCount();
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const weekData = [];

  for (let i = 0; i < 7; i++) {
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
      total,
      percentage: Math.round((completed / total) * 100),
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
  const total = getTaskCount();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = now.getDate();

  let totalTasks = 0;
  let completedTasks = 0;

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = formatLocalDate(new Date(year, month, day));
    totalTasks += total;
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

// 本月日历热力图数据（周一为一周起点）
export function getMonthCalendar(reference = new Date()) {
  const data = getCheckinData();
  const total = getTaskCount();
  const now = new Date();
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const todayStr = formatLocalDate(now);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const d = new Date(year, month, day);
    const dateStr = formatLocalDate(d);
    const completed = countCompleted(data[dateStr]);

    days.push({
      date: dateStr,
      day,
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      isToday: dateStr === todayStr,
      isFuture: d.getTime() > todayMidnight,
      hasRecord: Boolean(data[dateStr])
    });
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const elapsedDays = isCurrentMonth ? now.getDate() : lastDay;

  return {
    year,
    month,
    monthLabel: `${year}年${month + 1}月`,
    startOffset,
    days,
    total,
    elapsedDays,
    trackedDays: days.filter((d) => d.hasRecord).length,
    completedTasks: days.reduce((sum, d) => sum + d.completed, 0)
  };
}

// 本周 vs 上周同期：按「已过去的天数」对齐比较
export function getWeeklyComparison() {
  const data = getCheckinData();
  const total = getTaskCount();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);

  const dayCount = Math.floor((todayMidnight.getTime() - thisMonday.getTime()) / 86400000) + 1;
  const denominator = dayCount * total;

  let thisCompleted = 0;
  let lastCompleted = 0;
  for (let i = 0; i < dayCount; i += 1) {
    const a = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + i);
    const b = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + i);
    thisCompleted += countCompleted(data[formatLocalDate(a)]);
    lastCompleted += countCompleted(data[formatLocalDate(b)]);
  }

  const thisRate = denominator > 0 ? Math.round((thisCompleted / denominator) * 100) : 0;
  const lastRate = denominator > 0 ? Math.round((lastCompleted / denominator) * 100) : 0;

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
export function getRecentRecords(count = 7) {
  const data = getCheckinData();
  const total = getTaskCount();
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
      total
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
  localStorage.removeItem(STORAGE_KEY_TASKS);
}

// ---- 备份 / 恢复(不同来源的 localStorage 不互通,换网址时用此迁移) ----
const BACKUP_VERSION = 3;
const BACKUP_KEYS = ['checkinData', 'profile', 'weightRecords', 'weightUnit', 'tasks'];

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

// 逐字段清洗打卡数据：非法日期丢弃，两种结构（旧数组 / 新 id 映射）都接受
function sanitizeCheckinData(value) {
  if (!isPlainObject(value)) return { value: null, dropped: 0 };
  const legacyIds = DEFAULT_TASKS.map((t) => t.id);
  const out = {};
  let dropped = 0;
  for (const [date, day] of Object.entries(value)) {
    if (!isValidDateString(date) || (!Array.isArray(day) && !isPlainObject(day))) {
      dropped += 1;
      continue;
    }
    out[date] = migrateDay(day, legacyIds);
  }
  return { value: out, dropped };
}

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

    if (key === 'tasks') {
      const tasks = sanitizeTasks(raw);
      if (!tasks || !tasks.length) { dropped += 1; continue; }
      localStorage.setItem(key, JSON.stringify(tasks));
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
