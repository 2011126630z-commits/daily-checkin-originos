// 体重记录模块:独立 weightRecords 存储,不影响 checkinData / profile
// 内部统一使用 kg;显示层可按 1 kg = 2 斤 换算
const STORAGE_KEY_WEIGHT = 'weightRecords';
const STORAGE_KEY_UNIT = 'weightUnit';

export const KG_MIN = 20;
export const KG_MAX = 400;

// ---- 单位 ----
export function getWeightUnit() {
  const u = localStorage.getItem(STORAGE_KEY_UNIT);
  return u === 'jin' ? 'jin' : 'kg';
}

export function setWeightUnit(unit) {
  localStorage.setItem(STORAGE_KEY_UNIT, unit === 'jin' ? 'jin' : 'kg');
}

export function kgToDisplay(kg, unit) {
  return unit === 'jin' ? kg * 2 : kg;
}

export function displayToKg(value, unit) {
  return unit === 'jin' ? value / 2 : value;
}

export function unitLabel(unit) {
  return unit === 'jin' ? '斤' : 'kg';
}

// ---- 校验 ----
export function validateWeightEntry(input) {
  const weightKg = Number(input.weightKg);
  if (!Number.isFinite(weightKg) || weightKg < KG_MIN || weightKg > KG_MAX) {
    return { ok: false, error: `体重需在 ${KG_MIN}-${KG_MAX} kg 范围内` };
  }
  const t = new Date(input.timestamp);
  if (Number.isNaN(t.getTime())) {
    return { ok: false, error: '日期时间无效' };
  }
  if (t.getTime() > Date.now() + 60 * 1000) {
    return { ok: false, error: '测量时间不能晚于当前时间' };
  }
  return { ok: true, weightKg: Math.round(weightKg * 100) / 100, timestamp: t.toISOString() };
}

// ---- 读取 / 写入 ----
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WEIGHT);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  localStorage.setItem(STORAGE_KEY_WEIGHT, JSON.stringify(records));
}

// 按时间升序返回(便于画趋势图);展示时再自行排序
export function getWeightRecords() {
  return readAll().slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'w_' + crypto.randomUUID();
  }
  return 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// 去重:same sourceId,或同一分钟 + 相同重量(容差 0.01kg)
export function isDuplicate(records, candidate) {
  if (candidate.sourceId) {
    if (records.some((r) => r.sourceId && r.sourceId === candidate.sourceId)) return true;
  }
  const cMin = Math.floor(new Date(candidate.timestamp).getTime() / 60000);
  return records.some((r) => {
    const rMin = Math.floor(new Date(r.timestamp).getTime() / 60000);
    return rMin === cMin && Math.abs(Number(r.weightKg) - Number(candidate.weightKg)) < 0.01;
  });
}

// 新增单条;返回 { ok, record?, error?, duplicate? }
export function addWeightRecord(input) {
  const v = validateWeightEntry(input);
  if (!v.ok) return { ok: false, error: v.error };
  const records = readAll();
  const candidate = {
    id: genId(),
    timestamp: v.timestamp,
    weightKg: v.weightKg,
    source: input.source || 'manual',
    ...(input.sourceId ? { sourceId: String(input.sourceId) } : {})
  };
  if (isDuplicate(records, candidate)) return { ok: false, duplicate: true, error: '重复记录,已跳过' };
  records.push(candidate);
  writeAll(records);
  return { ok: true, record: candidate };
}

// 修改单条
export function updateWeightRecord(id, patch) {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: '记录不存在' };
  const merged = { ...records[idx], ...patch, id: records[idx].id };
  const v = validateWeightEntry(merged);
  if (!v.ok) return { ok: false, error: v.error };
  // 修改后可能与其它记录重复,排除自身后检查
  const others = records.filter((r) => r.id !== id);
  if (isDuplicate(others, { ...merged, timestamp: v.timestamp, weightKg: v.weightKg })) {
    return { ok: false, duplicate: true, error: '修改后与已有记录重复' };
  }
  records[idx] = { ...merged, timestamp: v.timestamp, weightKg: v.weightKg };
  writeAll(records);
  return { ok: true, record: records[idx] };
}

