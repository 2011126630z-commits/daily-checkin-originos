import React, { useState, useEffect } from 'react';
import {
  getWeeklyStats,
  getMonthlyCompletionRate,
  getRecentRecords,
  getStatistics,
  getMonthSummary,
  getLongestStreak,
  getCurrentStreak,
  getMonthCalendar,
  getWeeklyComparison,
  TASK_COUNT,
} from '../storage/storage';
import WeightCard from '../components/WeightCard';

// 本周柱状图(周一至周日,SVG)
const WeeklyChart = ({ data }) => {
  const chartHeight = 120;
  const barWidth = 28;
  const gap = 12;
  const chartWidth = data.length * barWidth + (data.length - 1) * gap;

  return (
    <div className="w-full overflow-hidden">
      <svg
        width="100%"
        height={chartHeight + 30}
        viewBox={`0 0 ${chartWidth + 20} ${chartHeight + 30}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="本周完成度柱状图"
      >
        {data.map((day, i) => {
          const barHeight = Math.max(4, (day.percentage / 100) * chartHeight);
          const x = i * (barWidth + gap) + 10;
          const y = chartHeight - barHeight;

          return (
            <g key={day.date}>
              {/* Background bar */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={barWidth / 2}
                style={{ fill: 'var(--origin-track)' }}
              />
              {/* Value bar:未来日期淡显,其余按完成度着色 */}
              {!day.isFuture && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={barWidth / 2}
                  style={{ fill: day.percentage > 0 ? 'var(--origin-blue)' : 'var(--origin-track)' }}
                  opacity={day.percentage > 0 ? (day.isToday ? 1 : 0.75) : 1}
                />
              )}
              {/* Percentage text */}
              {day.percentage > 0 && !day.isFuture && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="9"
                  style={{ fill: 'var(--origin-text-light)' }}
                >
                  {day.percentage}%
                </text>
              )}
              {/* Weekday label:周一 ~ 周日 */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize="10"
                style={{ fill: day.isToday ? 'var(--origin-blue)' : 'var(--origin-text-light)' }}
                fontWeight={day.isToday ? '600' : '400'}
              >
                {day.isToday ? '今天' : day.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 月度环形图(SVG)
const RingChart = ({ percentage }) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`本月完成率 ${percentage}%`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: 'var(--origin-track)' }}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: 'var(--origin-blue)', transition: 'stroke-dashoffset 0.8s ease-out' }}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold originos-text">{percentage}%</span>
        <span className="text-xs originos-text-light mt-1">月完成率</span>
      </div>
    </div>
  );
};

// 完成度 -> 热力等级(0-4)
const heatLevel = (completed) => {
  if (completed <= 0) return 0;
  if (completed <= 2) return 1;
  if (completed <= 4) return 2;
  if (completed <= 6) return 3;
  return 4;
};

const WEEKDAY_HEAD = ['一', '二', '三', '四', '五', '六', '日'];

// 本月日历热力图:周一为起点,点击某天查看明细
const MonthCalendar = ({ calendar, onPick }) => {
  const { days, startOffset, monthLabel, trackedDays, completedTasks, elapsedDays } = calendar;

  return (
    <section className="originos-card originos-scale-in p-5 mb-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-medium originos-text">{monthLabel}打卡日历</h2>
        <span className="text-xs originos-text-light">已记录 {trackedDays} 天</span>
      </div>

      <div className="heat-grid mb-2">
        {WEEKDAY_HEAD.map((w) => (
          <div key={w} className="text-center text-[10px] originos-text-light">{w}</div>
        ))}
        {/* 月首对齐空格 */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`blank-${i}`} className="heat-cell is-empty" aria-hidden="true" />
        ))}
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            className={`heat-cell ${d.isToday ? 'is-today' : ''} ${d.isFuture ? 'is-future' : ''}`}
            data-level={heatLevel(d.completed)}
            onClick={() => onPick(d)}
            aria-label={`${d.day}日，完成 ${d.completed}/${d.total} 项`}
          >
            {d.day}
          </button>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] originos-text-light">
          本月已完成 {completedTasks} / {elapsedDays * TASK_COUNT} 项
        </span>
        <span className="flex items-center gap-1 text-[10px] originos-text-light">
          少
          <i className="heat-cell" data-level="0" style={{ width: 10, height: 10 }} />
          <i className="heat-cell" data-level="1" style={{ width: 10, height: 10 }} />
          <i className="heat-cell" data-level="2" style={{ width: 10, height: 10 }} />
          <i className="heat-cell" data-level="3" style={{ width: 10, height: 10 }} />
          <i className="heat-cell" data-level="4" style={{ width: 10, height: 10 }} />
          多
        </span>
      </div>

      {/* 补打卡入口说明 */}
      <p className="text-[10px] originos-text-light mt-2 text-center">
        点击任意过去日期可直接补打卡
      </p>
    </section>
  );
};

const Stats = ({ showToast, onBackfill, dataVersion = 0 }) => {
  // 首次渲染直接从 localStorage 读，避免切到统计页时先闪一帧空数据
  const [weeklyData, setWeeklyData] = useState(() => getWeeklyStats());
  const [monthlyRate, setMonthlyRate] = useState(() => getMonthlyCompletionRate());
  const [recentRecords, setRecentRecords] = useState(() => getRecentRecords());
  const [stats, setStats] = useState(() => getStatistics());
  const [monthSummary, setMonthSummary] = useState(() => getMonthSummary());
  const [streaks, setStreaks] = useState(() => ({ current: getCurrentStreak(), longest: getLongestStreak() }));
  const [calendar, setCalendar] = useState(() => getMonthCalendar());
  const [comparison, setComparison] = useState(() => getWeeklyComparison());

  const loadData = () => {
    setWeeklyData(getWeeklyStats());
    setMonthlyRate(getMonthlyCompletionRate());
    setRecentRecords(getRecentRecords());
    setStatisticsNow();
  };

  const setStatisticsNow = () => {
    setStats(getStatistics());
    setMonthSummary(getMonthSummary());
    setStreaks({ current: getCurrentStreak(), longest: getLongestStreak() });
    setCalendar(getMonthCalendar());
    setComparison(getWeeklyComparison());
  };

  useEffect(() => {
    // 补打卡改动(dataVersion)后重新取数
    loadData();
    // Refresh stats when page becomes visible (tab switch back)
    const onVisible = () => { if (!document.hidden) loadData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [dataVersion]);

  // 点击过去某天 → 直接打开补打卡面板补记
  const handlePickDay = (d) => {
    if (d.isFuture) {
      showToast('还没到这一天');
      return;
    }
    if (onBackfill) {
      onBackfill(d.date);
      return;
    }
    showToast(d.completed === 0 ? `${d.day}日：未打卡` : `${d.day}日：完成 ${d.completed}/${d.total} 项`);
  };

  const deltaLabel = () => {
    if (!comparison || !comparison.hasLastWeekData) return null;
    if (comparison.delta > 0) return { text: `比上周同期 +${comparison.delta}%`, tone: 'blue' };
    if (comparison.delta < 0) return { text: `比上周同期 ${comparison.delta}%`, tone: 'muted' };
    return { text: '与上周同期持平', tone: 'muted' };
  };

  const delta = deltaLabel();

  return (
    <div className="originos-page originos-slide-up px-5 pt-12 pb-28">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold originos-text">统计</h1>
        <p className="text-sm originos-text-light mt-1">真实数据 · 每日更新</p>
      </header>

      {/* Overview Stats */}
      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="originos-card originos-scale-in p-4">
          <p className="text-xs originos-text-light mb-1">累计打卡天数</p>
          <p className="text-2xl font-bold originos-text">{stats.totalDays}<span className="text-sm font-normal originos-text-light ml-1">天</span></p>
        </div>
        <div className="originos-card originos-scale-in p-4">
          <p className="text-xs originos-text-light mb-1">完成任务总数</p>
          <p className="text-2xl font-bold originos-text">{stats.completedTasks}<span className="text-sm font-normal originos-text-light ml-1">项</span></p>
        </div>
        <div className="originos-card originos-scale-in p-4">
          <p className="text-xs originos-text-light mb-1">当前连续</p>
          <p className="text-2xl font-bold originos-text">{streaks.current}<span className="text-sm font-normal originos-text-light ml-1">天</span></p>
        </div>
        <div className="originos-card originos-scale-in p-4">
          <p className="text-xs originos-text-light mb-1">最长连续</p>
          <p className="text-2xl font-bold originos-blue">{streaks.longest}<span className="text-sm font-normal originos-text-light ml-1">天</span></p>
        </div>
      </section>

      {/* 本月日历热力图 */}
      {calendar && <MonthCalendar calendar={calendar} onPick={handlePickDay} />}

      {/* Weekly Bar Chart (Mon-Sun) */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-medium originos-text">本周（周一至周日）</h2>
          {delta && (
            <span className={`text-xs ${delta.tone === 'blue' ? 'originos-blue' : 'originos-text-light'}`}>
              {delta.text}
            </span>
          )}
        </div>
        <WeeklyChart data={weeklyData} />
        {comparison && !comparison.hasLastWeekData && (
          <p className="text-[10px] originos-text-light mt-2 text-center">上周暂无记录，无法对比</p>
        )}
      </section>

      {/* Monthly Ring Chart */}
      <section className="originos-card originos-scale-in p-5 mb-5 flex flex-col items-center">
        <h2 className="text-base font-medium originos-text mb-4 self-start">本月完成率</h2>
        <RingChart percentage={monthlyRate} />
        <p className="text-xs originos-text-light mt-4">
          按本月已过去的 {monthSummary.elapsedDays} 天计算 · 平均每天完成 {monthSummary.avgPerDay} / {TASK_COUNT} 项
        </p>
      </section>

      {/* Recent 7 Days Records */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <h2 className="text-base font-medium originos-text mb-4">最近 7 天记录</h2>
        <div className="space-y-3">
          {recentRecords.map((record, i) => (
            <div key={record.date} className="flex items-center gap-3">
              <span className={`text-xs w-12 ${record.isToday ? 'originos-blue font-medium' : 'originos-text-light'}`}>
                {record.isToday ? '今天' : record.displayDate}
              </span>
              <div className="flex-1 h-1.5 rounded-full originos-track overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(record.completed / record.total) * 100}%`,
                    background: 'var(--origin-blue)',
                    opacity: record.isToday ? 1 : Math.max(0.3, 0.7 - i * 0.08),
                  }}
                />
              </div>
              <span className="text-xs originos-text-light w-10 text-right">
                {record.completed}/{record.total}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Weight Records */}
      <WeightCard showToast={showToast} />
    </div>
  );
};

export default Stats;
