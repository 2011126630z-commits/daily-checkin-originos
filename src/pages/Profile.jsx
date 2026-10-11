import React, { useState, useEffect, useRef } from 'react';
import { getProfile, saveProfile, exportBackup, importBackup } from '../storage/storage';
import { IconUser, IconInfo, IconBell, IconSun, IconMoon, IconPhone } from '../components/icons';
import { useTheme } from '../hooks/useTheme';
import { THEME_OPTIONS } from '../theme';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.3';

const THEME_ICONS = { system: IconPhone, light: IconSun, dark: IconMoon };

const Profile = ({ showToast }) => {
  const [profile, setProfile] = useState({
    nickname: '',
    goal: '',
    morningReminder: false,
    eveningReminder: false,
  });
  const [editingNickname, setEditingNickname] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [theme, setTheme] = useTheme();
  const backupFileRef = useRef(null);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setNicknameInput(p.nickname);
    setGoalInput(p.goal);
  }, []);

  const handleExportBackup = () => {
    const text = exportBackup();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-checkin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('备份已导出');
  };

  const handleImportBackupFile = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importBackup(String(reader.result || ''));
      if (!result.ok) {
        showToast('恢复失败：' + result.error);
        return;
      }
      const droppedHint = result.dropped > 0 ? `，已忽略 ${result.dropped} 处无效数据` : '';
      showToast(`已恢复 ${result.keys.length} 项数据${droppedHint}，刷新后生效`);
      const p = getProfile();
      setProfile(p);
      setNicknameInput(p.nickname);
      setGoalInput(p.goal);
    };
    reader.onerror = () => showToast('文件读取失败');
    reader.readAsText(file);
  };

  const updateProfile = (patch) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
    return next;
  };

  const saveNickname = () => {
    updateProfile({ nickname: nicknameInput.trim() });
    setEditingNickname(false);
    showToast('昵称已保存');
  };

  const saveGoal = () => {
    updateProfile({ goal: goalInput.trim() });
    setEditingGoal(false);
    showToast('目标已保存');
  };

  const toggleReminder = (key, label) => {
    const next = updateProfile({ [key]: !profile[key] });
    showToast(`${label}提醒偏好已${next[key] ? '开启' : '关闭'}（通知尚未启用）`);
  };

  const ToggleSwitch = ({ on, onToggle, label }) => (
    <button
      onClick={onToggle}
      className="relative w-[52px] h-[32px] rounded-full transition-colors duration-300 flex-shrink-0 active:scale-[0.97]"
      style={{
        background: on ? 'var(--origin-blue)' : 'var(--origin-fill-strong)',
      }}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span
        className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-all duration-300"
        style={{
          left: on ? '23px' : '3px',
          boxShadow: '0 2px 6px var(--origin-shadow-strong)',
        }}
      />
    </button>
  );

  return (
    <div className="originos-page originos-slide-up px-5 pt-12 pb-28">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold originos-text">我的</h1>
        <p className="text-sm originos-text-light mt-1">个人设置</p>
      </header>

      {/* Avatar & Nickname Card */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0 originos-text-light originos-blue-soft"
            style={{ border: '1px solid var(--origin-border)' }}
          >
            {profile.nickname ? profile.nickname[0] : <IconUser size={26} />}
          </div>
          <div className="flex-1 min-w-0">
            {editingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  maxLength={12}
                  autoFocus
                  aria-label="昵称"
                  className="originos-input originos-input-strong flex-1 min-w-0 px-3 py-2 rounded-xl text-[15px] outline-none"
                  placeholder="输入昵称"
                />
                <button
                  onClick={saveNickname}
                  className="originos-blue originos-blue-soft px-3 py-2 rounded-xl text-sm font-medium active:scale-[0.97] transition-transform"
                >
                  保存
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingNickname(true)}
                className="text-left w-full active:scale-[0.98] transition-transform"
              >
                <p className="text-lg font-medium originos-text truncate">
                  {profile.nickname || '设置昵称'}
                </p>
                <p className="text-xs originos-text-light mt-0.5">点击修改昵称</p>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Goal Card */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <h2 className="text-sm originos-text-light mb-3">我的目标</h2>
        {editingGoal ? (
          <div>
            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              maxLength={60}
              rows={2}
              autoFocus
              aria-label="我的目标"
              className="originos-input originos-input-strong w-full px-3 py-2 rounded-xl text-[15px] outline-none resize-none"
              placeholder="例如：坚持打卡 100 天，养成早起习惯"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setEditingGoal(false); setGoalInput(profile.goal); }}
                className="originos-fill originos-text-light px-4 py-2 rounded-xl text-sm active:scale-[0.97] transition-transform"
              >
                取消
              </button>
              <button
                onClick={saveGoal}
                className="originos-blue originos-blue-soft px-4 py-2 rounded-xl text-sm font-medium active:scale-[0.97] transition-transform"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingGoal(true)}
            className="text-left w-full active:scale-[0.98] transition-transform"
          >
            <p className={`text-[15px] ${profile.goal ? 'originos-text' : 'originos-text-light'}`}>
              {profile.goal || '点击设置你的目标'}
            </p>
          </button>
        )}
      </section>

      {/* Appearance / Theme */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <h2 className="text-sm originos-text-light mb-4">外观</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="主题外观">
          {THEME_OPTIONS.map((opt) => {
            const Icon = THEME_ICONS[opt.value];
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setTheme(opt.value);
                  showToast(`外观已切换为「${opt.label}」`);
                }}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-300 active:scale-[0.97] ${
                  active ? 'originos-blue' : 'originos-text-light'
                } ${active ? 'originos-blue-soft' : 'originos-fill'}`}
              >
                <Icon size={18} />
                <span className="text-xs">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <div
          className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl originos-note"
        >
          <span className="originos-text-light flex-shrink-0 mt-0.5">
            <IconInfo size={14} />
          </span>
          <p className="text-xs originos-text-light leading-relaxed">
            深色模式使用石墨蓝黑玻璃，与浅色模式共用同一套数据；「跟随系统」会随手机深浅色自动切换。
          </p>
        </div>
      </section>

      {/* Reminder Card */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <h2 className="text-sm originos-text-light mb-4">每日提醒</h2>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="originos-text-light flex-shrink-0">
              <IconBell size={18} />
            </span>
            <div>
              <p className="text-[15px] originos-text">早间提醒</p>
              <p className="text-xs originos-text-light mt-0.5">偏好时间：每天 8:00</p>
            </div>
          </div>
          <ToggleSwitch
            on={profile.morningReminder}
            onToggle={() => toggleReminder('morningReminder', '早间')}
            label="早间提醒开关"
          />
        </div>

        <div className="originos-divider my-1" />

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="originos-text-light flex-shrink-0">
              <IconBell size={18} />
            </span>
            <div>
              <p className="text-[15px] originos-text">晚间提醒</p>
              <p className="text-xs originos-text-light mt-0.5">偏好时间：每天 21:30</p>
            </div>
          </div>
          <ToggleSwitch
            on={profile.eveningReminder}
            onToggle={() => toggleReminder('eveningReminder', '晚间')}
            label="晚间提醒开关"
          />
        </div>

        {/* 明确声明:通知功能尚未实现,开关仅保存偏好 */}
        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl originos-note">
          <span className="originos-text-light flex-shrink-0 mt-0.5">
            <IconInfo size={14} />
          </span>
          <p className="text-xs originos-text-light leading-relaxed">
            通知功能尚未启用：开关仅保存你的提醒偏好，本版本不会发送定时通知。
          </p>
        </div>
      </section>

      {/* Backup & Restore */}
      <section className="originos-card originos-scale-in p-5 mb-5">
        <h2 className="text-sm originos-text-light mb-4">数据备份与恢复</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportBackup}
            className="originos-fill originos-text flex-1 py-3 rounded-xl text-sm active:scale-[0.97] transition-transform"
          >
            导出备份
          </button>
          <button
            onClick={() => backupFileRef.current && backupFileRef.current.click()}
            className="originos-fill originos-text flex-1 py-3 rounded-xl text-sm active:scale-[0.97] transition-transform"
          >
            恢复备份
          </button>
          <input
            ref={backupFileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportBackupFile}
            className="hidden"
          />
        </div>
        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl originos-note">
          <span className="originos-text-light flex-shrink-0 mt-0.5">
            <IconInfo size={14} />
          </span>
          <p className="text-xs originos-text-light leading-relaxed">
            备份包含打卡记录、昵称目标、提醒偏好与体重记录。本地文件、旧网址与 GitHub Pages
            的浏览器存储互不相通，换网址时请用备份迁移数据。
          </p>
        </div>
      </section>

      {/* About */}
      <section className="originos-card originos-scale-in p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm originos-text-light">版本</span>
          <span className="text-sm originos-text">v{APP_VERSION}</span>
        </div>
        <div className="originos-divider my-3" />
        <div className="flex items-center justify-between">
          <span className="text-sm originos-text-light">设计</span>
          <span className="text-sm originos-text">OriginOS 7 液态玻璃</span>
        </div>
      </section>
    </div>
  );
};

export default Profile;
