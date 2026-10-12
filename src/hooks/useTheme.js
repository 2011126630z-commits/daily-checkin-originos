import { useState, useEffect, useCallback } from 'react';
import { getThemePreference, setThemePreference, subscribeTheme } from '../theme';

// 主题偏好的 React 订阅 Hook：跨组件保持同步
export function useTheme() {
  const [preference, setPreference] = useState(() => getThemePreference());

  useEffect(() => subscribeTheme(setPreference), []);

  // origin：外观切换动画的圆心（按钮中心），不传则用屏幕中心
  const change = useCallback((pref, origin = null) => {
    setThemePreference(pref, origin);
  }, []);

  return [preference, change];
}

export default useTheme;
