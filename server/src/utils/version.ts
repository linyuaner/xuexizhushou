import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const VERSION_FILE = join(__dirname, '../../VERSION')
const APP_VERSION_FILE = join(__dirname, '../../data/.app_version')
const UPDATE_LOG_FILE = join(__dirname, '../../data/update.log')

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_REPO = process.env.GITHUB_REPO || ''

export function getAppVersion(): string {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return fs.readFileSync(VERSION_FILE, 'utf-8').trim()
    }
  } catch {
    // 忽略错误
  }
  try {
    const pkgFile = join(__dirname, '../../package.json')
    if (fs.existsSync(pkgFile)) {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'))
      return pkg.version || '1.0.0'
    }
  } catch {
    // 忽略错误
  }
  return '1.0.0'
}

export function getStoredVersion(): string {
  try {
    if (fs.existsSync(APP_VERSION_FILE)) {
      return fs.readFileSync(APP_VERSION_FILE, 'utf-8').trim()
    }
  } catch {
    // 忽略错误
  }
  return 'none'
}

export function saveAppVersion(version: string): void {
  try {
    const dataDir = dirname(APP_VERSION_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    fs.writeFileSync(APP_VERSION_FILE, version)
    logUpdate(`保存应用版本: ${version}`)
  } catch (error) {
    console.error('保存版本文件失败:', error)
  }
}

export async function getRemoteVersion(): Promise<string> {
  if (!GITHUB_REPO) {
    console.log('未配置 GITHUB_REPO，跳过远程版本检测')
    return 'unknown'
  }

  try {
    const [owner, repo] = GITHUB_REPO.split('/')
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/latest`

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Study-Helper-Version-Checker'
      }
    })

    if (!res.ok) {
      console.warn('获取远程版本失败:', res.statusText)
      return 'unknown'
    }

    const data = await res.json() as { tag_name?: string; name?: string }
    const version = (data.tag_name || data.name || 'unknown').replace(/^v/, '')
    
    logUpdate(`远程版本: ${version}`)
    return version
  } catch (error) {
    console.error('获取远程版本失败:', error)
    return 'unknown'
  }
}

function compareVersion(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map(Number)
  const p2 = v2.replace(/^v/, '').split('.').map(Number)

  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

export async function checkForUpdates(): Promise<{
  hasUpdate: boolean
  currentVersion: string
  remoteVersion: string
  storedVersion: string
}> {
  const currentVersion = getAppVersion()
  const storedVersion = getStoredVersion()
  const remoteVersion = await getRemoteVersion()

  const hasUpdate = remoteVersion !== 'unknown' &&
    compareVersion(remoteVersion, currentVersion) > 0

  return {
    hasUpdate,
    currentVersion,
    remoteVersion,
    storedVersion
  }
}

function logUpdate(message: string): void {
  try {
    const dataDir = dirname(UPDATE_LOG_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`
    fs.appendFileSync(UPDATE_LOG_FILE, logEntry)
  } catch {
    // 忽略日志写入错误
  }
}

export default {
  getAppVersion,
  getStoredVersion,
  saveAppVersion,
  getRemoteVersion,
  checkForUpdates
}
