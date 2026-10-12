import React, { useState, useEffect } from 'react';
import {
  getCheckinForDate,
  getTodayString,
  toggleCheckin,
  getProfile,
  getCurrentStreak,
  getLongestStreak,
} from '../storage/storage';
import { useToday } from '../hooks/useToday';
import { TASKS } from '../data/tasks';
import { IconCheck, IconCalendarPlus } from '../components/icons';

const Today = ({ showToast, onBackfill, dataVersion = 0 }) => {
  // 跨零点自动更新日期（修复长时间挂机后仍显示昨天的数据）
  const today = useToday();
  // 首次渲染直接读取，避免进入页面时闪一帧空状态
  const [checkData, setCheckData] = useState(() => getCheckinForDate(getTodayString()));
  const [profile, setProfile] = useState(() => getProfile());
  const [streak, setStreak] = useState(() => getCurrentStreak());
  const [longest, setLongest] = useState(() => getLongestStreak());
  const [justChecked, setJustChecked] = useState(null);

  useEffect(() => {
    setCheckData(getCheckinForDate(today));
    setProfile(getProfile());
    setStreak(getCurrentStreak());
    setLongest(getLongestStreak());
  }, [today, dataVersion]);

  const completed = checkData.filter(Boolean).length;
  const total = TASKS.length;
  const progress = Math.round((completed / total) * 100);

  const handleToggle = (index) => {
    const newState = toggleCheckin(today, index);
    const nextData = [...checkData];
    nextData[index] = newState;
    setCheckData(nextData);
    setStreak(getCurrentStreak());
    setLongest(getLongestStreak());
    if (newState) {
      setJustChecked(index);
      setTimeout(() => setJustChecked(null), 500);
      showToast(`已完成：${TASKS[index].title}`);
    } else {
      showToast(`已取消：${TASKS[index].title}`);
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
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm originos-text-light mb-1">{dateDisplay()}</p>
          <h1 className="text-2xl font-semibold originos-text truncate">
            {greeting()}{profile.nickname ? `，${profile.nickname}` : ''}
          </h1>
        </div>
        {/* 补打卡专用入口 */}
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

      {/* Today Overview Card */}
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
        {/* Progress Bar */}
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
        {/* Streak (真实连续打卡天数 + 历史最佳) */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs originos-text-light">连续打卡（每天至少 1 项）</span>
          <span className="text-xs font-medium originos-text">
            {streak} 天<span className="originos-text-light font-normal"> · 最长 {longest} 天</span>
          </span>
        </div>
      </section>

      {/* Task List */}
      <section className="space-y-3">
        {TASKS.map((task, index) => {
          const isDone = checkData[index];
          const TaskIcon = task.Icon;
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(index)}
              aria-pressed={isDone}
              aria-label={`${task.title}，${isDone ? '已完成' : '未完成'}`}
              className="originos-card w-full p-4 flex items-center gap-4 text-left active:scale-[0.97] transition-transform duration-200"
            >
              {/* Task Icon (inline SVG) */}
              <span
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center originos-text-light originos-icon-chip transition-opacity duration-300 ${
                  isDone ? 'opacity-60' : 'opacity-100'
                }`}
              >
                <TaskIcon size={18} />
              </span>

              {/* Task Info */}
              <span className="flex-1 min-w-0">
                <span
                  className={`block text-[15px] font-medium transition-all duration-300 ${
                    isDone ? 'originos-text-light line-through' : 'originos-text'
                  }`}
                >
                  {task.title}
                </span>
                <span className={`block text-xs mt-0.5 transition-opacity duration-300 ${isDone ? 'opacity-50' : 'originos-text-light'}`}>
                  {task.desc}
                </span>
              </span>

              {/* Check Circle */}
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? 'originos-blue-bg text-white'
                    : 'originos-check-circle'
                } ${isDone || justChecked === index ? 'originos-checkmark' : ''}`}
              >
                {isDone && <IconCheck size={16} />}
              </span>
            </button>
          );
        })}
      </section>

      {/* 补打卡提示 */}
      <p className="text-center text-xs originos-text-light mt-4">
        漏打了某一天？点右上角「补打卡」补记
      </p>

      {/* Completion Message */}
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
