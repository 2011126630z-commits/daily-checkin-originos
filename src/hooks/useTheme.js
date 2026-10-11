import { useState, useEffect, useCallback } from 'react';
import { getThemePreference, setThemePreference, subscribeTheme } from '../theme';

// 主题偏好的 React 订阅 Hook：跨组件保持同步
export function useTheme() {
  const [preference, setPreference] = useState(() => getThemePreference());

  useEffect(() => subscribeTheme(setPreference), []);

  const change = useCallback((pref) => {
    setThemePreference(pref);
  }, []);

  return [preference, change];
}

export default useTheme;
