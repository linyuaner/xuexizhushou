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

function checkAuthStatus(): void {
  const token = localStorage.getItem('token')
  if (token) {
    api.get('/auth/me').catch(() => {})
  }
}

setInterval(checkAuthStatus, 30 * 60 * 1000)

app.mount('#app')
