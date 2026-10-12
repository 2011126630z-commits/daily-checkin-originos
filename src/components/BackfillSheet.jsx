import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getRecentRecords,
  getCheckinForDate,
  toggleCheckin,
  getTodayString,
  isBackfillable,
  formatLocalDate,
} from '../storage/storage';
import { TASKS } from '../data/tasks';
import { IconCheck, IconClose, IconCalendarPlus } from '../components/icons';

const RECENT_DAYS = 14;

const weekdayOf = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(y, m - 1, d).getDay()];
};

// 默认选中：从昨天往前找第一个「还没做完」的日子，都做完了就选昨天
const pickDefaultDate = (today) => {
  const recent = getRecentRecords(RECENT_DAYS);
  const pending = recent.find((r) => !r.isToday && r.completed < r.total);
  return (pending || recent[1] || recent[0]).date;
};

/**
 * 补打卡面板：选择过去的日期并勾选当天完成的任务
 * props:
 *   initialDate  打开时默认选中的日期（'YYYY-MM-DD'，可空）
 *   onClose      关闭回调
 *   onChanged    任意一项被改动后回调（父级据此刷新今日页/统计页）
 *   showToast    轻提示
 */
const BackfillSheet = ({ initialDate, onClose, onChanged, showToast }) => {
  const today = getTodayString();
  const [selected, setSelected] = useState(() => {
    if (initialDate && isBackfillable(initialDate, today)) return initialDate;
    return pickDefaultDate(today);
  });
  const [dayData, setDayData] = useState(() => getCheckinForDate(selected));
  const [recent, setRecent] = useState(() => getRecentRecords(RECENT_DAYS));

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 730);
    return formatLocalDate(d);
  }, []);

  // ESC 关闭 + 锁定背景滚动
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const selectDate = useCallback(
    (dateStr) => {
      if (dateStr === selected) return;
      if (!isBackfillable(dateStr, today)) {
        showToast(dateStr > today ? '不能补未来的日期' : '日期无效');
        return;
      }
      setSelected(dateStr);
      setDayData(getCheckinForDate(dateStr));
    },
    [selected, today, showToast]
  );

  const handleToggle = (index) => {
    const newState = toggleCheckin(selected, index);
    const next = [...dayData];
    next[index] = newState;
    setDayData(next);
    setRecent(getRecentRecords(RECENT_DAYS));
    onChanged();
    showToast(
      newState
        ? `已补打卡：${TASKS[index].title}`
        : `已取消：${TASKS[index].title}`
    );
  };

  const completed = dayData.filter(Boolean).length;
  const total = TASKS.length;
  const isToday = selected === today;

  return (
    <div className="originos-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="originos-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="补打卡"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="originos-blue">
              <IconCalendarPlus size={18} />
            </span>
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

        {/* 最近两周快捷选择 */}
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

        {/* 更早的日期 */}
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

        {/* 当日任务 */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium originos-text">
            {selected.split('-')[1] * 1}月{selected.split('-')[2] * 1}日 {weekdayOf(selected)}
            {isToday ? '（今天）' : ''}
          </p>
          <p className="text-xs originos-text-light">
            已完成 {completed}/{total}
          </p>
        </div>

        <div className="space-y-2">
          {TASKS.map((task, index) => {
            const isDone = dayData[index];
            const TaskIcon = task.Icon;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => handleToggle(index)}
                aria-pressed={isDone}
                aria-label={`${task.title}，${isDone ? '已完成' : '未完成'}`}
                className="originos-card w-full px-3 py-2.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform duration-200"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center originos-text-light originos-icon-chip">
                  <TaskIcon size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-sm font-medium ${
                      isDone ? 'originos-text-light line-through' : 'originos-text'
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className={`block text-[11px] mt-0.5 ${isDone ? 'opacity-50' : 'originos-text-light'}`}>
                    {task.desc}
                  </span>
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
