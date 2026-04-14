import axios from 'axios'
import { ElMessage } from 'element-plus'

// 根据环境自动选择API地址
// 使用相对路径，配合Vite代理访问后端
const baseURL = '/api'

const instance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加 token
instance.interceptors.request.use(
  config => {
    // 每次请求时直接从 localStorage 读取 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
instance.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
        case 403:
          ElMessage.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error(data?.message || '请求失败')
      }
    } else {
      ElMessage.error('网络连接失败')
    }
    return Promise.reject(error)
  }
)

// API 方法封装
export default {
  // GET 请求
  get(url, params = {}) {
    return instance.get(url, { params })
  },

  // POST 请求
  post(url, data = {}) {
    return instance.post(url, data)
  },

  // PUT 请求
  put(url, data = {}) {
    return instance.put(url, data)
  },

  // DELETE 请求
  delete(url, data = {}) {
    return instance.delete(url, { data })
  },

  // 上传文件
  upload(url, formData) {
    return instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

// 导出实例，方便自定义配置
export { instance }