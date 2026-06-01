import axios from 'axios'
import { ElMessage } from 'element-plus'

// 根据环境自动选择API地址
// 使用相对路径，配合Vite代理访问后端
const baseURL = '/api'

const instance = axios.create({
  baseURL,
  timeout: 300000, // 5分钟超时，适合大文件上传
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
  upload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // 添加 token
      const token = localStorage.getItem('token')
      
      xhr.open('POST', `/api${url}`, true)
      
      // 设置请求头
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }
      
      // 监听上传进度
      const progressHandler = (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total)
          console.log('XHR上传进度:', percentCompleted, '%')
          if (onProgress) {
            // 确保在主线程中更新进度
            setTimeout(() => {
              onProgress(percentCompleted)
            }, 0)
          }
        }
      }
      
      xhr.upload.addEventListener('progress', progressHandler)
      
      // 监听完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (e) {
            resolve(xhr.responseText)
          }
        } else {
          reject(new Error(`上传失败: ${xhr.status}`))
        }
      })
      
      // 监听错误
      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'))
      })
      
      // 监听超时
      xhr.timeout = 300000 // 5分钟
      xhr.addEventListener('timeout', () => {
        reject(new Error('上传超时'))
      })
      
      // 发送请求
      console.log('开始发送上传请求')
      xhr.send(formData)
    })
  }
}

// 导出实例，方便自定义配置
export { instance }