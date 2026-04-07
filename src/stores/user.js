import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const isLoading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  const avatar = computed(() => userInfo.value?.avatar || '')
  const username = computed(() => userInfo.value?.username || '')

  // 登录
  async function login(username, password) {
    isLoading.value = true
    try {
      const res = await api.post('/auth/login', { username, password })
      token.value = res.data.token
      localStorage.setItem('token', res.data.token)
      await fetchUserInfo()
      ElMessage.success('登录成功')
      router.push('/home')
      return res
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  async function register(email, password, username) {
    isLoading.value = true
    try {
      const res = await api.post('/auth/register', { email, password, username })
      ElMessage.success('注册成功，请登录')
      router.push('/')
      return res
    } catch (error) {
      ElMessage.error(error.message || '注册失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    router.push('/')
    ElMessage.success('已退出登录')
  }

  // 获取用户信息
  async function fetchUserInfo() {
    if (!token.value) return
    try {
      const res = await api.get('/auth/me')
      userInfo.value = res.data
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
  }

  // 更新用户信息
  async function updateUserInfo(data) {
    try {
      const res = await api.put('/auth/profile', data)
      userInfo.value = res.data
      ElMessage.success('更新成功')
      return res
    } catch (error) {
      ElMessage.error('更新失败')
      throw error
    }
  }

  // 初始化 - 检查登录状态
  async function init() {
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