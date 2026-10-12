# 日常打卡 App - Daily Checkin

> OriginOS 7 inspired daily habit tracking app with liquid glass UI（含深色模式与 PWA）

![Version](https://img.shields.io/badge/version-1.1.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎨 Design

This app features a **Vivo OriginOS 7** inspired design:

- **雾面灰蓝液态玻璃** (Matte Grey-Blue Liquid Glass)
- **深色模式石墨蓝黑玻璃** (Graphite Glass Dark Mode)
- **克制、高级、真实手机系统感**
- **OriginOS 7 系统组件风格**

### Color Palette

浅色（Light）：

- **Background**: `#E9EDF4` → `#DDE3EE` → `#E7EBF3`
- **Primary Blue**: `#315EFB` (vivo blue)
- **Glass Cards**: `rgba(255, 255, 255, 0.35-0.45)` with blur and white highlights
- **Text**: Dark grey `#2D3748` and light grey `#718096`

深色（Dark）：

- **Background**: `#12151C` → `#0D1015` → `#171C26`
- **Primary Blue**: `#5B83FF`（深色底上提高亮度，保证对比度）
- **Glass Cards**: `rgba(255, 255, 255, 0.06-0.09)` + 白色 10-16% 边框高光
- **Text**: `#E8ECF4` / `#98A2B3`

> 两套配色共用同一组 CSS 变量（Design Tokens），组件里没有任何硬编码颜色。
> 主题由 `<html data-theme="system|light|dark">` 控制，`system` 跟随系统 `prefers-color-scheme`。

### 应用图标

概念：**进度环 + 对勾**（每日打卡 / 连续完成），雾面灰蓝玻璃底 + vivo 蓝主体。

- 全套 35 个文件由 [scripts/gen-icons.py](scripts/gen-icons.py) 一键生成（Pillow，1024 逻辑画布 + 4x 超采样）
- 覆盖：PWA 4 张（192/512/maskable/apple-touch）、安卓传统 launcher 圆角+圆形各 5 档、
  自适应图标前景/背景各 5 档、11 张 splash 启动图
- 尺寸约束：自适应前景实心主体落在中心 **66dp 安全区**内（半边长 ≤ 0.3056×画布）

```bash
python scripts/gen-icons.py   # 需要 Pillow，重新生成全部图标
```

### Key Features

- **Liquid Glass Cards**: Realistic glass effect with backdrop blur, white highlights, and soft shadows
- **Docked Bottom Navigation**: OriginOS-style bottom navigation, pinned to the screen edge
- **Dark Mode**: 跟随系统 / 手动浅色 / 手动深色，首帧不闪白
- **Minimalist Design**: Clean, restrained, premium feel
- **Smooth Animations**: 0.3-0.5s animations with hardware acceleration
- **Responsive Mobile-First**: Optimized for 390×844 iPhone display

## ✨ Features

### Today Page (今日页)

默认 7 个任务，**可以在「我的 → 任务设置」里自由增删改、排序**（最多 12 个）：

1. 💧 喝水 2L
2. 🏋️ 健身房训练
3. 🍗 吃够蛋白质
4. 🥬 吃蔬菜
5. 📚 背单词 30 个
6. 📖 复习数学 1 小时
7. 🌙 早睡 23:00 前

**Interaction**:

- Tap circle → elastic checkmark animation
- Task strikethrough
- Toast notification
- Progress bar updates
- 连续打卡天数 + 历史最长连续
- **跨零点自动刷新**：应用长期挂着也会在零点自动切到新的一天（并监听切回前台）
- localStorage persistence

### 补打卡（Backfill）

漏打某天不用重来——今日页右上角有**专门的「补打卡」按键**：

- 点开后弹出底部面板，可快捷选**最近 14 天**（每格显示星期 / 日期 / 已完成项数），
  也能用日期选择器挑更早的日期
- 面板里直接勾选当天完成的 7 项任务，**改一项立刻保存**，无需确认
- **不能补未来**：选到明天及以后会提示「不能补未来的日期」并保持原选择
- 补记的数据与当天打卡完全同构（同一份 `checkinData`），所以
  连续天数、最长连续、月历热力图、周同比都会立即跟着更新
- 第二个入口：统计页的月历热力图，**点击任意过去日期**也会打开同一个面板

> 数据口径：补打卡不会给记录加「补」标记，统计上与当天打卡一视同仁。
> 如果需要区分（比如统计里排除补记天数），需要扩展 `checkinData` 的结构。

### Stats Page (统计页)

- **Weekly Bar Chart**: 本周（周一至周日）真实数据，含「上周同期」对比
- **Month Calendar Heatmap**: 本月日历热力图，按完成度分 5 级着色，**点击过去日期可直接补打卡**
- **Streak Cards**: 当前连续 / 最长连续
- **Monthly Completion Rate**: Ring chart
- **Recent 7 Days**: Timeline view
- **Weight Records**: 体重记录、趋势图、单位 kg/斤、导入导出

### Profile Page (我的页)

- Edit nickname
- Edit daily goal
- **任务设置**：任务增删改、上下排序、12 种图标可选、一键恢复默认
- **外观切换**：跟随系统 / 浅色 / 深色，切换时以按钮为圆心做**圆形扩散过渡**（View Transitions API，不支持时自动降级为全局颜色渐变，并遵守 `prefers-reduced-motion`）
- Two reminder toggles (morning/evening)
- Backup export / restore（恢复时逐字段校验，脏数据会被丢弃并提示）
- All saved to localStorage

## 📲 PWA (可安装 / 离线)

- `public/manifest.webmanifest`：standalone 显示模式、四种尺寸图标（含 maskable）
- `public/sw.js`：应用外壳预缓存；导航请求网络优先、离线回退；静态资源缓存优先 + 后台更新
- 仅在生产构建注册 Service Worker（开发环境不注册，避免干扰 HMR）
- 手机浏览器「添加到主屏幕」后可全屏打开，断网也能使用（数据本来就在本地）

发布新版本后如需强制刷新缓存，改 `public/sw.js` 里的 `CACHE_VERSION` 即可。

## 📱 安卓 APK

手机安装包由 GitHub Actions 自动构建，**两个下载入口**：

1. **仓库里直接取**（跟着代码一起 clone / pull）：
   [`apk/daily-checkin-vX.Y.Z.apk`](https://github.com/2011126630z-commits/daily-checkin-originos/tree/main/apk)
2. **Release 附件**：<https://github.com/2011126630z-commits/daily-checkin-originos/releases/latest>

打 `v*` 标签后，CI 会同时把 APK 作为 Release 附件上传，并提交到仓库的 `apk/` 目录。

安装步骤：

1. 打开上面任一入口，下载 `.apk`
2. 系统提示「禁止安装未知应用」时，允许该浏览器安装
3. 安装后打开即可用，**完全离线**（网页资源已打进 APK，数据存在手机本地）

实现方式：[Capacitor 8](https://capacitorjs.com/) 把 `dist/` 打包进原生 WebView 壳，
`appId = com.dailycheckin.originos`，`minSdk 24`（Android 7.0+）。

本地自己出包（需要 JDK **21** 与 Android SDK，compileSdk 36 / build-tools 36.0.0）：

```bash
npm run build:app      # 用根路径打包网页（Capacitor 从 https://localhost/ 提供资源）
npx cap sync android   # 同步到 android/ 工程
cd android
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

> 工作流里 `main` 分支的改动也会构建 APK 并作为 artifact 上传（不创建 Release），
> 打 `v*` 标签才会发布到 Release。
>
> 说明：发布的是 **debug 签名** 的 APK，可以正常安装使用；如果以后要上架应用商店，
> 需要另外配置 release keystore 与 `signingConfigs`。

## 🛠 Tech Stack

- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS** - Styling（关键色值统一走 CSS 变量）
- **localStorage** - Data persistence
- **SVG** - Custom charts & icons (no external libraries)
- **Service Worker** - Offline support

## 📱 Device Support

- iPhone 12/13/14/15 (390×844)
- Android 12+ (similar aspect ratio)
- Mobile-first responsive design

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run logic + render tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
daily-checkin-originos/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Navigation.jsx
│   │   ├── Toast.jsx
│   │   ├── WeightCard.jsx
│   │   └── icons.jsx
│   ├── hooks/               # Custom hooks
│   │   ├── useToday.js      # 跨零点日期刷新
│   │   └── useTheme.js      # 主题偏好订阅
│   ├── pages/               # Page components
│   │   ├── Today.jsx
│   │   ├── Stats.jsx
│   │   └── Profile.jsx
│   ├── storage/             # localStorage utilities
│   │   ├── storage.js
│   │   └── weight.js
│   ├── styles/
│   │   └── global.css       # Design tokens + 深色模式 + 动画
│   ├── theme.js             # 主题读写与应用
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── icons/               # PWA 图标（192/512/maskable/apple-touch）
│   ├── manifest.webmanifest
│   └── sw.js
├── scripts/
│   ├── gen-icons.py         # 用 Pillow 重新生成 PWA 图标
│   ├── test-storage.mjs     # 存储层逻辑测试（15 项）
│   └── test-render.mjs      # 所有页面 SSR 渲染冒烟测试
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## 🧪 Testing

```bash
npm test
```

- `scripts/test-storage.mjs`：用 esbuild 打包 `src/storage/*` 后在 Node 下跑，覆盖日期校验、连续天数、
  月历偏移、周同比窗口对齐、备份导入清洗、统计口径等 15 个用例。
- `scripts/test-render.mjs`：用 `react-dom/server` 渲染 App 与三个页面，捕获运行时错误、缺失文案
  以及 React 的 props/DOM 警告（任何警告都会让测试失败）。

## 🚀 发布流程

代码托管在 [2011126630z-commits/daily-checkin-originos](https://github.com/2011126630z-commits/daily-checkin-originos)，
线上地址：<https://2011126630z-commits.github.io/daily-checkin-originos/>

**每发布一个版本：**

```bash
# 1. 改 package.json 里的 version（版本号是唯一来源，页面「我的」会自动显示）
# 2. 提交改动
git add -A && git commit -m "feat: v1.0.4 - ..."

# 3. 一键发布：校验仓库/工作区 → 跑测试 → 构建 → 推送到 GitHub
npm run release
```

`npm run release` 会依次做这些事：

1. 校验 `origin` 指向目标仓库、当前在 `main`、工作区干净（有未提交改动会直接中止）
2. 跑 `npm test` 与 `npm run build`，任一失败都不推送
3. `git push origin main`
4. 推送后自动打标签 `vX.Y.Z`，触发两个工作流：
   - `.github/workflows/deploy.yml`：`npm ci → npm test → build → 部署 GitHub Pages`
   - `.github/workflows/android.yml`：构建 APK → 挂到 Release 附件 + 提交进仓库 `apk/`

> 部署失败不会影响线上已发布的版本；可用 `gh run list --limit 3` 查看部署进度。

### 版本号唯一来源

**只改 `package.json` 的 `version`**，下面这些地方全部自动跟随，不会出现对不上的情况：

| 显示位置 | 取值来源 |
|---|---|
| 我的页「版本 vX.Y.Z」 | Vite `define` 注入 `package.json`（`vite.config.js`） |
| 安卓系统「应用信息 → 版本」 | `android/app/build.gradle` 读取 `package.json`（`versionName` / `versionCode`） |
| APK 文件名 `daily-checkin-vX.Y.Z.apk` | CI 读取 `package.json` |
| GitHub Release / 标签 `vX.Y.Z` | `scripts/release.mjs` 读取 `package.json` |
| README 版本徽章 | 手动同步（唯一的例外） |

App 名称「日常打卡」的三处也已统一：`capacitor.config.json` 的 `appName`、安卓 `strings.xml` 的
`app_name`（桌面图标名称）、网页 `<title>` 与 `apple-mobile-web-app-title`。

## 🎯 OriginOS Design Principles

### 1. Matte Grey-Blue Background
- No pure white background
- Subtle gradient layers
- Minimal noise texture (0.02-0.03 opacity)
- Low-opacity grid overlay

### 2. Liquid Glass Cards
- **Background**: 浅色 `rgba(255, 255, 255, 0.35)` / 深色 `rgba(255, 255, 255, 0.06)`
- **Backdrop Blur**: `blur(18px)`
- **Saturation**: `140%`
- **Border**: 1px solid（浅色白 60% / 深色白 10%）
- **Highlight**: inset 0 1px 0
- **Shadow**: 浅色 `rgba(120, 140, 170, 0.15)`；深色改为黑色阴影以保证层次

### 3. Vivo Blue Limitation
- **Allowed**: Checkmark, progress bar, chart highlights, active tab, switch on
- **Forbidden**: Large background areas, card fills, ordinary buttons
- **Other**: All grey/dark grey/semi-transparent grey
- 热力图用蓝色透明度分级表达完成度，避免整块蓝色

### 4. Docked Bottom Navigation
- **Height**: 52px + `env(safe-area-inset-bottom)`（自动避开手机手势条）
- **Position**: `fixed` 贴底停靠（`bottom: 0`），全宽，顶部 22px 圆角
- **Content**: 页面底部按 `84px + 安全区` 留白，内容从导航下方滚过
- **Background**: 浅色 `rgba(255, 255, 255, 0.82)` / 深色 `rgba(24, 28, 37, 0.92)`
- **Blur**: `20px`（独立合成层，避免 WebView 滚动抖动）
- **Active State**: 浅色 `rgba(49, 94, 251, 0.06)` / 深色 `rgba(91, 131, 255, 0.18)` with blue text

## 📊 Data Persistence

All data stored in localStorage:

```javascript
{
  "checkinData": {
    "2026-10-11": { "water": true, "protein": true, "veggie": true, "math": true }
  },
  "tasks": [
    { "id": "water", "title": "喝水 2L", "desc": "保持身体水分充足", "icon": "droplet" }
  ],
  "profile": {
    "nickname": "你的名字",
    "goal": "完成所有任务",
    "morningReminder": true,
    "eveningReminder": true
  },
  "weightRecords": [
    { "id": "w_xxx", "timestamp": "2026-10-11T08:00:00.000Z", "weightKg": 70.5, "source": "manual" }
  ],
  "weightUnit": "kg",
  "themePreference": "system"
}
```

- 打卡记录**按任务 id 保存**（不是按下标），所以任务的增删改排序都不会让历史记录错位；改名/改图标同样不影响。
- 旧版本的 `[true,false,...]` 数组格式会在读取时**自动迁移**成 id 映射，老用户无需手动处理。
- 删除任务时会同步清掉该任务的历史打卡，避免统计被多算。
- 备份/恢复覆盖 `checkinData` / `profile` / `weightRecords` / `weightUnit` / `tasks`（主题偏好属于设备级设置，不参与迁移）。
- 恢复时会逐字段校验：非法日期、非数组/非对象结构、超范围体重、错误类型都会被丢弃，并提示忽略了多少处。

## 🎨 Animations

- **Check-in**: `scale: 1 → 1.2 → 1` (0.3-0.5s)
- **Page Switch**: `fade` + `translateY(8px)` + `scale(0.98→1)` (0.35s ease-out)
- **Button Active**: `scale(0.97)`
- **Reduced Motion**: Respects `prefers-reduced-motion`

## 🤝 Contributing

This is a personal project demonstrating OriginOS design principles.

## 📝 License

MIT License - feel free to use for learning and reference.

## 🙏 Acknowledgments

- Design inspired by Vivo OriginOS 7
- UI components reference iOS design patterns
- Smooth animations inspired by modern mobile OSes

---

**Made with ❤️ for better daily habits**
