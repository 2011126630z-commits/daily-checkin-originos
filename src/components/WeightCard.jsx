import React, { useState, useEffect, useRef } from 'react';
import {
  getWeightRecords,
  addWeightRecord,
  updateWeightRecord,
  deleteWeightRecord,
  getWeightUnit,
  setWeightUnit,
  kgToDisplay,
  displayToKg,
  unitLabel,
  ImportProvider,
  HealthConnectProvider,
  exportWeightJSON,
  exportWeightCSV,
} from '../storage/weight';

const pad = (n) => String(n).padStart(2, '0');

function toLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SOURCE_LABEL = { manual: '手动', import: '导入', 'health-connect': '自动同步' };

// 简洁 SVG 趋势图(最近 14 条)
const TrendChart = ({ records, unit }) => {
  const points = records.slice(-14);
  if (points.length === 0) return null;

  const W = 320;
  const H = 110;
  const padX = 16;
  const padY = 16;
  const values = points.map((r) => kgToDisplay(r.weightKg, unit));
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 0.5) { max += 0.5; min -= 0.5; }
  const step = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const y = (v) => padY + (1 - (v - min) / (max - min)) * (H - padY * 2);
  const coords = values.map((v, i) => [padX + step * i, y(v)]);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline
        points={coords.map(([x, yy]) => `${x},${yy}`).join(' ')}
        fill="none"
        stroke="#315EFB"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map(([x, yy], i) => (
        <circle
          key={points[i].id}
          cx={x}
          cy={yy}
          r={i === coords.length - 1 ? 4 : 2.5}
          fill={i === coords.length - 1 ? '#315EFB' : '#ffffff'}
          stroke="#315EFB"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
};

const WeightCard = ({ showToast }) => {
  const [records, setRecords] = useState([]);
  const [unit, setUnit] = useState('kg');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const fileRef = useRef(null);

  const reload = () => {
    setRecords(getWeightRecords());
    setUnit(getWeightUnit());
  };

  useEffect(() => { reload(); }, []);

  const latest = records.length ? records[records.length - 1] : null;
  const displayList = (showAllHistory ? records.slice().reverse() : records.slice().reverse().slice(0, 5));

  const openAdd = () => {
    setEditId(null);
    setWeightInput('');
    setTimeInput(toLocalInputValue(new Date()));
    setFormOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    setWeightInput(String(kgToDisplay(r.weightKg, unit).toFixed(1)));
    setTimeInput(toLocalInputValue(new Date(r.timestamp)));
    setFormOpen(true);
  };

  const submitForm = () => {
    const display = Number(weightInput);
    if (!Number.isFinite(display) || display <= 0) {
      showToast('请输入有效的体重数值');
      return;
    }
    const kg = Math.round(displayToKg(display, unit) * 100) / 100;
    const timestamp = new Date(timeInput);
    const payload = { weightKg: kg, timestamp, source: 'manual' };
    const result = editId
      ? updateWeightRecord(editId, payload)
      : addWeightRecord(payload);
    if (!result.ok) {
      showToast(result.duplicate ? '重复记录已跳过' : result.error);
      return;
    }
    setFormOpen(false);
    reload();
    showToast(editId ? '体重记录已更新' : '体重记录已保存');
  };

  const handleDelete = (r) => {
    const result = deleteWeightRecord(r.id);
    if (result.ok) {
      reload();
      showToast('已删除该条体重记录');
    } else {
      showToast(result.error);
    }
  };

  const switchUnit = (next) => {
    setWeightUnit(next);
    setUnit(next);
    if (formOpen) {
      // 已打开的表单同步换算,避免数值单位错乱
      const current = Number(weightInput);
      if (Number.isFinite(current) && current > 0 && next !== unit) {
        const kg = displayToKg(current, unit);
        setWeightInput(String(kgToDisplay(kg, next).toFixed(1)));
      }
    }
  };

  const doExport = (kind) => {
    if (!records.length) {
      showToast('暂无体重记录可导出');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    if (kind === 'json') {
      download(`weight-records-${date}.json`, exportWeightJSON(), 'application/json');
    } else {
      download(`weight-records-${date}.csv`, exportWeightCSV(), 'text/csv');
    }
    showToast(`已导出 ${records.length} 条记录`);
  };

  const handleImportFile = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const provider = new ImportProvider(text);
      const result = provider.sync();
      if (result.error) {
        showToast('导入失败：' + result.error);
        return;
      }
      reload();
      showToast(`导入完成：新增 ${result.imported} 条，跳过 ${result.skipped} 条`);
    };
    reader.onerror = () => showToast('文件读取失败');
    reader.readAsText(file);
  };

  const hcProvider = new HealthConnectProvider();

  return (
    <section className="originos-card originos-scale-in p-5 mb-5">
      {/* 标题 + 单位切换 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium originos-text">体重记录</h2>
        <div className="flex rounded-full overflow-hidden" style={{ background: 'rgba(120,140,170,0.1)' }}>
          {['kg', 'jin'].map((u) => (
            <button
              key={u}
              onClick={() => switchUnit(u)}
              className={`px-3 py-1 text-xs transition-colors duration-200 ${
                unit === u ? 'originos-blue font-medium' : 'originos-text-light'
              }`}
              style={unit === u ? { background: 'rgba(49,94,251,0.08)' } : undefined}
            >
              {unitLabel(u)}
            </button>
          ))}
        </div>
      </div>

      {latest ? (
        <>
          {/* 最近一次 */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-3xl font-bold originos-text">
                {kgToDisplay(latest.weightKg, unit).toFixed(1)}
                <span className="text-sm font-normal originos-text-light ml-1">{unitLabel(unit)}</span>
              </p>
              <p className="text-xs originos-text-light mt-1">
                {formatDateTime(latest.timestamp)} · 来源：{SOURCE_LABEL[latest.source] || latest.source}
              </p>
            </div>
            <button
              onClick={openAdd}
              className="px-3 py-2 rounded-xl text-sm font-medium originos-blue active:scale-[0.97] transition-transform"
              style={{ background: 'rgba(49,94,251,0.1)' }}
            >
              新增
            </button>
          </div>

          {/* 趋势图 */}
          {records.length >= 2 && (
            <div className="mt-3 mb-1">
              <TrendChart records={records} unit={unit} />
              <p className="text-[10px] originos-text-light text-center mt-1">
                最近 {Math.min(records.length, 14)} 次测量趋势
              </p>
            </div>
          )}
        </>
      ) : (
        /* 空状态 */
        <div className="text-center py-6">
          <p className="text-sm originos-text-light mb-3">暂无体重记录</p>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl text-sm font-medium originos-blue active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(49,94,251,0.1)' }}
          >
            记录第一条体重
          </button>
        </div>
      )}

      {/* 新增/编辑表单 */}
      {formOpen && (
        <div className="rounded-2xl p-3 mt-3" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)' }}>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={`体重（${unitLabel(unit)}）`}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl text-[15px] originos-text outline-none"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(49,94,251,0.25)' }}
            />
            <span className="text-sm originos-text-light flex-shrink-0">{unitLabel(unit)}</span>
          </div>
          <input
            type="datetime-local"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm originos-text outline-none mb-3"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(49,94,251,0.25)' }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 rounded-xl text-sm originos-text-light active:scale-[0.97] transition-transform"
              style={{ background: 'rgba(120,140,170,0.1)' }}
            >
              取消
            </button>
            <button
              onClick={submitForm}
              className="px-4 py-2 rounded-xl text-sm font-medium originos-blue active:scale-[0.97] transition-transform"
              style={{ background: 'rgba(49,94,251,0.1)' }}
            >
              {editId ? '保存修改' : '保存'}
            </button>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {records.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs originos-text-light">历史记录（{records.length}）</p>
            {records.length > 5 && (
              <button
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-xs originos-blue"
              >
                {showAllHistory ? '收起' : '展开全部'}
              </button>
            )}
          </div>
          <div className="space-y-1">
            {displayList.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1.5">
                <span className="text-sm originos-text w-20 flex-shrink-0">
                  {kgToDisplay(r.weightKg, unit).toFixed(1)} {unitLabel(unit)}
                </span>
                <span className="text-xs originos-text-light flex-1 min-w-0 truncate">
                  {formatDateTime(r.timestamp)} · {SOURCE_LABEL[r.source] || r.source}
                </span>
                <button onClick={() => openEdit(r)} className="text-xs originos-blue px-1.5 py-0.5" aria-label="编辑">
                  编辑
                </button>
                <button onClick={() => handleDelete(r)} className="text-xs originos-text-light px-1.5 py-0.5" aria-label="删除">
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 导入 / 导出 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => fileRef.current && fileRef.current.click()}
          className="flex-1 py-2 rounded-xl text-xs originos-text active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(120,140,170,0.1)' }}
        >
          导入 JSON/CSV
        </button>
        <button
          onClick={() => doExport('json')}
          className="flex-1 py-2 rounded-xl text-xs originos-text active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(120,140,170,0.1)' }}
        >
          导出 JSON
        </button>
        <button
          onClick={() => doExport('csv')}
          className="flex-1 py-2 rounded-xl text-xs originos-text active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(120,140,170,0.1)' }}
        >
          导出 CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv,text/plain"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* 自动同步状态:如实标注不可用 */}
      {!hcProvider.available() && (
        <p className="text-[10px] originos-text-light mt-3 leading-relaxed">
          自动同步暂不可用（{hcProvider.unavailableReason()}）。当前支持手动记录与文件导入。
        </p>
      )}
    </section>
  );
};

export default WeightCard;
