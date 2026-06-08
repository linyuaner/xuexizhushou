export interface User {
  id: number
  username: string
  email: string
  avatar?: string
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface UpdateProfileRequest {
  username?: string
  email?: string
  avatar?: string
  currentPassword?: string
  newPassword?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: number
}
