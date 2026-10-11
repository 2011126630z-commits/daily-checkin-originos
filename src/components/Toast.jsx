import React, { useEffect } from 'react';

// 始终挂载,通过 .show 类控制滑入滑出;message 变化时重置计时器
const Toast = ({ message, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2200);
      return () => clearTimeout(timer);
    }
  }, [show, message, onClose]);

  return (
    <div
      className={`originos-toast ${show ? 'show' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

export default Toast;
