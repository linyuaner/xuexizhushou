export type DateFormatTemplate = 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' | 'YYYY/MM/DD' | 'HH:mm:ss'

export interface PasswordStrengthResult {
  valid: boolean
  message: string
}

export type DebounceFunction<T extends (...args: unknown[]) => unknown> = (...args: Parameters<T>) => void
export type ThrottleFunction<T extends (...args: unknown[]) => unknown> = (...args: Parameters<T>) => void
