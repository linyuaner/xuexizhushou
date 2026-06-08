import express from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import fs from 'fs'
import XLSX from 'xlsx'
import type { Request, Response } from 'express'
import { getDatabase } from '../utils/database.js'
import { authenticateToken, optionalAuth } from '../middleware/auth.js'

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/')
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const router = express.Router()
const db = getDatabase()

interface BankBody {
  name?: string
  description?: string
  is_public?: boolean
}

interface AddQuestionsBody {
  question_ids?: string[]
}

router.get('/', optionalAuth, (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (parseInt(String(page)) - 1) * parseInt(String(limit))
    const userId = req.user?.userId

    let whereClause = '(is_public = 1 OR user_id = ?)'
    const params: any[] = [userId || 'anonymous']

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM question_banks WHERE ${whereClause}
    `).get(...params)

    const banks = db.prepare(`
      SELECT qb.*, u.username as creator_name
      FROM question_banks qb
      LEFT JOIN users u ON qb.user_id = u.id
      WHERE ${whereClause}
      ORDER BY qb.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(String(limit)), offset)

    res.json({
      success: true,
      data: banks,
      total: countResult.total,
      page: parseInt(String(page)),
      totalPages: Math.ceil(countResult.total / parseInt(String(limit)))
    })
  } catch (error) {
    console.error('获取题库列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取题库列表失败'
    })
  }
})

router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    const bank = db.prepare(`
      SELECT qb.*, u.username as creator_name
      FROM question_banks qb
      LEFT JOIN users u ON qb.user_id = u.id
      WHERE qb.id = ? AND (qb.is_public = 1 OR qb.user_id = ?)
    `).get(id, userId || 'anonymous')

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      })
    }

    const questionCount = db.prepare(`
      SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?
    `).get(id)

    bank.question_count = questionCount.count

    res.json({
      success: true,
      data: bank
    })
  } catch (error) {
    console.error('获取题库详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取题库详情失败'
    })
  }
})

router.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const { name, description, is_public = false } = req.body as BankBody
    const userId = req.user!.userId

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '请输入题库名称'
      })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO question_banks (id, user_id, name, description, is_public)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, description || '', is_public ? 1 : 0)

    const bank = db.prepare(
      'SELECT id, user_id, name, description, question_count, is_public, created_at, updated_at FROM question_banks WHERE id = ?'
    ).get(id)

    res.status(201).json({
      success: true,
      data: bank,
      message: '题库创建成功'
    })
  } catch (error) {
    console.error('创建题库失败:', error)
    res.status(500).json({
      success: false,
      message: '创建题库失败'
    })
  }
})

router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, is_public } = req.body as BankBody
    const userId = req.user!.userId

    const bank = db.prepare('SELECT id FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId)

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      })
    }

    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description) }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0) }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE question_banks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    const updatedBank = db.prepare(
      'SELECT id, user_id, name, description, question_count, is_public, created_at, updated_at FROM question_banks WHERE id = ?'
    ).get(id)

    res.json({
      success: true,
      data: updatedBank,
      message: '题库更新成功'
    })
  } catch (error) {
    console.error('更新题库失败:', error)
    res.status(500).json({
      success: false,
      message: '更新题库失败'
    })
  }
})

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId

    const bank = db.prepare('SELECT id FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId)

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      })
    }

    const questions = db.prepare('SELECT question_id FROM bank_questions WHERE bank_id = ?').all(id)
    const questionIds = questions.map((q: any) => q.question_id)

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(',')
      db.prepare(`DELETE FROM user_answers WHERE question_id IN (${placeholders})`).run(...questionIds)
      db.prepare(`DELETE FROM user_favorites WHERE question_id IN (${placeholders})`).run(...questionIds)
      db.prepare(`DELETE FROM user_notes WHERE question_id IN (${placeholders})`).run(...questionIds)
      db.prepare(`DELETE FROM question_stats WHERE question_id IN (${placeholders})`).run(...questionIds)
      db.prepare(`DELETE FROM questions WHERE id IN (${placeholders})`).run(...questionIds)
    }

    db.prepare('DELETE FROM bank_questions WHERE bank_id = ?').run(id)
    db.prepare('DELETE FROM question_banks WHERE id = ?').run(id)

    res.json({
      success: true,
      message: '题库删除成功'
    })
  } catch (error) {
    console.error('删除题库失败:', error)
    res.status(500).json({
      success: false,
      message: '删除题库失败'
    })
  }
})

