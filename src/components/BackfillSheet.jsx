import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getTasks,
  getRecentRecords,
  getCheckinForDate,
  toggleCheckin,
  getTodayString,
  isBackfillable,
  formatLocalDate,
} from '../storage/storage';
import { getTaskIcon, IconCheck, IconClose, IconCalendarPlus } from '../components/icons';

const RECENT_DAYS = 14;

const weekdayOf = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(y, m - 1, d).getDay()];
};

const pickDefaultDate = (today) => {
  const recent = getRecentRecords(RECENT_DAYS);
  const pending = recent.find((r) => !r.isToday && r.completed < r.total);
  return (pending || recent[1] || recent[0]).date;
};

// 补打卡面板：选择过去的日期并勾选当天完成的任务
const BackfillSheet = ({ initialDate, onClose, onChanged, showToast }) => {
  const today = getTodayString();
  const tasks = useMemo(() => getTasks(), []);
  const [selected, setSelected] = useState(() => (
    initialDate && isBackfillable(initialDate, today) ? initialDate : pickDefaultDate(today)
  ));
  const [day, setDay] = useState(() => getCheckinForDate(
    initialDate && isBackfillable(initialDate, today) ? initialDate : pickDefaultDate(today)
  ));
  const [recent, setRecent] = useState(() => getRecentRecords(RECENT_DAYS));

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 730);
    return formatLocalDate(d);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const selectDate = useCallback((dateStr) => {
    if (dateStr === selected) return;
    if (!isBackfillable(dateStr, today)) {
      showToast(dateStr > today ? '不能补未来的日期' : '日期无效');
      return;
    }
    setSelected(dateStr);
    setDay(getCheckinForDate(dateStr));
  }, [selected, today, showToast]);

  const handleToggle = (task) => {
    const next = toggleCheckin(selected, task.id);
    setDay((prev) => {
      const copy = { ...prev };
      if (next) copy[task.id] = true;
      else delete copy[task.id];
      return copy;
    });
    setRecent(getRecentRecords(RECENT_DAYS));
    onChanged();
    showToast(next ? `已补打卡：${task.title}` : `已取消：${task.title}`);
  };

  const completed = tasks.filter((t) => day[t.id]).length;
  const total = tasks.length;
  const isToday = selected === today;
  const [, mm, dd] = selected.split('-').map(Number);

  return (
    <div className="originos-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="originos-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="补打卡"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="originos-blue"><IconCalendarPlus size={18} /></span>
            <h2 className="text-lg font-semibold originos-text">补打卡</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭补打卡"
            className="originos-fill originos-text-light w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
          >
            <IconClose size={15} />
          </button>
        </div>
        <p className="text-xs originos-text-light mb-4">
          选择要补的日期（不能补未来），勾选当天完成的任务，记录会立即保存
        </p>

        <div className="originos-day-strip mb-3" role="group" aria-label="最近两周">
          {recent.map((r) => {
            const active = r.date === selected;
            return (
              <button
                key={r.date}
                type="button"
                onClick={() => selectDate(r.date)}
                aria-pressed={active}
                aria-label={`${r.displayDate} ${r.weekday}，已完成 ${r.completed}/${r.total}`}
                className={`originos-day-chip ${active ? 'is-selected' : ''} ${r.isToday ? 'is-today' : ''}`}
              >
                <span className="block font-medium">{r.isToday ? '今天' : r.weekday.slice(1)}</span>
                <span className="block mt-0.5">{r.displayDate}</span>
                <span className={`block mt-0.5 ${r.completed > 0 ? 'originos-blue' : ''}`}>
                  {r.completed}/{r.total}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs originos-text-light flex-shrink-0">其他日期</span>
          <input
            type="date"
            value={selected}
            max={today}
            min={minDate}
            onChange={(e) => selectDate(e.target.value)}
            aria-label="选择要补打卡的日期"
            className="originos-input originos-input-strong flex-1 min-w-0 px-3 py-2 rounded-xl text-sm outline-none"
          />
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium originos-text">
            {mm}月{dd}日 {weekdayOf(selected)}{isToday ? '（今天）' : ''}
          </p>
          <p className="text-xs originos-text-light">已完成 {completed}/{total}</p>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => {
            const isDone = Boolean(day[task.id]);
            const TaskIcon = getTaskIcon(task.icon);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => handleToggle(task)}
                aria-pressed={isDone}
                aria-label={`${task.title}，${isDone ? '已完成' : '未完成'}`}
                className="originos-card w-full px-3 py-2.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform duration-200"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center originos-text-light originos-icon-chip">
                  <TaskIcon size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium ${isDone ? 'originos-text-light line-through' : 'originos-text'}`}>
                    {task.title}
                  </span>
                  {task.desc && (
                    <span className={`block text-[11px] mt-0.5 ${isDone ? 'opacity-50' : 'originos-text-light'}`}>
                      {task.desc}
                    </span>
                  )}
                </span>
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    isDone ? 'originos-blue-bg text-white' : 'originos-check-circle'
                  }`}
                >
                  {isDone && <IconCheck size={14} />}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="originos-blue-bg text-white w-full py-3 rounded-2xl text-sm font-medium mt-4 active:scale-[0.98] transition-transform"
        >
          完成
        </button>
      </div>
    </div>
  );
};

export default BackfillSheet;
