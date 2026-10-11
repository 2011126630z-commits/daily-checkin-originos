import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import { initTheme } from './theme'

// 主题在渲染前落地（index.html 的内联脚本已提前设置 data-theme）
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA：仅在生产构建注册 Service Worker（开发环境不注册，避免缓存干扰热更新）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        /* 注册失败（如非 HTTPS）不影响应用本身 */
      })
  })
}
