import React, { useState, useEffect } from 'react';
import {
  getWeeklyStats,
  getMonthlyCompletionRate,
  getRecentRecords,
  getStatistics,
} from '../storage/storage';

// Weekly Bar Chart using SVG
const WeeklyChart = ({ data }) => {
  const maxPercentage = 100;
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
      >
        {data.map((day, i) => {
          const barHeight = Math.max(4, (day.percentage / maxPercentage) * chartHeight);
          const x = i * (barWidth + gap) + 10;
          const y = chartHeight - barHeight;
          const isToday = i === 0;

          return (
            <g key={day.date}>
              {/* Background bar */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={barWidth / 2}
                fill="rgba(120, 140, 170, 0.08)"
              />
              {/* Value bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={barWidth / 2}
                fill={day.percentage > 0 ? '#315EFB' : 'rgba(120, 140, 170, 0.15)'}
                opacity={day.percentage > 0 ? (isToday ? 1 : 0.75) : 1}
              />
              {/* Percentage text */}
              {day.percentage > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#718096"
                >
                  {day.percentage}%
                </text>
              )}
              {/* Date label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill={isToday ? '#315EFB' : '#8B919A'}
                fontWeight={isToday ? '600' : '400'}
              >
                {i === 0 ? '今天' : day.displayDate}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Monthly Ring Chart using SVG
const RingChart = ({ percentage }) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(120, 140, 170, 0.12)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#315EFB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold originos-text">{percentage}%</span>
        <span className="text-xs originos-text-light mt-1">月完成率</span>
      </div>
    </div>
  );
};

const Stats = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [recentRecords, setRecentRecords] = useState([]);
  const [stats, setStats] = useState({ totalDays: 0, completedTasks: 0, avgPerDay: 0 });

  const loadData = () => {
    setWeeklyData(getWeeklyStats());
    setMonthlyRate(getMonthlyCompletionRate());
    setRecentRecords(getRecentRecords());
    setStats(getStatistics());
  };

  useEffect(() => {
    loadData();
    // Refresh stats when page becomes visible (tab switch back)
    const onVisible = () => { if (!document.hidden) loadData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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
      </section>

      {/* Weekly Bar Chart */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <h2 className="text-base font-medium originos-text mb-4">本周 7 天</h2>
        <WeeklyChart data={weeklyData} />
      </section>

      {/* Monthly Ring Chart */}
      <section className="originos-card originos-scale-in p-5 mb-5 flex flex-col items-center">
        <h2 className="text-base font-medium originos-text mb-4 self-start">本月完成率</h2>
        <RingChart percentage={monthlyRate} />
        <p className="text-xs originos-text-light mt-4">
          平均每天完成 {stats.avgPerDay} / 7 项任务
        </p>
      </section>

      {/* Recent 7 Days Records */}
      <section className="originos-card originos-scale-in p-5">
        <h2 className="text-base font-medium originos-text mb-4">最近 7 天记录</h2>
        <div className="space-y-3">
          {recentRecords.map((record, i) => (
            <div key={record.date} className="flex items-center gap-3">
              <span className={`text-xs w-12 ${i === 0 ? 'originos-blue font-medium' : 'originos-text-light'}`}>
                {i === 0 ? '今天' : record.displayDate}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[rgba(120,140,170,0.12)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(record.completed / record.total) * 100}%`,
                    background: '#315EFB',
                    opacity: i === 0 ? 1 : 0.7 - i * 0.08,
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
    </div>
  );
};

export default Stats;
