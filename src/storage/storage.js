// Storage module for localStorage management
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

// Get checkin data for a specific date
export function getCheckinForDate(dateStr) {
  const data = getCheckinData();
  return data[dateStr] || Array(TASK_COUNT).fill(false);
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

// 统计单日完成数
function countCompleted(dayData) {
  return dayData ? dayData.filter(Boolean).length : 0;
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

// 最近 7 天记录(含今天,本地日期)
export function getRecentRecords() {
  const data = getCheckinData();
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const records = [];

  for (let i = 0; i < TASK_COUNT; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = formatLocalDate(d);
    const completed = countCompleted(data[dateStr]);

    records.push({
      date: dateStr,
      displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: dateStr === todayStr,
      completed,
      total: TASK_COUNT
    });
  }

  return records;
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

// 从备份 JSON 恢复;返回 { ok, keys, error }
export function importBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是有效的 JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
    return { ok: false, error: '备份文件结构不正确' };
  }
  const keys = [];
  for (const key of BACKUP_KEYS) {
    if (!(key in parsed.data)) continue;
    const value = parsed.data[key];
    // 只接受与原结构一致的顶层类型
    if (key === 'weightUnit') {
      if (typeof value !== 'string') continue;
    } else if (typeof value !== 'object' || value === null || Array.isArray(value) !== (key === 'weightRecords')) {
      continue;
    }
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    keys.push(key);
  }
  if (!keys.length) return { ok: false, error: '备份文件中没有可恢复的数据' };
  return { ok: true, keys };
}
