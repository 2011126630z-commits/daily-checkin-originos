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

// 降级动画：View Transitions 不可用时，短暂开启全局颜色过渡
function applyWithFade(apply) {
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  apply();
  window.setTimeout(() => root.classList.remove('theme-transitioning'), 460);
}

// 苹果风格：以点击位置为圆心做圆形扩散，揭开新主题
function applyWithReveal(apply, origin) {
  const doc = document;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof doc.startViewTransition !== 'function') {
    applyWithFade(apply);
    return;
  }

  const x = origin && typeof origin.x === 'number' ? origin.x : window.innerWidth / 2;
  const y = origin && typeof origin.y === 'number' ? origin.y : window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = doc.startViewTransition(apply);
  const ready = transition.ready || Promise.resolve();
  ready
    .then(() => {
      doc.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 520,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch(() => {});
}

export function setThemePreference(pref, origin = null) {
  const next = THEME_VALUES.includes(pref) ? pref : 'system';
  const changed = getResolvedTheme(next) !== getResolvedTheme(getThemePreference());
  try {
    localStorage.setItem(STORAGE_KEY_THEME, next);
  } catch {
    /* 隐私模式下写入失败时仍然应用当前会话的主题 */
  }

  const apply = () => {
    applyTheme(next);
    listeners.forEach((fn) => fn(next));
  };

  if (changed) applyWithReveal(apply, origin);
  else apply();

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