router.get('/:id/questions', optionalAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 20 } = req.query
    const offset = (parseInt(String(page)) - 1) * parseInt(String(limit))

    const bank = db.prepare(
      'SELECT id, user_id, name, description, question_count, is_public, created_at, updated_at FROM question_banks WHERE id = ?'
    ).get(id)
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      })
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM bank_questions WHERE bank_id = ?
    `).get(id)

    const questions = db.prepare(`
      SELECT q.*, c.name as category_name
      FROM questions q
      JOIN bank_questions bq ON q.id = bq.question_id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE bq.bank_id = ?
      ORDER BY bq.created_at
      LIMIT ? OFFSET ?
    `).all(id, parseInt(String(limit)), offset)
    console.log('查询到的题目数:', questions.length)

    const parsedQuestions = questions.map((q: any) => ({
      ...q,
      question: q.title,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      analysis: q.explanation,
      tags: q.tags ? JSON.parse(q.tags) : []
    }))

    res.json({
      success: true,
      data: parsedQuestions,
      total: countResult.total,
      page: parseInt(String(page)),
      totalPages: Math.ceil(countResult.total / parseInt(String(limit)))
    })
  } catch (error) {
    console.error('获取题库题目失败:', error)
    res.status(500).json({
      success: false,
      message: '获取题库题目失败'
    })
  }
})

router.get('/:id/categories', optionalAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const bank = db.prepare(
      'SELECT id, user_id, name, description, question_count, is_public, created_at, updated_at FROM question_banks WHERE id = ?'
    ).get(id)
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      })
    }

    const categories = db.prepare(`
      SELECT DISTINCT c.id, c.name, c.description
      FROM categories c
      JOIN questions q ON q.category_id = c.id
      JOIN bank_questions bq ON q.id = bq.question_id
      WHERE bq.bank_id = ? AND q.category_id IS NOT NULL
      ORDER BY c.name
    `).all(id)

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('获取题库分类失败:', error)
    res.status(500).json({
      success: false,
      message: '获取题库分类失败'
    })
  }
})

router.post('/:id/questions', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { question_ids } = req.body as AddQuestionsBody
    const userId = req.user!.userId

    const bank = db.prepare('SELECT id FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId)

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      })
    }

    if (!question_ids || !Array.isArray(question_ids)) {
      return res.status(400).json({
        success: false,
        message: '请提供题目ID列表'
      })
    }

    const insertStmt = db.prepare(`
      INSERT INTO bank_questions (id, bank_id, question_id)
      VALUES (?, ?, ?)
    `)

    for (const questionId of question_ids) {
      const existing = db.prepare(`
        SELECT id FROM bank_questions WHERE bank_id = ? AND question_id = ?
      `).get(id, questionId)

      if (!existing) {
        insertStmt.run(randomUUID(), id, questionId)
      }
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?')
      .get(id)
    db.prepare('UPDATE question_banks SET question_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(count.count, id)

    res.json({
      success: true,
      message: `成功添加 ${question_ids.length} 道题目到题库`
    })
  } catch (error) {
    console.error('添加题目到题库失败:', error)
    res.status(500).json({
      success: false,
      message: '添加题目失败'
    })
  }
})

router.delete('/:id/questions/:questionId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id, questionId } = req.params
    const userId = req.user!.userId

    const bank = db.prepare('SELECT id FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId)

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      })
    }

    db.prepare('DELETE FROM bank_questions WHERE bank_id = ? AND question_id = ?')
      .run(id, questionId)

    const count = db.prepare('SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?')
      .get(id)
    db.prepare('UPDATE question_banks SET question_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(count.count, id)

    res.json({
      success: true,
      message: '题目已从题库移除'
    })
  } catch (error) {
    console.error('移除题目失败:', error)
    res.status(500).json({
      success: false,
      message: '移除题目失败'
    })
  }
})

router.post('/:id/import', authenticateToken, upload.single('file'), (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId

    const bank = db.prepare('SELECT id, user_id, is_public FROM question_banks WHERE id = ?')
      .get(id)

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      })
    }

    if (bank.user_id !== userId && !bank.is_public) {
      return res.status(403).json({
        success: false,
        message: '无权限导入到此题库'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      })
    }

    const workbook = XLSX.readFile(req.file.path, { 
      type: 'buffer',
      codepage: 65001,
      raw: false
    })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    })

    if (data.length < 2) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        success: false,
        message: '文件内容为空或格式不正确'
      })
    }

    const headers = (data[0] as any[]).map((h: any) => {
      let str = h?.toString().trim() || ''
      str = str.replace(/^[\uFEFF\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '')
      return str
    })
    
    const colIndex = {
      title: headers.findIndex((h: string) => h === '题目'),
      type: headers.findIndex((h: string) => h === '类型'),
      options: headers.findIndex((h: string) => h === '选项'),
      answer: headers.findIndex((h: string) => h === '答案'),
      explanation: headers.findIndex((h: string) => h === '解析'),
      category: headers.findIndex((h: string) => h === '分类'),
      difficulty: headers.findIndex((h: string) => h === '难度')
    }

    if (colIndex.title === -1) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        success: false,
        message: '缺少必需的列：题目。请确保Excel第一行包含"题目"列名'
      })
    }

    const typeMap: Record<string, string> = {
      '单选': 'single', '单选题': 'single', 'single': 'single',
      '多选': 'multiple', '多选题': 'multiple', 'multiple': 'multiple',
      '判断': 'truefalse', '判断题': 'truefalse', 'truefalse': 'truefalse'
    }

    const difficultyMap: Record<string, string> = {
      '简单': 'easy', '容易': 'easy', 'easy': 'easy',
      '中等': 'medium', '一般': 'medium', 'medium': 'medium',
      '困难': 'hard', '难': 'hard', 'hard': 'hard'
    }

    let importedCount = 0
    let errorCount = 0
    const errors: string[] = []
    const categoryCache = new Map<string, string>()

    db.prepare('BEGIN TRANSACTION').run()

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[]
      if (!row || row.length === 0 || !row[colIndex.title]) {
        continue
      }

      try {
        const title = row[colIndex.title]?.toString().trim()
        if (!title) continue

        const typeStr = row[colIndex.type]?.toString().trim() || '单选'
        const type = typeMap[typeStr] || 'single'
        
        const difficultyStr = row[colIndex.difficulty]?.toString().trim() || '中等'
        const difficulty = difficultyMap[difficultyStr] || 'medium'

        const optionsStr = row[colIndex.options]?.toString().trim() || ''
        const answerStr = row[colIndex.answer]?.toString().trim() || ''
        const explanation = row[colIndex.explanation]?.toString().trim() || ''
        const categoryName = row[colIndex.category]?.toString().trim() || ''

        let options: { key: string; value: string }[] = []
        let answer: { selected: string } = { selected: 'A' }

        if (optionsStr) {
          const optionParts = optionsStr.split(/\s+(?=[A-Z]\.)/).filter((p: string) => p.trim())
          for (const part of optionParts) {
            const match = part.match(/^([A-Z])\.(.+)$/)
            if (match) {
              options.push({ key: match[1], value: match[2].trim() })
            }
          }
        }

        if (options.length === 0) {
          if (type === 'truefalse') {
            options = [
              { key: 'A', value: '正确' },
              { key: 'B', value: '错误' }
            ]
          } else {
            options = [
              { key: 'A', value: '选项A' },
              { key: 'B', value: '选项B' },
              { key: 'C', value: '选项C' },
              { key: 'D', value: '选项D' }
            ]
          }
        }

        if (type === 'multiple') {
          const selected = answerStr.split(/[,，]/).map((s: string) => s.trim().toUpperCase()).filter((s: string) => s)
          answer = { selected: selected.join(',') }
        } else {
          answer = { selected: answerStr.trim().toUpperCase() || 'A' }
        }

        let categoryId: string | null = null
        if (categoryName) {
          if (categoryCache.has(categoryName)) {
            categoryId = categoryCache.get(categoryName)!
          } else {
            const existingCategory = db.prepare('SELECT id FROM categories WHERE name = ?').get(categoryName) as { id: string } | undefined
            if (existingCategory) {
              categoryId = existingCategory.id
            } else {
              categoryId = randomUUID()
              db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(categoryId, categoryName)
            }
            categoryCache.set(categoryName, categoryId!)
          }
        }

        const questionId = randomUUID()
        
        db.prepare(`
          INSERT INTO questions (id, user_id, title, content, type, difficulty, options, answer, explanation, category_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(questionId, userId, title, title, type, difficulty, JSON.stringify(options), JSON.stringify(answer), explanation, categoryId)

        const relationId = randomUUID()
        db.prepare(`
          INSERT INTO bank_questions (id, bank_id, question_id)
          VALUES (?, ?, ?)
        `).run(relationId, id, questionId)

        importedCount++
      } catch (rowError: any) {
        errorCount++
        errors.push(`第 ${i + 1} 行：${rowError.message}`)
      }
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?').get(id)
    db.prepare('UPDATE question_banks SET question_count = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(count.count, id)

    db.prepare('COMMIT').run()
    db.save()

    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      message: `导入完成：成功 ${importedCount} 道，失败 ${errorCount} 道`,
      imported: importedCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('导入题目失败:', error)
    try {
      db.prepare('ROLLBACK').run()
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError)
    }
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({
      success: false,
      message: '导入失败：' + error.message
    })
  }
})

export default router
