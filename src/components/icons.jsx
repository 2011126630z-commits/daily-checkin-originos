// 统一的内联 SVG 图标库(线性风格,currentColor 着色,禁止 emoji)
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const make = (paths) => {
  const Icon = ({ size = 20, ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      {paths}
    </svg>
  );
  return Icon;
};

// ---- 任务图标 ----
export const IconDroplet = make(
  <path d="M12 2.7s6.3 6.5 6.3 11.1a6.3 6.3 0 0 1-12.6 0C5.7 9.2 12 2.7 12 2.7z" />
);

export const IconDumbbell = make(
  <>
    <path d="M6.5 6.5v11" />
    <path d="M17.5 6.5v11" />
    <path d="M3.5 9.5v5" />
    <path d="M20.5 9.5v5" />
    <path d="M6.5 12h11" />
  </>
);

export const IconEgg = make(
  <path d="M12 3.2c-3.6 0-6.2 4.3-6.2 9a6.2 6.2 0 0 0 12.4 0c0-4.7-2.6-9-6.2-9z" />
);

export const IconLeaf = make(
  <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
    <path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" />
  </>
);

export const IconBookOpen = make(
  <>
    <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
    <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
  </>
);

export const IconCalculator = make(
  <>
    <rect x="4.5" y="2.5" width="15" height="19" rx="2.5" />
    <path d="M8.5 7h7" />
    <path d="M8.5 11.5h.01" />
    <path d="M12 11.5h.01" />
    <path d="M15.5 11.5h.01" />
    <path d="M8.5 15h.01" />
    <path d="M12 15h.01" />
    <path d="M15.5 15h.01" />
    <path d="M8.5 18.5h3.5" />
  </>
);

export const IconMoon = make(
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
);

// ---- 导航图标 ----
export const IconCalendar = make(
  <>
    <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
    <path d="M16 2.5v4" />
    <path d="M8 2.5v4" />
    <path d="M3 10h18" />
  </>
);

export const IconChart = make(
  <>
    <path d="M6 20v-4" />
    <path d="M12 20V10" />
    <path d="M18 20V4" />
  </>
);

export const IconUser = make(
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);

// ---- 状态/提示图标 ----
export const IconCheck = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...props}>
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4.5" />
    <path d="M12 8.2h.01" />
  </>
);

export const IconBell = make(
  <>
    <path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5H3.5S6 15 6 8.5" />
    <path d="M10.3 21a2 2 0 0 0 3.4 0" />
  </>
);

// ---- 外观/主题图标 ----
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.9 4.9l1.4 1.4" />
    <path d="M17.7 17.7l1.4 1.4" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M4.9 19.1l1.4-1.4" />
    <path d="M17.7 6.3l1.4-1.4" />
  </>
);

export const IconPhone = make(
  <>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M10.5 5.5h3" />
  </>
);

// ---- 补打卡 ----
export const IconCalendarPlus = make(
  <>
    <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
    <path d="M16 2.5v4" />
    <path d="M8 2.5v4" />
    <path d="M3 10h18" />
    <path d="M12 13.2v5.2" />
    <path d="M9.4 15.8h5.2" />
  </>
);

export const IconClose = make(
  <>
    <path d="M6.5 6.5l11 11" />
    <path d="M17.5 6.5l-11 11" />
  </>
);

// 任务可选图标：storage 里只存字符串 key，避免让 storage 依赖 React
export const TASK_ICON_MAP = {
  droplet: IconDroplet,
  dumbbell: IconDumbbell,
  egg: IconEgg,
  leaf: IconLeaf,
  book: IconBookOpen,
  calculator: IconCalculator,
  moon: IconMoon,
  sun: IconSun,
  bell: IconBell,
  check: IconCheck,
  user: IconUser,
  chart: IconChart,
};

export const TASK_ICON_KEYS = Object.keys(TASK_ICON_MAP);

export function getTaskIcon(key) {
  return TASK_ICON_MAP[key] || IconCheck;
}
