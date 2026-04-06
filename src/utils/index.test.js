/**
 * 工具函数测试示例
 * 路径：src/utils/index.test.js
 *
 * 运行：npm test
 */

import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────────────────────
// 由于 src/utils/index.js 使用了 Element Plus 的 ElMessage
// 在纯单元测试中需要 mock，这里演示基础测试模式
// ──────────────────────────────────────────────────────

// 示例：测试纯函数（无副作用）
describe('工具函数 - 格式化', () => {
  it('格式化日期应返回正确字符串', () => {
    // 模拟一个纯日期格式化函数
    const formatDate = (isoStr) => {
      const d = new Date(isoStr)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    expect(formatDate('2024-03-15T10:00:00Z')).toBe('2024-03-15')
  })

  it('难度等级文本映射正确', () => {
    const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' }
    expect(difficultyMap['easy']).toBe('简单')
    expect(difficultyMap['hard']).toBe('困难')
    expect(difficultyMap['unknown']).toBeUndefined()
  })
})

describe('工具函数 - 数组处理', () => {
  it('题目选项洗牌应保持元素数量不变', () => {
    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)
    const options = ['A', 'B', 'C', 'D']
    const shuffled = shuffle(options)
    expect(shuffled).toHaveLength(4)
    expect(shuffled).toEqual(expect.arrayContaining(options))
  })

  it('分页计算正确', () => {
    const calcPageCount = (total, pageSize) => Math.ceil(total / pageSize)
    expect(calcPageCount(100, 10)).toBe(10)
    expect(calcPageCount(101, 10)).toBe(11)
    expect(calcPageCount(0, 10)).toBe(0)
  })
})