export function deleteWeightRecord(id) {
  const records = readAll();
  const next = records.filter((r) => r.id !== id);
  if (next.length === records.length) return { ok: false, error: '记录不存在' };
  writeAll(next);
  return { ok: true };
}

// ---- WeightProvider 接口 ----
// 任何数据源(手动 / 文件导入 / 未来的健康平台)实现同一契约:
//   name: 数据源标识
//   available(): 当前环境是否可用
//   fetch(): 返回 [{ timestamp, weightKg, source, sourceId? }]
//   sync(): 拉取并写入本地(带去重),返回 { imported, skipped }

export class ManualProvider {
  name = 'manual';
  available() { return true; }
  fetch() { return []; }
  sync() { return { imported: 0, skipped: 0 }; }
}

export class ImportProvider {
  name = 'import';
  available() { return true; }
  constructor(text) { this.text = text; }
  fetch() { return parseWeightFile(this.text).records; }
  sync() {
    const { records, error } = parseWeightFile(this.text);
    if (error) return { imported: 0, skipped: 0, error };
    let imported = 0;
    let skipped = 0;
    const existing = readAll();
    for (const rec of records) {
      const v = validateWeightEntry(rec);
      if (!v.ok) { skipped += 1; continue; }
      const candidate = {
        id: genId(),
        timestamp: v.timestamp,
        weightKg: v.weightKg,
        source: rec.source || 'import',
        ...(rec.sourceId ? { sourceId: String(rec.sourceId) } : {})
      };
      if (isDuplicate([...existing], candidate)) { skipped += 1; continue; }
      existing.push(candidate);
      imported += 1;
    }
    if (imported > 0) writeAll(existing);
    return { imported, skipped };
  }
}

// 自动同步尚未实现的占位:诚实标注不可用,不是假按钮
export class HealthConnectProvider {
  name = 'health-connect';
  available() { return false; }
  unavailableReason() { return '网页版无法访问 Android Health Connect'; }
  fetch() { return []; }
  sync() { return { imported: 0, skipped: 0, error: '自动同步暂不可用' }; }
}

// ---- 文件解析(JSON / CSV 自动识别) ----
export function parseWeightFile(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return { records: [], error: '文件内容为空' };

  // JSON:[{...}] 或 { records: [...] }
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(arr)) return { records: [], error: 'JSON 中未找到记录数组' };
      const records = arr
        .map((r) => ({
          timestamp: r.timestamp || r.time || r.date,
          weightKg: r.weightKg != null ? r.weightKg : r.weight != null ? Number(r.weight) : r.kg,
          source: r.source || 'import',
          sourceId: r.sourceId || undefined
        }))
        .filter((r) => r.timestamp != null && r.weightKg != null && Number.isFinite(Number(r.weightKg)));
      return { records };
    } catch {
      return { records: [], error: 'JSON 解析失败' };
    }
  }

  // CSV:timestamp,weightKg[,source,sourceId],允许带表头
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { records: [], error: 'CSV 无有效行' };
  const records = [];
  const header = lines[0].toLowerCase();
  const startIdx = /timestamp|time|date|weight|kg/.test(header) ? 1 : 0;
  for (let i = startIdx; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;
    const weightKg = Number(cols[1]);
    if (!cols[0] || !Number.isFinite(weightKg)) continue;
    records.push({
      timestamp: cols[0],
      weightKg,
      source: cols[2] || 'import',
      sourceId: cols[3] || undefined
    });
  }
  if (!records.length) return { records: [], error: 'CSV 中没有可解析的记录' };
  return { records };
}

export function exportWeightJSON() {
  const records = getWeightRecords();
  return JSON.stringify({ app: 'daily-checkin-originos', exportedAt: new Date().toISOString(), records }, null, 2);
}

export function exportWeightCSV() {
  const records = getWeightRecords();
  const header = 'timestamp,weightKg,source,sourceId';
  const rows = records.map((r) =>
    [r.timestamp, r.weightKg, r.source || 'manual', r.sourceId || ''].join(',')
  );
  return [header, ...rows].join('\n');
}
