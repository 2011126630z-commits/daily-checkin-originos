import React, { useState, useEffect } from 'react';
import {
  getTasks,
  getCheckinForDate,
  getTodayString,
  toggleCheckin,
  getProfile,
  getCurrentStreak,
  getLongestStreak,
} from '../storage/storage';
import { useToday } from '../hooks/useToday';
import { getTaskIcon, IconCheck, IconCalendarPlus } from '../components/icons';

const Today = ({ showToast, onBackfill, dataVersion = 0 }) => {
  const today = useToday();
  const [tasks, setTasks] = useState(() => getTasks());
  const [day, setDay] = useState(() => getCheckinForDate(getTodayString()));
  const [profile, setProfile] = useState(() => getProfile());
  const [streak, setStreak] = useState(() => getCurrentStreak());
  const [longest, setLongest] = useState(() => getLongestStreak());
  const [justChecked, setJustChecked] = useState(null);

  useEffect(() => {
    setTasks(getTasks());
    setDay(getCheckinForDate(today));
    setProfile(getProfile());
    setStreak(getCurrentStreak());
    setLongest(getLongestStreak());
  }, [today, dataVersion]);

  const completed = tasks.filter((t) => day[t.id]).length;
  const total = tasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  const handleToggle = (task) => {
    const next = toggleCheckin(today, task.id);
    setDay((prev) => {
      const copy = { ...prev };
      if (next) copy[task.id] = true;
      else delete copy[task.id];
      return copy;
    });
    setStreak(getCurrentStreak());
    setLongest(getLongestStreak());
    if (next) {
      setJustChecked(task.id);
      setTimeout(() => setJustChecked(null), 500);
      showToast(`已完成：${task.title}`);
    } else {
      showToast(`已取消：${task.title}`);
    }
  };

  const dateDisplay = () => {
    const [y, m, d] = today.split('-').map(Number);
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(y, m - 1, d).getDay()];
    return `${m}月${d}日 ${weekday}`;
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="originos-page originos-slide-up px-5 pt-12 pb-28">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm originos-text-light mb-1">{dateDisplay()}</p>
          <h1 className="text-2xl font-semibold originos-text truncate">
            {greeting()}{profile.nickname ? `，${profile.nickname}` : ''}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onBackfill && onBackfill()}
          aria-label="补打卡：补记过去某一天完成的任务"
          className="originos-action-pill flex-shrink-0 mt-0.5"
        >
          <IconCalendarPlus size={15} />
          补打卡
        </button>
      </header>

      <section className="originos-card originos-scale-in p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm originos-text-light mb-1">今日进度</p>
            <p className="text-3xl font-bold originos-text">
              {completed}
              <span className="text-lg originos-text-light font-normal"> / {total}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold originos-blue">{progress}%</p>
            <p className="text-xs originos-text-light">
              {progress === 100 ? '全部完成' : progress >= 50 ? '继续加油' : '开始打卡吧'}
            </p>
          </div>
        </div>
        <div
          className="w-full h-2 rounded-full originos-track overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="今日完成进度"
        >
          <div
            className="h-full rounded-full originos-blue-bg transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs originos-text-light">连续打卡（每天至少 1 项）</span>
          <span className="text-xs font-medium originos-text">
            {streak} 天<span className="originos-text-light font-normal"> · 最长 {longest} 天</span>
          </span>
        </div>
      </section>

      <section className="space-y-3">
        {tasks.map((task) => {
          const isDone = Boolean(day[task.id]);
          const TaskIcon = getTaskIcon(task.icon);
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(task)}
              aria-pressed={isDone}
              aria-label={`${task.title}，${isDone ? '已完成' : '未完成'}`}
              className="originos-card w-full p-4 flex items-center gap-4 text-left active:scale-[0.97] transition-transform duration-200"
            >
              <span
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center originos-text-light originos-icon-chip transition-opacity duration-300 ${
                  isDone ? 'opacity-60' : 'opacity-100'
                }`}
              >
                <TaskIcon size={18} />
              </span>

              <span className="flex-1 min-w-0">
                <span
                  className={`block text-[15px] font-medium transition-all duration-300 ${
                    isDone ? 'originos-text-light line-through' : 'originos-text'
                  }`}
                >
                  {task.title}
                </span>
                {task.desc && (
                  <span className={`block text-xs mt-0.5 transition-opacity duration-300 ${isDone ? 'opacity-50' : 'originos-text-light'}`}>
                    {task.desc}
                  </span>
                )}
              </span>

              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone ? 'originos-blue-bg text-white' : 'originos-check-circle'
                } ${isDone || justChecked === task.id ? 'originos-checkmark' : ''}`}
              >
                {isDone && <IconCheck size={16} />}
              </span>
            </button>
          );
        })}
      </section>

      <p className="text-center text-xs originos-text-light mt-4">
        任务可在「我的 → 任务设置」里增删改
      </p>

      {progress === 100 && (
        <div className="originos-card originos-scale-in p-4 mt-5 text-center">
          <p className="text-lg font-medium originos-text">今日全部完成</p>
          <p className="text-sm originos-text-light mt-1">坚持就是胜利，明天继续保持</p>
        </div>
      )}
    </div>
  );
};

export default Today;
