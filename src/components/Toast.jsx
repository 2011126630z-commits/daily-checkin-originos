import React, { useEffect } from 'react';

const Toast = ({ message, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="originos-toast originos-fade-in">
      <span className="originos-text originos-text font-medium">{message}</span>
    </div>
  );
};

export default Toast;
