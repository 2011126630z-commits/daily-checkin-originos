import { TASK_ICONS, IconCalendarPlus } from '../components/icons';

// 7 个固定任务：今日页、补打卡面板、统计口径共用同一份定义
// 注意：顺序必须与 storage.js 的 TASK_COUNT(7) 及 icons.jsx 的 TASK_ICONS 一致，
// scripts/test-render.mjs 里有断言防止漂移。
export const TASKS = [
  { id: 0, title: '喝水 2L', desc: '保持身体水分充足', Icon: TASK_ICONS[0] },
  { id: 1, title: '健身房训练', desc: '力量或有氧训练', Icon: TASK_ICONS[1] },
  { id: 2, title: '吃够蛋白质', desc: '每公斤体重 1.6g 以上', Icon: TASK_ICONS[2] },
  { id: 3, title: '吃蔬菜', desc: '至少一份绿叶蔬菜', Icon: TASK_ICONS[3] },
  { id: 4, title: '背单词 30 个', desc: '坚持每日积累', Icon: TASK_ICONS[4] },
  { id: 5, title: '复习数学 1 小时', desc: '保持数学思维敏捷', Icon: TASK_ICONS[5] },
  { id: 6, title: '早睡 23:00 前', desc: '保证充足睡眠', Icon: TASK_ICONS[6] },
];

export const TASK_TOTAL = TASKS.length;

export { IconCalendarPlus };
