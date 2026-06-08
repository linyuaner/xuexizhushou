import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import type { User, UpdateProfileRequest, ApiResponse } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<User | null>(null)
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const avatar = computed(() => userInfo.value?.avatar || '')
  const username = computed(() => userInfo.value?.username || '')

  async function login(username: string, password: string): Promise<ApiResponse> {
    isLoading.value = true
    try {
      const res = await api.post<ApiResponse & { data: { token: string } }>('/auth/login', { username, password })
      token.value = res.data.token
      localStorage.setItem('token', res.data.token)
      await fetchUserInfo()
      ElMessage.success('登录成功')
      return res
    } catch (error) {
      const err = error as Error
      ElMessage.error(err.message || '登录失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function register(email: string, password: string, username: string): Promise<ApiResponse> {
    isLoading.value = true
    try {
      const res = await api.post<ApiResponse>('/auth/register', { email, password, username })
      ElMessage.success('注册成功，请登录')
      return res
    } catch (error) {
      const err = error as Error
      ElMessage.error(err.message || '注册失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    ElMessage.success('已退出登录')
  }

  async function fetchUserInfo(): Promise<void> {
    if (!token.value) return
    try {
      const res = await api.get<ApiResponse & { data: User }>('/auth/me')
      userInfo.value = res.data
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
  }

  async function updateUserInfo(data: UpdateProfileRequest): Promise<ApiResponse> {
    try {
      const res = await api.put<ApiResponse & { data: User }>('/auth/profile', data)
      userInfo.value = res.data
      ElMessage.success('更新成功')
      return res
    } catch (error) {
      ElMessage.error('更新失败')
      throw error
    }
  }

  async function init(): Promise<void> {
    if (token.value) {
      await fetchUserInfo()
    }
  }

  return {
    token,
    userInfo,
    isLoading,
    isLoggedIn,
    avatar,
    username,
    login,
    register,
    logout,
    fetchUserInfo,
    updateUserInfo,
    init
  }
})
