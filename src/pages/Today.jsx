import React, { useState, useEffect } from 'react';
import {
  getTodayString,
  getCheckinForDate,
  toggleCheckin,
  getProfile,
} from '../storage/storage';
import { TASK_ICONS, IconCheck } from '../components/icons';

const TASKS = [
  { id: 0, title: '喝水 2L', desc: '保持身体水分充足' },
  { id: 1, title: '健身房训练', desc: '力量或有氧训练' },
  { id: 2, title: '吃够蛋白质', desc: '每公斤体重 1.6g 以上' },
  { id: 3, title: '吃蔬菜', desc: '至少一份绿叶蔬菜' },
  { id: 4, title: '背单词 30 个', desc: '坚持每日积累' },
  { id: 5, title: '复习数学 1 小时', desc: '保持数学思维敏捷' },
  { id: 6, title: '早睡 23:00 前', desc: '保证充足睡眠' },
];

const Today = ({ showToast }) => {
  const [checkData, setCheckData] = useState([false, false, false, false, false, false, false]);
  const [profile, setProfile] = useState({ nickname: '' });
  const [justChecked, setJustChecked] = useState(null);
  const today = getTodayString();

  useEffect(() => {
    setCheckData(getCheckinForDate(today));
    setProfile(getProfile());
  }, [today]);

  const completed = checkData.filter(Boolean).length;
  const total = TASKS.length;
  const progress = Math.round((completed / total) * 100);

  const handleToggle = (index) => {
    const newState = toggleCheckin(today, index);
    const nextData = [...checkData];
    nextData[index] = newState;
    setCheckData(nextData);
    if (newState) {
      setJustChecked(index);
      setTimeout(() => setJustChecked(null), 500);
      showToast(`已完成：${TASKS[index].title}`);
    } else {
      showToast(`已取消：${TASKS[index].title}`);
    }
  };

  const dateDisplay = () => {
    const now = new Date();
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
    return `${now.getMonth() + 1}月${now.getDate()}日 ${weekday}`;
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
      <header className="mb-6">
        <p className="text-sm originos-text-light mb-1">{dateDisplay()}</p>
        <h1 className="text-2xl font-semibold originos-text">
          {greeting()}{profile.nickname ? `，${profile.nickname}` : ''}
        </h1>
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
        <div className="w-full h-2 rounded-full bg-[rgba(120,140,170,0.15)] overflow-hidden">
          <div
            className="h-full rounded-full originos-blue-bg transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {/* Task List */}
      <section className="space-y-3">
        {TASKS.map((task, index) => {
          const isDone = checkData[index];
          const TaskIcon = TASK_ICONS[index];
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(index)}
              className="originos-card w-full p-4 flex items-center gap-4 text-left active:scale-[0.97] transition-transform duration-200"
            >
              {/* Task Icon (inline SVG) */}
              <span
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  isDone
                    ? 'text-[#8B919A] bg-[rgba(120,140,170,0.08)]'
                    : 'originos-text-light bg-[rgba(120,140,170,0.1)]'
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
                    ? 'originos-blue-bg text-white originos-checkmark'
                    : 'border-2 border-[rgba(120,140,170,0.35)]'
                } ${justChecked === index ? 'originos-checkmark' : ''}`}
              >
                {isDone && <IconCheck size={16} />}
              </span>
            </button>
          );
        })}
      </section>

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
