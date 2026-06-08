import { ref, onMounted, onUnmounted, readonly } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import api from '@/api'

// 前端版本号（由 Vite 编译时注入）
const frontendVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'

// 远程版本配置（从环境变量或默认配置）
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || ''
const GITHUB_API_BASE = 'https://api.github.com'

const backendVersion = ref<string>('')
const remoteVersion = ref<string>('')
const isCheckingUpdate = ref(false)
const hasNewVersion = ref(false)
const lastCheckTime = ref<number>(0)
const checkStatus = ref<string>('')

let checkInterval: ReturnType<typeof setInterval> | null = null

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) {
    console.log('📦 Service Worker 已注册:', r)
    r && setInterval(() => r.update(), 60 * 60 * 1000)
  },
  onRegisterError(error) {
    console.error('❌ Service Worker 注册失败:', error)
  },
  onNeedRefresh() {
    console.log('🔄 发现新版本，需要刷新')
    hasNewVersion.value = true
    showUpdateNotice()
  },
  onOfflineReady() {
    console.log('📱 应用已准备好离线使用')
  }
})

// ─────────────────────────────────────────────
// 版本比较工具函数
// ─────────────────────────────────────────────
function parseVersion(version: string): number[] {
  return version.replace(/^v/, '').split('.').map(Number)
}

function compareVersion(v1: string, v2: string): number {
  const p1 = parseVersion(v1)
  const p2 = parseVersion(v2)
  
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

// ─────────────────────────────────────────────
// 后端版本检测
// ─────────────────────────────────────────────
async function getBackendVersion(): Promise<string> {
  try {
    const res = await api.get('/api/version')
    return (res.data as any)?.version || 'unknown'
  } catch (error) {
    console.error('获取后端版本失败:', error)
    return 'unknown'
  }
}

async function checkBackendVersion(): Promise<boolean> {
  if (isCheckingUpdate.value) return false
  
  isCheckingUpdate.value = true
  checkStatus.value = 'checking-backend'
  lastCheckTime.value = Date.now()
  
  try {
    const newBackendVersion = await getBackendVersion()
    
    if (backendVersion.value && newBackendVersion !== backendVersion.value && newBackendVersion !== 'unknown') {
      console.log(`🔄 后端版本更新: ${backendVersion.value} -> ${newBackendVersion}`)
      hasNewVersion.value = true
      backendVersion.value = newBackendVersion
      return true
    }
    
    if (!backendVersion.value && newBackendVersion !== 'unknown') {
      backendVersion.value = newBackendVersion
    }
    
    checkStatus.value = 'backend-checked'
    return false
  } finally {
    isCheckingUpdate.value = false
  }
}

// ─────────────────────────────────────────────
// GitHub Release 远程版本检测
// ─────────────────────────────────────────────
async function getRemoteVersion(): Promise<string> {
  if (!GITHUB_REPO) {
    console.log('未配置 GitHub 仓库，跳过远程版本检测')
    return 'unknown'
  }
  
  try {
    const [owner, repo] = GITHUB_REPO.split('/')
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/latest`
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
    
    if (!res.ok) {
      console.warn('获取远程版本失败:', res.statusText)
      return 'unknown'
    }
    
    const data = await res.json()
    return data.tag_name || data.name || 'unknown'
  } catch (error) {
    console.error('获取远程版本失败:', error)
    return 'unknown'
  }
}

async function checkRemoteVersion(): Promise<boolean> {
  if (isCheckingUpdate.value || !GITHUB_REPO) return false
  
  isCheckingUpdate.value = true
  checkStatus.value = 'checking-remote'
  
  try {
    const newRemoteVersion = await getRemoteVersion()
    
    if (newRemoteVersion === 'unknown') {
      checkStatus.value = 'remote-unknown'
      return false
    }
    
    remoteVersion.value = newRemoteVersion.replace(/^v/, '')
    
    // 比较远程版本与当前前端版本
    const cmp = compareVersion(remoteVersion.value, frontendVersion)
    if (cmp > 0) {
      console.log(`🔄 发现远程新版本: ${frontendVersion} -> ${remoteVersion.value}`)
      hasNewVersion.value = true
      showRemoteUpdateNotice(remoteVersion.value)
      return true
    }
    
    checkStatus.value = 'remote-checked'
    return false
  } finally {
    isCheckingUpdate.value = false
  }
}

// ─────────────────────────────────────────────
// 更新提示
// ─────────────────────────────────────────────
function showUpdateNotice() {
  ElMessageBox.confirm(
    '检测到新版本，是否立即刷新页面？',
    '版本更新',
    {
      confirmButtonText: '立即刷新',
      cancelButtonText: '稍后刷新',
      type: 'info',
      showClose: false
    }
  ).then(() => {
    handleUpdate()
  }).catch(() => {
    ElMessage.info('可以稍后手动刷新页面获取更新')
  })
}

function showRemoteUpdateNotice(remoteVer: string) {
  ElMessageBox.confirm(
    `发现新版本 v${remoteVer}，是否立即刷新页面获取更新？`,
    '远程版本更新',
    {
      confirmButtonText: '立即更新',
      cancelButtonText: '稍后',
      type: 'success',
      showClose: false
    }
  ).then(() => {
    handleUpdate()
  }).catch(() => {
    ElMessage.info('新版本将在下次启动时自动应用')
  })
}

async function handleUpdate() {
  if (needRefresh.value) {
    await updateServiceWorker(true)
  }
  window.location.reload()
}

// ─────────────────────────────────────────────
// 版本检查调度
// ─────────────────────────────────────────────
function startVersionCheck(intervalMs: number = 5 * 60 * 1000) {
  if (checkInterval) return
  
  // 立即检查
  checkBackendVersion()
  if (GITHUB_REPO) {
    checkRemoteVersion()
  }
  
  // 定时检查
  checkInterval = setInterval(() => {
    checkBackendVersion()
    if (GITHUB_REPO) {
      checkRemoteVersion()
    }
  }, intervalMs)
}

function stopVersionCheck() {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

// ─────────────────────────────────────────────
// 组合式函数
// ─────────────────────────────────────────────
export function useVersion() {
  onMounted(() => {
    startVersionCheck()
  })
  
  onUnmounted(() => {
    stopVersionCheck()
  })
  
  return {
    frontendVersion,
    backendVersion: readonly(backendVersion),
    remoteVersion: readonly(remoteVersion),
    isCheckingUpdate: readonly(isCheckingUpdate),
    hasNewVersion: readonly(hasNewVersion),
    lastCheckTime: readonly(lastCheckTime),
    checkStatus: readonly(checkStatus),
    needRefresh,
    checkBackendVersion,
    checkRemoteVersion,
    handleUpdate,
    startVersionCheck,
    stopVersionCheck
  }
}

export {
  frontendVersion,
  backendVersion,
  remoteVersion,
  isCheckingUpdate,
  hasNewVersion,
  needRefresh,
  checkBackendVersion,
  checkRemoteVersion,
  handleUpdate,
  startVersionCheck,
  stopVersionCheck,
  compareVersion
}
