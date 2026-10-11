import React, { useState, useCallback } from 'react';
import Today from './pages/Today';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';
import Toast from './components/Toast';

function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [animKey, setAnimKey] = useState(0);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setAnimKey((k) => k + 1);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'today':
        return <Today showToast={showToast} />;
      case 'stats':
        return <Stats showToast={showToast} />;
      case 'profile':
        return <Profile showToast={showToast} />;
      default:
        return <Today showToast={showToast} />;
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

      {/* Toast */}
      <Toast message={toast.message} show={toast.show} onClose={hideToast} />

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={switchTab} />
    </div>
  );
}

export default App;
