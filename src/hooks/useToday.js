import { useState, useEffect } from 'react';
import { getTodayString } from '../storage/storage';

// 计算距离下一个本地零点还有多少毫秒（加 1 秒冗余，避免边界抖动）
function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * 返回「今天」的本地日期字符串，并在跨零点时自动更新。
 * 修复：应用长时间挂在后台/前台跨过零点后，今日页仍显示昨天日期与昨天数据的问题。
 * 同时监听 visibilitychange，从后台切回时立即校正日期。
 */
export function useToday() {
  const [today, setToday] = useState(() => getTodayString());

  useEffect(() => {
    let timer = null;

    const refresh = () => {
      const current = getTodayString();
      setToday((prev) => (prev === current ? prev : current));
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextMidnight());
    };

    const onVisible = () => {
      if (!document.hidden) {
        refresh();
        schedule();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return today;
}

export default useToday;
