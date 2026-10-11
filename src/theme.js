// 主题管理：system(跟随系统) / light(浅色) / dark(深色)
// 只负责偏好读写与 <html data-theme> 的同步，具体配色全部在 global.css 的令牌里
const STORAGE_KEY_THEME = 'themePreference';

export const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

const THEME_VALUES = THEME_OPTIONS.map((o) => o.value);

// 两种模式对应的浏览器地址栏/状态栏颜色
const THEME_COLOR = { light: '#E9EDF4', dark: '#0D1015' };

const listeners = new Set();

export function getThemePreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY_THEME);
    return THEME_VALUES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

// 实际生效的明暗（system 时取决于系统设置）
export function getResolvedTheme(pref = getThemePreference()) {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function syncMetaThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[getResolvedTheme()]);
}

export function applyTheme(pref = getThemePreference()) {
  if (typeof document === 'undefined') return;
  // system 也写入 data-theme，便于 CSS 用媒体查询分支
  document.documentElement.dataset.theme = pref;
  syncMetaThemeColor();
}

export function setThemePreference(pref) {
  const next = THEME_VALUES.includes(pref) ? pref : 'system';
  try {
    localStorage.setItem(STORAGE_KEY_THEME, next);
  } catch {
    /* 隐私模式下写入失败时仍然应用当前会话的主题 */
  }
  applyTheme(next);
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 系统主题变化时（仅 system 模式有影响）同步 meta 颜色
export function watchSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getThemePreference() === 'system') syncMetaThemeColor();
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

// App 启动时调用一次（index.html 里的内联脚本已提前设置 data-theme 防止闪白）
export function initTheme() {
  const pref = getThemePreference();
  applyTheme(pref);
  return watchSystemTheme();
}
