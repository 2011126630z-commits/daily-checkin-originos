/**
 * 渲染冒烟测试：把所有页面在 node 下用 react-dom/server 渲染一遍
 * 用于捕获运行时错误（未定义变量、非法 props、空数组访问等）与 React 警告。
 * 运行：node scripts/test-render.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.dsh-test-render');
const entry = path.join(outDir, 'entry.jsx');
const outFile = path.join(outDir, 'bundle.mjs');

// 版本号唯一来源：package.json（与 Vite 的 __APP_VERSION__ 保持一致，避免测试里写死版本）
const APP_VERSION = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

writeFileSync(
  entry,
  `
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../../src/App.jsx';
import Today from '../../src/pages/Today.jsx';
import Stats from '../../src/pages/Stats.jsx';
import Profile from '../../src/pages/Profile.jsx';
import BackfillSheet from '../../src/components/BackfillSheet.jsx';
import { TASKS, TASK_TOTAL } from '../../src/data/tasks.js';

export const render = (C, props) => renderToString(React.createElement(C, props));
export { App, Today, Stats, Profile, BackfillSheet, TASKS, TASK_TOTAL };
`
);

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  // 与 Vite 的 @vitejs/plugin-react 保持一致：使用自动 JSX 运行时
  jsx: 'automatic',
  // node_modules 里的包交给 node 自身解析，避免把 CJS 的 react-dom/server 打进 ESM
  packages: 'external',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  logLevel: 'silent',
});

// ---- 浏览器环境桩 ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = globalThis;
globalThis.document = { documentElement: { dataset: {} }, querySelector: () => null };

// 造一份有内容的真实数据，确保统计页各分支都被渲染到
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (days) => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + days);
const data = {};
for (let i = 0; i < 40; i += 1) {
  const filled = Array(7).fill(false);
  for (let k = 0; k <= i % 8; k += 1) filled[k] = k < 7;
  data[key(shift(-i))] = filled.slice(0, 7);
}
localStorage.setItem('checkinData', JSON.stringify(data));
localStorage.setItem('profile', JSON.stringify({ nickname: '小明', goal: '坚持 100 天', morningReminder: true, eveningReminder: false }));
localStorage.setItem(
  'weightRecords',
  JSON.stringify([
    { id: 'w1', timestamp: shift(-3).toISOString(), weightKg: 70.5, source: 'manual' },
    { id: 'w2', timestamp: shift(-1).toISOString(), weightKg: 70.1, source: 'manual' },
  ])
);

const warnings = [];
const origError = console.error;
console.error = (...args) => {
  warnings.push(args.map(String).join(' '));
};

const mod = await import(`file://${outFile.replace(/\\/g, '/')}`);
const noop = () => {};

const expectations = [
  ['App', mod.App, {}, ['喝水 2L', '今日进度']],
  ['Today', mod.Today, { showToast: noop }, ['连续打卡', '健身房训练', 'aria-pressed', '补打卡']],
  ['Stats', mod.Stats, { showToast: noop }, ['打卡日历', '最长连续', '本周（周一至周日）', '最近 7 天记录', '体重记录', '点击任意过去日期可直接补打卡']],
  ['Profile', mod.Profile, { showToast: noop }, ['外观', '跟随系统', APP_VERSION, '数据备份与恢复', 'OriginOS 7 液态玻璃']],
  ['BackfillSheet', mod.BackfillSheet, { initialDate: null, onClose: noop, onChanged: noop, showToast: noop },
    ['补打卡', '不能补未来', '其他日期', 'type="date"', 'aria-modal="true"']],
];

let failed = 0;
for (const [name, Comp, props, needles] of expectations) {
  try {
    // renderToString 会在相邻文本节点间插入 <!-- --> 注释，先剔除再断言
    const html = mod.render(Comp, props).replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(html.length > 500, `${name} 渲染结果过短`);
    for (const needle of needles) {
      assert.ok(html.includes(needle), `${name} 缺少「${needle}」`);
    }
    console.log(`  ok  ${name} 渲染正常（${html.length} 字符）`);
  } catch (err) {
    failed += 1;
    origError(`FAIL  ${name}: ${err.message}`);
  }
}

// 补打卡入口按键必须真的存在（今日页 + 统计页日历）
try {
  const todayHtml = mod.render(mod.Today, { showToast: noop, onBackfill: noop });
  assert.ok(todayHtml.includes('originos-action-pill'), '今日页缺少补打卡按键样式');
  assert.ok(/补打卡/.test(todayHtml), '今日页缺少补打卡文案');
  const statsHtml = mod.render(mod.Stats, { showToast: noop, onBackfill: noop });
  assert.ok(statsHtml.includes('点击任意过去日期可直接补打卡'), '统计页缺少补打卡提示');
  console.log('  ok  今日页/统计页的补打卡入口存在');
} catch (err) {
  failed += 1;
  origError(`FAIL  补打卡入口: ${err.message}`);
}

// 任务定义必须与 storage 的 TASK_COUNT(7) 一致，防止两边漂移
try {
  assert.equal(mod.TASKS.length, 7, 'TASKS 数量应为 7');
  assert.equal(mod.TASK_TOTAL, 7);
  assert.ok(mod.TASKS.every((t) => typeof t.Icon === 'function'), '每个任务都要有图标组件');
  console.log('  ok  TASKS 定义与 TASK_COUNT 一致（7 项）');
} catch (err) {
  failed += 1;
  origError(`FAIL  TASKS 定义: ${err.message}`);
}

// 深色主题偏好下必须能正常渲染
try {
  localStorage.setItem('themePreference', 'dark');
  mod.render(mod.Profile, { showToast: noop });
  localStorage.setItem('themePreference', 'light');
  mod.render(mod.Profile, { showToast: noop });
  console.log('  ok  深色/浅色偏好下渲染正常');
} catch (err) {
  failed += 1;
  console.error(`FAIL  主题偏好渲染: ${err.message}`);
}

console.error = origError;

// React 的 props/DOM 警告（排除 hydration 等与 SSR 无关的噪音）
const realWarnings = warnings.filter((w) => !/useLayoutEffect does nothing on the server/.test(w));
if (realWarnings.length) {
  failed += 1;
  console.error('\nReact 警告：');
  for (const w of realWarnings) console.error('  - ' + w.slice(0, 300));
}

console.log(failed ? `\n有 ${failed} 项失败` : '\n渲染冒烟测试全部通过');
process.exitCode = failed ? 1 : 0;
