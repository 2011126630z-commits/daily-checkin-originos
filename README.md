# 日常打卡 App - Daily Checkin

> OriginOS 7 inspired daily habit tracking app with liquid glass UI

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎨 Design

This app features a **Vivo OriginOS 7** inspired design:

- **雾面灰蓝液态玻璃** (Matte Grey-Blue Liquid Glass)
- **克制、高级、真实手机系统感**
- **OriginOS 7 系统组件风格**

### Color Palette

- **Background**: `#E9EDF4` → `#DDE3EE` → `#E7EBF3`
- **Primary Blue**: `#315EFB` (vivo blue)
- **Glass Cards**: `rgba(255, 255, 255, 0.35-0.45)` with blur and white highlights
- **Text**: Dark grey `#2D3748` and light grey `#718096`

### Key Features

- **Liquid Glass Cards**: Realistic glass effect with backdrop blur, white highlights, and soft shadows
- **Floating Capsule Navigation**: OriginOS-style bottom navigation
- **Minimalist Design**: Clean, restrained, premium feel
- **Smooth Animations**: 0.3-0.5s animations with hardware acceleration
- **Responsive Mobile-First**: Optimized for 390×844 iPhone display

## ✨ Features

### Today Page (今日页)

7 fixed daily tasks:

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
- localStorage persistence

### Stats Page (统计页)

- **Weekly Bar Chart**: Real data from localStorage
- **Monthly Completion Rate**: Ring chart
- **Recent 7 Days**: Timeline view

### Profile Page (我的页)

- Edit nickname
- Edit daily goal
- Two reminder toggles (morning/evening)
- All saved to localStorage

## 🛠 Tech Stack

- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS** - Styling
- **localStorage** - Data persistence
- **SVG** - Custom charts (no external libraries)

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

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
daily-checkin-originos/
├── src/
│   ├── components/      # Reusable components
│   │   ├── Navigation.jsx
│   │   └── Toast.jsx
│   ├── pages/           # Page components
│   │   ├── Today.jsx
│   │   ├── Stats.jsx
│   │   └── Profile.jsx
│   ├── storage/         # localStorage utilities
│   │   └── storage.js
│   ├── styles/          # Global styles
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── public/
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## 🎯 OriginOS Design Principles

### 1. Matte Grey-Blue Background
- No pure white background
- Subtle gradient layers
- Minimal noise texture (0.03-0.05 opacity)
- Low-opacity grid overlay

### 2. Liquid Glass Cards
- **Background**: `rgba(255, 255, 255, 0.35-0.45)`
- **Backdrop Blur**: `blur(18px)`
- **Saturation**: `140%`
- **Border**: 1px solid rgba(255, 255, 255, 0.6)
- **Highlight**: inset 0 1px 0 rgba(255, 255, 255, 0.8)
- **Shadow**: `rgba(120, 140, 170, 0.15)` (no black shadows)

### 3. Vivo Blue Limitation
- **Allowed**: Checkmark, progress bar, chart highlights, active tab, switch on
- **Forbidden**: Large background areas, card fills, ordinary buttons
- **Other**: All grey/dark grey/semi-transparent grey

### 4. Floating Capsule Navigation
- **Height**: 52px
- **Padding**: 24px left/right, 20px bottom
- **Radius**: 30px
- **Background**: `rgba(255, 255, 255, 0.45)`
- **Blur**: `20px`
- **Active State**: `rgba(49, 94, 251, 0.06)` with blue text

## 📊 Data Persistence

All data stored in localStorage:

```javascript
{
  "checkinData": {
    "2026-10-11": [true, false, true, true, false, true, false]
  },
  "profile": {
    "nickname": "你的名字",
    "goal": "完成所有任务",
    "morningReminder": true,
    "eveningReminder": true
  }
}
```

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
