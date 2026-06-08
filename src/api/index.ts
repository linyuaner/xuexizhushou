import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/user'

const baseURL = '/api'

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
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

interface ApiClient {
  get<T = ApiResponse>(url: string, params?: Record<string, unknown>): Promise<T>
  post<T = ApiResponse>(url: string, data?: unknown): Promise<T>
  put<T = ApiResponse>(url: string, data?: unknown): Promise<T>
  delete<T = ApiResponse>(url: string, data?: unknown): Promise<T>
  upload(url: string, formData: FormData, onProgress?: (percent: number) => void): Promise<unknown>
}

const api: ApiClient = {
  get<T = ApiResponse>(url: string, params: Record<string, unknown> = {}): Promise<T> {
    return instance.get(url, { params }) as Promise<T>
  },

  post<T = ApiResponse>(url: string, data: unknown = {}): Promise<T> {
    return instance.post(url, data) as Promise<T>
  },

  put<T = ApiResponse>(url: string, data: unknown = {}): Promise<T> {
    return instance.put(url, data) as Promise<T>
  },

  delete<T = ApiResponse>(url: string, data: unknown = {}): Promise<T> {
    return instance.delete(url, { data }) as Promise<T>
  },

  upload(url: string, formData: FormData, onProgress?: (percent: number) => void): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const token = localStorage.getItem('token')

      xhr.open('POST', `/api${url}`, true)

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      const progressHandler = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total)
          console.log('XHR上传进度:', percentCompleted, '%')
          if (onProgress) {
            setTimeout(() => {
              onProgress(percentCompleted)
            }, 0)
          }
        }
      }

      xhr.upload.addEventListener('progress', progressHandler)

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch {
            resolve(xhr.responseText)
          }
        } else {
          reject(new Error(`上传失败: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'))
      })

      xhr.timeout = 300000
      xhr.addEventListener('timeout', () => {
        reject(new Error('上传超时'))
      })

      console.log('开始发送上传请求')
      xhr.send(formData)
    })
  }
}

export default api
export { instance }
