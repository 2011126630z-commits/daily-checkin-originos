import React, { useState, useEffect } from 'react';
import { getTasks, saveTasks, resetTasks, pruneCheckinData, MAX_TASKS } from '../storage/storage';
import { getTaskIcon, TASK_ICON_KEYS, IconClose, IconCheck } from '../components/icons';

const emptyDraft = () => ({ title: '', desc: '', icon: 'check' });

// 任务设置：增删改 + 上下排序 + 恢复默认
const TaskManagerSheet = ({ onClose, onChanged, showToast }) => {
  const [tasks, setTasks] = useState(() => getTasks());
  const [draft, setDraft] = useState(null); // { title, desc, icon }
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const commit = (next, message) => {
    const res = saveTasks(next);
    if (!res.ok) {
      showToast(res.error || '保存失败');
      return false;
    }
    setTasks(res.tasks);
    // 删除任务后清掉历史里对应的孤立打卡，避免统计被多算
    pruneCheckinData(res.tasks.map((t) => t.id));
    onChanged();
    if (message) showToast(message);
    return true;
  };

  const startAdd = () => {
    setEditId(null);
    setDraft(emptyDraft());
  };

  const startEdit = (task) => {
    setEditId(task.id);
    setDraft({ title: task.title, desc: task.desc, icon: task.icon });
  };

  const submitDraft = () => {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      showToast('请填写任务名称');
      return;
    }
    if (editId) {
      if (commit(tasks.map((t) => (t.id === editId ? { ...t, ...draft, title } : t)), '任务已更新')) {
        setDraft(null);
        setEditId(null);
      }
      return;
    }
    if (tasks.length >= MAX_TASKS) {
      showToast(`最多 ${MAX_TASKS} 个任务`);
      return;
    }
    const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    if (commit([...tasks, { id, title, desc: draft.desc.trim(), icon: draft.icon }], '任务已添加')) {
      setDraft(null);
    }
  };

  const removeTask = (task) => {
    if (tasks.length <= 1) {
      showToast('至少保留一个任务');
      return;
    }
    commit(tasks.filter((t) => t.id !== task.id), `已删除：${task.title}`);
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= tasks.length) return;
    const next = [...tasks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commit(next);
  };

  const restoreDefaults = () => {
    const defaults = resetTasks();
    setTasks(defaults);
    pruneCheckinData(defaults.map((t) => t.id));
    onChanged();
    showToast('已恢复默认任务');
  };

  return (
    <div className="originos-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="originos-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="任务设置"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold originos-text">任务设置</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭任务设置"
            className="originos-fill originos-text-light w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
          >
            <IconClose size={15} />
          </button>
        </div>
        <p className="text-xs originos-text-light mb-4">
          共 {tasks.length} 项（最多 {MAX_TASKS} 项）· 历史打卡按任务保存，改名不影响记录
        </p>

        {/* 任务列表 */}
        <div className="space-y-2">
          {tasks.map((task, index) => {
            const TaskIcon = getTaskIcon(task.icon);
            return (
              <div
                key={task.id}
                className="originos-card px-3 py-2.5 flex items-center gap-3"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center originos-text-light originos-icon-chip">
                  <TaskIcon size={16} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium originos-text truncate">{task.title}</span>
                  {task.desc && (
                    <span className="block text-[11px] originos-text-light truncate mt-0.5">{task.desc}</span>
                  )}
                </span>
                <span className="flex-shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`上移 ${task.title}`}
                    className="w-6 h-6 rounded-md originos-fill originos-text-light text-[11px] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === tasks.length - 1}
                    aria-label={`下移 ${task.title}`}
                    className="w-6 h-6 rounded-md originos-fill originos-text-light text-[11px] disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(task)}
                    aria-label={`编辑 ${task.title}`}
                    className="originos-blue originos-blue-soft px-2 h-6 rounded-md text-[11px]"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTask(task)}
                    aria-label={`删除 ${task.title}`}
                    className="originos-text-light px-2 h-6 rounded-md text-[11px] originos-fill"
                  >
                    删除
                  </button>
                </span>
              </div>
            );
          })}
        </div>

        {/* 添加 / 编辑表单 */}
        {draft ? (
          <div className="originos-panel rounded-2xl p-3 mt-3">
            <p className="text-xs originos-text-light mb-2">
              {editId ? '编辑任务' : '新任务'}
            </p>
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {TASK_ICON_KEYS.map((key) => {
                const Icon = getTaskIcon(key);
                const active = draft.icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: key })}
                    aria-label={`图标 ${key}`}
                    aria-pressed={active}
                    className={`h-9 rounded-lg flex items-center justify-center ${
                      active ? 'originos-blue originos-blue-soft' : 'originos-text-light originos-fill'
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={draft.title}
              maxLength={20}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="任务名称，例如：跑步 30 分钟"
              aria-label="任务名称"
              className="originos-input originos-input-strong w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
            />
            <input
              type="text"
              value={draft.desc}
              maxLength={40}
              onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
              placeholder="说明（可留空）"
              aria-label="任务说明"
              className="originos-input originos-input-strong w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDraft(null); setEditId(null); }}
                className="originos-fill originos-text-light px-4 py-2 rounded-xl text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitDraft}
                className="originos-blue originos-blue-soft px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1"
              >
                <IconCheck size={13} />
                {editId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startAdd}
            disabled={tasks.length >= MAX_TASKS}
            className="originos-fill originos-blue w-full py-3 rounded-2xl text-sm font-medium mt-3 disabled:opacity-40"
          >
            + 添加任务
          </button>
        )}

        <button
          type="button"
          onClick={restoreDefaults}
          className="originos-fill originos-text-light w-full py-2.5 rounded-2xl text-xs mt-2"
        >
          恢复默认任务
        </button>
      </div>
    </div>
  );
};

export default TaskManagerSheet;
