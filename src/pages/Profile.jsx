import React, { useState, useEffect } from 'react';
import { getProfile, saveProfile } from '../storage/storage';
import { IconUser, IconInfo, IconBell } from '../components/icons';

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

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setNicknameInput(p.nickname);
    setGoalInput(p.goal);
  }, []);

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
        background: on ? '#315EFB' : 'rgba(120, 140, 170, 0.25)',
      }}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span
        className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-all duration-300"
        style={{
          left: on ? '23px' : '3px',
          boxShadow: '0 2px 6px rgba(120, 140, 170, 0.3)',
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
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0 originos-text-light"
            style={{
              background: 'rgba(49, 94, 251, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
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
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-[15px] originos-text outline-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(49, 94, 251, 0.3)',
                  }}
                  placeholder="输入昵称"
                />
                <button
                  onClick={saveNickname}
                  className="px-3 py-2 rounded-xl text-sm font-medium originos-blue active:scale-[0.97] transition-transform"
                  style={{ background: 'rgba(49, 94, 251, 0.1)' }}
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
              className="w-full px-3 py-2 rounded-xl text-[15px] originos-text outline-none resize-none"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(49, 94, 251, 0.3)',
              }}
              placeholder="例如：坚持打卡 100 天，养成早起习惯"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setEditingGoal(false); setGoalInput(profile.goal); }}
                className="px-4 py-2 rounded-xl text-sm originos-text-light active:scale-[0.97] transition-transform"
                style={{ background: 'rgba(120, 140, 170, 0.1)' }}
              >
                取消
              </button>
              <button
                onClick={saveGoal}
                className="px-4 py-2 rounded-xl text-sm font-medium originos-blue active:scale-[0.97] transition-transform"
                style={{ background: 'rgba(49, 94, 251, 0.1)' }}
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

        <div className="h-px my-1" style={{ background: 'rgba(120, 140, 170, 0.12)' }} />

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
        <div
          className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(120, 140, 170, 0.08)' }}
        >
          <span className="originos-text-light flex-shrink-0 mt-0.5">
            <IconInfo size={14} />
          </span>
          <p className="text-xs originos-text-light leading-relaxed">
            通知功能尚未启用：开关仅保存你的提醒偏好，本版本不会发送定时通知。
          </p>
        </div>
      </section>

      {/* About */}
      <section className="originos-card originos-scale-in p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm originos-text-light">版本</span>
          <span className="text-sm originos-text">v1.0.1</span>
        </div>
        <div className="h-px my-3" style={{ background: 'rgba(120, 140, 170, 0.12)' }} />
        <div className="flex items-center justify-between">
          <span className="text-sm originos-text-light">设计</span>
          <span className="text-sm originos-text">OriginOS 7 液态玻璃</span>
        </div>
      </section>
    </div>
  );
};

export default Profile;
