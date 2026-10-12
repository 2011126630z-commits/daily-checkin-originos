import React, { useState, useCallback } from 'react';
import Today from './pages/Today';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';
import Toast from './components/Toast';
import BackfillSheet from './components/BackfillSheet';

function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [animKey, setAnimKey] = useState(0);
  // 补打卡面板：{ open, date }；date 为 null 时由面板自己挑默认日期
  const [backfill, setBackfill] = useState({ open: false, date: null });
  // 补打卡改动后自增，今日页/统计页据此重新读取数据
  const [dataVersion, setDataVersion] = useState(0);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  const openBackfill = useCallback((date = null) => {
    setBackfill({ open: true, date: date || null });
  }, []);

  const closeBackfill = useCallback(() => {
    setBackfill((prev) => ({ ...prev, open: false }));
  }, []);

  const handleBackfillChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setAnimKey((k) => k + 1);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'today':
        return <Today showToast={showToast} onBackfill={openBackfill} dataVersion={dataVersion} />;
      case 'stats':
        return <Stats showToast={showToast} onBackfill={openBackfill} dataVersion={dataVersion} />;
      case 'profile':
        return <Profile showToast={showToast} />;
      default:
        return <Today showToast={showToast} onBackfill={openBackfill} dataVersion={dataVersion} />;
    }
  };

  return (
    <div className="originos-app min-h-screen relative" style={{ zIndex: 1 }}>
      {/* Ambient Soft Light Layers - extremely subtle, 颜色随主题令牌切换 */}
      <div
        className="originos-ambient"
        style={{
          top: '-10%',
          right: '-15%',
          width: '60%',
          height: '40%',
          background: 'var(--origin-glow)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="originos-ambient"
        style={{
          bottom: '10%',
          left: '-20%',
          width: '55%',
          height: '35%',
          background: 'var(--origin-surface)',
          filter: 'blur(90px)',
          opacity: 0.6,
        }}
      />

      {/* Page Content */}
      <main key={animKey} className="originos-fade-in relative" style={{ zIndex: 1, maxWidth: 480, margin: '0 auto' }}>
        {renderPage()}
      </main>

      {/* 补打卡面板 */}
      {backfill.open && (
        <BackfillSheet
          initialDate={backfill.date}
          onClose={closeBackfill}
          onChanged={handleBackfillChanged}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      <Toast message={toast.message} show={toast.show} onClose={hideToast} />

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={switchTab} />
    </div>
  );
}

export default App;
