import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { randomUUID, randomBytes } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

import authRoutes from './routes/auth.js'
import { initializeDatabase, getDatabase } from './utils/database.js'
import { getAppVersion, getStoredVersion, getRemoteVersion } from './utils/version.js'

import questionsRoutes from './routes/questions.js'
import practiceRoutes from './routes/practice.js'
import banksRoutes from './routes/banks.js'
import favoritesRoutes from './routes/favorites.js'
import notesRoutes from './routes/notes.js'
import statsRoutes from './routes/stats.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_ADMIN = {
  username: 'admin',
  password: process.env.ADMIN_PASSWORD || randomBytes(8).toString('hex'),
  email: 'admin@example.com'
}

const APP_VERSION = getAppVersion()

async function createDefaultAdmin(): Promise<void> {
  const db = getDatabase()

  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(DEFAULT_ADMIN.username)
  if (existingAdmin) {
    console.log('✅ 管理员账户已存在:', DEFAULT_ADMIN.username)
    return
  }

  try {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10)
    const adminId = randomUUID()

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(adminId, DEFAULT_ADMIN.username, DEFAULT_ADMIN.email, passwordHash)

    console.log('✅ 默认管理员账户已创建:')
    console.log('   用户名:', DEFAULT_ADMIN.username)
    console.log('   密码:', DEFAULT_ADMIN.password)
  } catch (error) {
    console.error('创建管理员失败:', error)
  }
}

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const dataDir = join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const uploadsDir = join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

app.use('/api/auth', authRoutes)
app.use('/api/questions', questionsRoutes)
app.use('/api/practice', practiceRoutes)
app.use('/api/banks', banksRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/stats', statsRoutes)

app.get('/api/version', (_req: Request, res: Response) => {
  res.json({
    success: true,
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  })
})

const publicDir = join(__dirname, '../public')
if (process.env.NODE_ENV === 'production' && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir))
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(join(publicDir, 'index.html'))
  })
} else {
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: '接口不存在' })
  })
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('服务器错误:', err)
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

async function startServer(): Promise<void> {
  try {
    await initializeDatabase()
    console.log('数据库初始化完成')

    await createDefaultAdmin()

    app.listen(PORT, () => {
      console.log('========================================')
      console.log('🚀 学习助手后端服务')
      console.log('📦 版本:', APP_VERSION)
      console.log('📍 地址:', `http://localhost:${PORT}`)
      console.log('📚 健康检查:', `http://localhost:${PORT}/api/health`)
      console.log('📋 版本查询:', `http://localhost:${PORT}/api/version`)
      console.log('========================================')
    })
  } catch (error) {
    console.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()
