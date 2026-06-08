import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import type { DecodedToken } from '../types/index.js'

const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex')

console.log('🔐 JWT密钥使用:', process.env.JWT_SECRET ? '环境变量' : '随机生成')
if (!process.env.JWT_SECRET) {
  console.log('⚠️  使用自动生成的JWT密钥，重启服务后会重新生成')
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): Response | void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '请先登录'
    })
  }

  try {
    const decoded = jwt.verify(token as any as string, JWT_SECRET) as DecodedToken
    req.user = decoded
    next()
  } catch (error) {
    const err = error as Error
    return res.status(403).json({
      success: false,
      message: 'Token已过期，请重新登录'
    })
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = jwt.verify(token as any as string, JWT_SECRET) as DecodedToken
      req.user = decoded
    } catch {
    }
  }

  next()
}

export function generateToken(userId: string, email?: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export default { authenticateToken, optionalAuth, generateToken }
