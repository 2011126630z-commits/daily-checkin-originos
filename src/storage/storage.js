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
  return data[dateStr] || [false, false, false, false, false, false, false];
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

// Get today's date string (YYYY-MM-DD)
export function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get all dates with checkin data
export function getAllDates() {
  const data = getCheckinData();
  return Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
}

// Get statistics
export function getStatistics() {
  const data = getCheckinData();
  const allDates = Object.keys(data);
  const totalDays = allDates.length;
  const totalTasks = totalDays * 7;
  const completedTasks = allDates.reduce((sum, date) => {
    return sum + data[date].filter(Boolean).length;
  }, 0);

  return {
    totalDays,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    avgPerDay: totalDays > 0 ? Math.round(completedTasks / totalDays) : 0
  };
}

// Get weekly statistics (last 7 days)
export function getWeeklyStats() {
  const data = getCheckinData();
  const today = new Date();
  const weekData = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = data[dateStr] || [false, false, false, false, false, false, false];
    const completed = dayData.filter(Boolean).length;
    const total = dayData.length;
    const percentage = Math.round((completed / total) * 100);

    weekData.push({
      date: dateStr,
      displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
      completed,
      total,
      percentage
    });
  }

  return weekData;
}

// Get monthly completion rate
export function getMonthlyCompletionRate() {
  const data = getCheckinData();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let totalTasks = 0;
  let completedTasks = 0;

  Object.keys(data).forEach(dateStr => {
    const date = new Date(dateStr);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      totalTasks += 7;
      completedTasks += data[dateStr].filter(Boolean).length;
    }
  });

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

// Get recent 7 days records
export function getRecentRecords() {
  const data = getCheckinData();
  const today = new Date();
  const records = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = data[dateStr] || [false, false, false, false, false, false, false];
    const completed = dayData.filter(Boolean).length;

    records.push({
      date: dateStr,
      displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
      completed,
      total: 7
    });
  }

  return records;
}

// Reset all data (for testing)
export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY_CHECKIN);
  localStorage.removeItem(STORAGE_KEY_PROFILE);
}
