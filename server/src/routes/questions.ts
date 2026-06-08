import express from 'express'
import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import { getDatabase } from '../utils/database.js'
import { authenticateToken, optionalAuth } from '../middleware/auth.js'

const router = express.Router()
const db = getDatabase()

router.get('/', optionalAuth, (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, category, difficulty, type } = req.query
    const pageNum = parseInt(String(page))
    const limitNum = parseInt(String(limit))
    const offset = (pageNum - 1) * limitNum
    const userId = req.user?.userId

    let whereClause = 'q.id IN (SELECT DISTINCT question_id FROM bank_questions)'
    const params: any[] = []

    if (search) {
      whereClause += ` AND (q.title LIKE ? OR q.content LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    if (category) {
      whereClause += ` AND q.category_id = ?`
      params.push(category)
    }
    if (difficulty) {
      whereClause += ` AND q.difficulty = ?`
      params.push(difficulty)
    }
    if (type) {
      whereClause += ` AND q.type = ?`
      params.push(type)
    }

    const countQuery = `SELECT COUNT(*) as total FROM questions q WHERE ${whereClause}`
    const countResult = db.prepare(countQuery).get(...params)

    let dataQuery: string
    let dataParams: any[] = [...params]

    if (userId) {
      dataQuery = `
        SELECT q.*, c.name as category_name, 
               CASE WHEN ua.question_id IS NOT NULL THEN 1 ELSE 0 END as has_practiced
        FROM questions q
        LEFT JOIN categories c ON q.category_id = c.id
        LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
        WHERE ${whereClause}
        GROUP BY q.id
        ORDER BY has_practiced ASC, q.created_at DESC
        LIMIT ? OFFSET ?
      `
      dataParams = [userId, ...params, limitNum, offset]
    } else {
      dataQuery = `
        SELECT q.*, c.name as category_name
        FROM questions q
        LEFT JOIN categories c ON q.category_id = c.id
        WHERE ${whereClause}
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?
      `
      dataParams = [...params, limitNum, offset]
    }

    const data = db.prepare(dataQuery).all(...dataParams)

    const questions = data.map((q: any) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      tags: q.tags ? JSON.parse(q.tags) : []
    }))

    res.json({
      success: true,
      data: questions,
      total: countResult?.total || 0,
      page: pageNum,
      totalPages: Math.ceil((countResult?.total || 0) / limitNum)
    })
  } catch (error) {
    console.error('获取题目列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取题目列表失败'
    })
  }
})

router.get('/batch/:ids', optionalAuth, (req: Request, res: Response) => {
  try {
    const { ids } = req.params
    const idList = ids.split(',').filter(id => id.trim())

    if (idList.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供题目ID列表'
      })
    }

    const placeholders = idList.map(() => '?').join(',')
    const questions = db.prepare(`
      SELECT q.*, c.name as category_name
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.id IN (${placeholders})
    `).all(...idList)

    const parsedQuestions = questions.map((q: any) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      tags: q.tags ? JSON.parse(q.tags) : []
    }))

    res.json({
      success: true,
      data: parsedQuestions
    })
  } catch (error) {
    console.error('批量获取题目失败:', error)
    res.status(500).json({
      success: false,
      message: '批量获取题目失败'
    })
  }
})

router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const question = db.prepare(`
      SELECT q.*, c.name as category_name
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.id = ?
    `).get(id)

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      })
    }

    const stats = db.prepare(
      'SELECT total_attempts, correct_count, incorrect_count, error_rate, average_time FROM question_stats WHERE question_id = ?'
    ).get(id)

    res.json({
      success: true,
      data: {
        ...question,
        options: question.options ? JSON.parse(question.options) : [],
        answer: question.answer ? JSON.parse(question.answer) : null,
        tags: question.tags ? JSON.parse(question.tags) : [],
        stats: stats || null
      }
    })
  } catch (error) {
    console.error('获取题目详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取题目详情失败'
    })
  }
})

router.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const { title, content, type, options, answer, explanation, difficulty, category_id, tags, source } = req.body

    if (!title || !type || !answer) {
      return res.status(400).json({
        success: false,
        message: '请填写必填字段'
      })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO questions (id, title, content, type, options, answer, explanation, difficulty, category_id, tags, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      content || '',
      type,
      options ? JSON.stringify(options) : null,
      JSON.stringify(answer),
      explanation || '',
      difficulty || 'medium',
      category_id || null,
      tags ? JSON.stringify(tags) : null,
      source || ''
    )

    const question = db.prepare(
      'SELECT id, title, content, type, options, answer, explanation, difficulty, category_id, tags, source, created_at, updated_at FROM questions WHERE id = ?'
    ).get(id)

    res.status(201).json({
      success: true,
      data: {
        ...question,
        options: question?.options ? JSON.parse(question.options) : [],
        answer: question?.answer ? JSON.parse(question.answer) : null,
        tags: question?.tags ? JSON.parse(question.tags) : []
      },
      message: '题目创建成功'
    })
  } catch (error) {
    console.error('创建题目失败:', error)
    res.status(500).json({
      success: false,
      message: '创建题目失败'
    })
  }
})

router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, content, type, options, answer, explanation, difficulty, category_id, tags, source } = req.body

    const existing = db.prepare('SELECT id FROM questions WHERE id = ?').get(id)
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      })
    }

    const updates: string[] = []
    const values: any[] = []

    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (content !== undefined) { updates.push('content = ?'); values.push(content) }
    if (type !== undefined) { updates.push('type = ?'); values.push(type) }
    if (options !== undefined) { updates.push('options = ?'); values.push(JSON.stringify(options)) }
    if (answer !== undefined) { updates.push('answer = ?'); values.push(JSON.stringify(answer)) }
    if (explanation !== undefined) { updates.push('explanation = ?'); values.push(explanation) }
    if (difficulty !== undefined) { updates.push('difficulty = ?'); values.push(difficulty) }
    if (category_id !== undefined) { updates.push('category_id = ?'); values.push(category_id) }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)) }
    if (source !== undefined) { updates.push('source = ?'); values.push(source) }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    const question = db.prepare(
      'SELECT id, title, content, type, options, answer, explanation, difficulty, category_id, tags, source, created_at, updated_at FROM questions WHERE id = ?'
    ).get(id)

    res.json({
      success: true,
      data: {
        ...question,
        options: question?.options ? JSON.parse(question.options) : [],
        answer: question?.answer ? JSON.parse(question.answer) : null,
        tags: question?.tags ? JSON.parse(question.tags) : []
      },
      message: '题目更新成功'
    })
  } catch (error) {
    console.error('更新题目失败:', error)
    res.status(500).json({
      success: false,
      message: '更新题目失败'
    })
  }
})

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = db.prepare('SELECT id FROM questions WHERE id = ?').get(id)
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      })
    }

    db.prepare('DELETE FROM questions WHERE id = ?').run(id)

    res.json({
      success: true,
      message: '题目删除成功'
    })
  } catch (error) {
    console.error('删除题目失败:', error)
    res.status(500).json({
      success: false,
      message: '删除题目失败'
    })
  }
})

router.get('/categories/list', (req: Request, res: Response) => {
  try {
    const categories = db.prepare('SELECT id, name, description FROM categories ORDER BY name').all()
    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('获取分类列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    })
  }
})

export default router
