import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface UserPayload {
  userId: string
  username: string
  role: string
  [key: string]: any
}

export interface DecodedToken {
  userId: string
  email?: string
  [key: string]: any
}

export interface AuthenticatedRequest extends Request {
  user: DecodedToken
}

export interface OptionalAuthRequest extends Request {
  user?: DecodedToken
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  total?: number
  page?: number
  totalPages?: number
}

export interface Database {
  prepare(sql: string): {
    get(...params: any[]): any
    all(...params: any[]): any[]
    run(...params: any[]): { changes: number; lastInsertRowid: any }
  }
  save(): void
  close(): void
}

export interface User {
  id: string
  email: string
  password_hash: string
  username: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface LoginResponseData {
  token: string
  user: {
    id: string
    email: string
    username: string
    avatar_url?: string
    created_at: string
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken
    }
  }
}

export type { Request, Response, NextFunction }
