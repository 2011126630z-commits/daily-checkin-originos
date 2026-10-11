import React from 'react';
import { IconCalendar, IconChart, IconUser } from './icons';

const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'today', Icon: IconCalendar, label: '今日' },
    { id: 'stats', Icon: IconChart, label: '统计' },
    { id: 'profile', Icon: IconUser, label: '我的' },
  ];

  return (
    <nav className="originos-nav originos-scale-in">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`originos-nav-item ${isActive ? 'active' : ''} flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 active:scale-[0.97] ${
              isActive ? 'originos-blue' : 'originos-text-light'
            }`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="originos-nav-icon flex items-center justify-center">
              <tab.Icon size={18} />
            </span>
            <span
              className={`originos-nav-text transition-all duration-300 ${
                isActive ? 'originos-blue font-medium' : 'originos-text-light'
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
