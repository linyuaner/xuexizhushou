import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import 'virtual:uno.css'
import api from './api'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 定时检查登录状态（30分钟检查一次）
function checkAuthStatus() {
  const token = localStorage.getItem('token')
  if (token) {
    // 尝试获取用户信息来验证token是否有效
    api.get('/auth/me')
      .catch(error => {
        // token无效时会被响应拦截器处理，自动跳转到登录页
      })
  }
}

// 启动定时检查
setInterval(checkAuthStatus, 30 * 60 * 1000) // 30分钟

app.mount('#app')
