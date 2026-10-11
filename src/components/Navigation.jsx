import React from 'react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'today', icon: '📅', label: '今日' },
    { id: 'stats', icon: '📊', label: '统计' },
    { id: 'profile', icon: '👤', label: '我的' },
  ];

  return (
    <nav className="originos-nav originos-scale-in">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`originos-nav-item ${isActive ? 'active' : ''} flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 active:scale-[0.97]`}
            aria-label={tab.label}
          >
            <span className="text-2xl mb-1 originos-nav-icon">
              {tab.icon}
            </span>
            <span
              className={`text-[10.5px] originos-nav-text originos-text-light originos-text transition-all duration-300 ${
                isActive ? 'originos-blue font-medium' : ''
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
