import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getDatabase } from '../utils/database.js'
import { generateToken, authenticateToken } from '../middleware/auth.js'
import type { User, LoginResponseData, ApiResponse, AuthenticatedRequest } from '../types/index.js'

const router = Router()
const db = getDatabase()

router.post('/register', async (_req: Request, res: Response<ApiResponse>) => {
  res.status(403).json({
    success: false,
    message: '注册功能已禁用，请联系管理员'
  })
})

router.post('/login', async (req: Request, res: Response<ApiResponse<LoginResponseData>>) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      })
    }

    const user = db.prepare('SELECT id, email, username, avatar_url, created_at, password_hash FROM users WHERE username = ?').get(username) as { id: string, email: string, username: string, avatar_url?: string, created_at: string, password_hash: string } | null
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    const token = generateToken(user.id, user.username)

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
          created_at: user.created_at
        },
        token
      },
      message: '登录成功'
    })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({
      success: false,
      message: '登录失败'
    })
  }
})

router.get('/me', authenticateToken, (req: Request, res: Response<ApiResponse<Partial<User>>>) => {
  try {
    const userId = req.user?.userId as string
    const user = db.prepare(
      'SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?'
    ).get(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    })
  }
})

router.put('/profile', authenticateToken, async (req: Request, res: Response<ApiResponse<Partial<User>>>) => {
  try {
    const { username, avatar_url } = req.body
    const userId = req.user?.userId as string

    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: string } | null
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const updates: string[] = []
    const values: any[] = []

    if (username) {
      updates.push('username = ?')
      values.push(username)
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?')
      values.push(avatar_url)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(userId)

      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    const user = db.prepare(
      'SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?'
    ).get(userId)

    res.json({
      success: true,
      data: user,
      message: '更新成功'
    })
  } catch (error) {
    console.error('更新用户信息失败:', error)
    res.status(500).json({
      success: false,
      message: '更新失败'
    })
  }
})

router.put('/password', authenticateToken, async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { oldPassword, newPassword } = req.body
    const userId = req.user?.userId as string

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请填写所有字段'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少6位'
      })
    }

    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId) as { id: string, password_hash: string } | null
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '原密码错误'
      })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newPasswordHash, userId)

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('修改密码失败:', error)
    res.status(500).json({
      success: false,
      message: '修改失败'
    })
  }
})

export default router
