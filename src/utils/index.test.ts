import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatFileSize,
  debounce,
  throttle,
  generateId,
  deepClone,
  isValidEmail,
  checkPasswordStrength
} from './index'

describe('工具函数 - 格式化', () => {
  it('formatDate 应该正确格式化日期', () => {
    const date = new Date('2024-03-15T10:30:45')
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-03-15')
    expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-03-15 10:30:45')
  })

  it('formatDate 处理 null/undefined', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('invalid')).toBe('')
  })

  it('formatFileSize 正确格式化文件大小', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
  })
})

describe('工具函数 - ID生成', () => {
  it('generateId 应该生成唯一ID', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).toBeTruthy()
    expect(typeof id1).toBe('string')
    expect(id1).not.toBe(id2)
  })
})

describe('工具函数 - 深拷贝', () => {
  it('deepClone 应该正确深拷贝对象', () => {
    const obj = { a: 1, b: { c: 2 }, d: [1, 2, 3] }
    const cloned = deepClone(obj)

    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
    expect(cloned.b).not.toBe(obj.b)
    expect(cloned.d).not.toBe(obj.d)
  })

  it('deepClone 应该处理特殊值', () => {
    expect(deepClone(null)).toBeNull()
    expect(deepClone(undefined)).toBeUndefined()
    expect(deepClone(123)).toBe(123)
    expect(deepClone('test')).toBe('test')

    const date = new Date('2024-01-01')
    const clonedDate = deepClone(date)
    expect(clonedDate).toBeInstanceOf(Date)
    expect(clonedDate.getTime()).toBe(date.getTime())
  })
})

describe('工具函数 - 验证', () => {
  it('isValidEmail 应该正确验证邮箱', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('@invalid.com')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('checkPasswordStrength 应该正确验证密码强度', () => {
    expect(checkPasswordStrength('12345')).toEqual({ valid: false, message: '密码长度至少6位' })
    expect(checkPasswordStrength('123456')).toEqual({ valid: true, message: '' })
    expect(checkPasswordStrength('a'.repeat(21))).toEqual({ valid: false, message: '密码长度不能超过20位' })
    expect(checkPasswordStrength('test123')).toEqual({ valid: true, message: '' })
  })
})

describe('工具函数 - 防抖节流', () => {
  it('debounce 应该返回函数', () => {
    const fn = () => {}
    const debounced = debounce(fn, 100)
    expect(typeof debounced).toBe('function')
  })

  it('throttle 应该返回函数', () => {
    const fn = () => {}
    const throttled = throttle(fn, 100)
    expect(typeof throttled).toBe('function')
  })
})

describe('工具函数 - 数组处理', () => {
  it('题目选项洗牌应保持元素数量不变', () => {
    const shuffle = (arr: string[]): string[] => [...arr].sort(() => Math.random() - 0.5)
    const options = ['A', 'B', 'C', 'D']
    const shuffled = shuffle(options)
    expect(shuffled).toHaveLength(4)
    expect(shuffled).toEqual(expect.arrayContaining(options))
  })

  it('分页计算正确', () => {
    const calcPageCount = (total: number, pageSize: number): number => Math.ceil(total / pageSize)
    expect(calcPageCount(100, 10)).toBe(10)
    expect(calcPageCount(101, 10)).toBe(11)
    expect(calcPageCount(0, 10)).toBe(0)
  })
})
