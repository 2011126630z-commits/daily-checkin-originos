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
 *   4. 打并推送标签 vX.Y.Z（触发 APK 构建 → Release 附件 + 提交进 apk/）
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXPECTED_REPO = 'github.com/2011126630z-commits/daily-checkin-originos';
const PAGES_URL = 'https://2011126630z-commits.github.io/daily-checkin-originos/';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const isWin = process.platform === 'win32';

// git 直接可执行，必须 shell:false —— 否则 Windows 的 cmd 会把 `-m "release v1.0.4"`
// 这类带空格的参数拆开，导致 git tag 报错
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: false, ...opts });

// Windows 上 npm 是 npm.cmd，必须经过 shell 才能启动
const runNpm = (args) => run('npm', args, { shell: isWin });

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
if (runNpm(['test']).status !== 0) fail('测试未通过，已中止发布');

console.log('\n▶ 生产构建');
if (runNpm(['run', 'build']).status !== 0) fail('构建失败，已中止发布');

// ---- 3. 推送 ----
console.log('\n▶ 推送到 GitHub');
if (run('git', ['push', 'origin', 'main']).status !== 0) fail('推送失败');

// ---- 4. 打标签（触发 APK 构建并挂到 Release） ----
const tag = `v${version}`;
if (capture('git', ['tag', '-l', tag]).out) {
  console.log(`\nℹ 标签 ${tag} 已存在，跳过打标签`);
} else {
  console.log(`\n▶ 打标签 ${tag}`);
  if (run('git', ['tag', '-a', tag, '-m', `release ${tag}`]).status !== 0) fail('创建标签失败');
  if (run('git', ['push', 'origin', tag]).status !== 0) fail('推送标签失败');
}

// ---- 5. 结果 ----
console.log(`\n✓ v${version} 已上传：https://github.com/2011126630z-commits/daily-checkin-originos`);
console.log(`  · 网页版（Pages）自动部署：${PAGES_URL}`);
console.log(`  · 安卓 APK 构建完成后挂到：https://github.com/2011126630z-commits/daily-checkin-originos/releases/tag/${tag}`);
console.log('  查看进度：gh run list --limit 5\n');
