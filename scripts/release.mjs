/**
 * 一键发布：把当前已提交的版本上传到 GitHub（推送 main 会自动触发 Pages 部署）
 *
 * 用法：
 *   npm run release
 *
 * 步骤：
 *   1. 校验 origin 指向目标仓库、工作区必须干净（有未提交改动会中止）
 *   2. 跑测试 + 生产构建
 *   3. push origin main
 *   4. 打印 Actions / Pages 地址
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXPECTED_REPO = 'github.com/2011126630z-commits/daily-checkin-originos';
const PAGES_URL = 'https://2011126630z-commits.github.io/daily-checkin-originos/';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: false, ...opts });

const capture = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

// ---- 1. 环境校验 ----
const remote = capture('git', ['remote', 'get-url', 'origin']);
if (!remote.ok) fail('未配置 origin 远程仓库');
if (!remote.out.includes(EXPECTED_REPO)) {
  fail(`origin 指向的不是目标仓库：\n  当前: ${remote.out}\n  期望: ${EXPECTED_REPO}`);
}

const status = capture('git', ['status', '--porcelain']);
if (!status.ok) fail('无法读取 git 状态');
if (status.out) {
  console.error('\n工作区有未提交的改动，请先提交（或 stash）后再发布：\n');
  console.error(status.out);
  process.exit(1);
}

const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out;
if (branch !== 'main') fail(`当前分支是 ${branch}，发布需要切到 main`);

const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const head = capture('git', ['rev-parse', '--short', 'HEAD']).out;
console.log(`\n准备发布 v${version} (${head}) → ${branch}\n`);

// ---- 2. 测试 + 构建 ----
console.log('▶ 运行测试');
if (run('npm', ['test']).status !== 0) fail('测试未通过，已中止发布');

console.log('\n▶ 生产构建');
if (run('npm', ['run', 'build']).status !== 0) fail('构建失败，已中止发布');

// ---- 3. 推送 ----
console.log('\n▶ 推送到 GitHub');
if (run('git', ['push', 'origin', 'main']).status !== 0) fail('推送失败');

// ---- 4. 结果 ----
console.log(`\n✓ v${version} 已上传：https://github.com/2011126630z-commits/daily-checkin-originos`);
console.log(`  GitHub Actions 会自动构建并部署到：${PAGES_URL}`);
console.log('  查看部署进度：gh run list --limit 3\n');
