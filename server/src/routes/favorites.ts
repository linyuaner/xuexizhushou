import express from 'express'
import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import { getDatabase } from '../utils/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
const db = getDatabase()

interface FavoriteBody {
  question_id?: string
}

router.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category } = req.query
    const userId = req.user?.userId
    const offset = (parseInt(String(page)) - 1) * parseInt(String(limit))

    let whereClause = 'uf.user_id = ?'
    const params: any[] = [userId]

    if (category) {
      whereClause += ' AND q.category_id = ?'
      params.push(category)
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM user_favorites uf
      JOIN questions q ON uf.question_id = q.id
      WHERE ${whereClause}
    `).get(...params)

    const favorites = db.prepare(`
      SELECT q.*, uf.created_at as favorited_at, c.name as category_name
      FROM user_favorites uf
      JOIN questions q ON uf.question_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE ${whereClause}
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(String(limit)), offset)

    const parsedFavorites = favorites.map((q: any) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      tags: q.tags ? JSON.parse(q.tags) : []
    }))

    res.json({
      success: true,
      data: parsedFavorites,
      total: countResult?.total || 0,
      page: parseInt(String(page)),
      totalPages: Math.ceil((countResult?.total || 0) / parseInt(String(limit)))
    })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取收藏列表失败'
    })
  }
})

router.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const { question_id } = req.body as FavoriteBody
    const userId = req.user?.userId

    if (!question_id) {
      return res.status(400).json({
        success: false,
        message: '请提供题目ID'
      })
    }

    const question = db.prepare('SELECT id FROM questions WHERE id = ?').get(question_id)
    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      })
    }

    const existing = db.prepare(`
      SELECT id FROM user_favorites WHERE user_id = ? AND question_id = ?
    `).get(userId, question_id)

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '已收藏该题目'
      })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO user_favorites (id, user_id, question_id)
      VALUES (?, ?, ?)
    `).run(id, userId, question_id)

    res.status(201).json({
      success: true,
      data: { id, question_id },
      message: '收藏成功'
    })
  } catch (error) {
    console.error('添加收藏失败:', error)
    res.status(500).json({
      success: false,
      message: '添加收藏失败'
    })
  }
})

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    const favorite = db.prepare(`
      SELECT id FROM user_favorites WHERE id = ? AND user_id = ?
    `).get(id, userId)

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: '收藏记录不存在'
      })
    }

    db.prepare('DELETE FROM user_favorites WHERE id = ?').run(id)

    res.json({
      success: true,
      message: '已取消收藏'
    })
  } catch (error) {
    console.error('取消收藏失败:', error)
    res.status(500).json({
      success: false,
      message: '取消收藏失败'
    })
  }
})

router.delete('/question/:questionId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { questionId } = req.params
    const userId = req.user?.userId

    db.prepare(`
      DELETE FROM user_favorites WHERE user_id = ? AND question_id = ?
    `).run(userId, questionId)

    res.json({
      success: true,
      message: '已取消收藏'
    })
  } catch (error) {
    console.error('取消收藏失败:', error)
    res.status(500).json({
      success: false,
      message: '取消收藏失败'
    })
  }
})

router.get('/check/:questionId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { questionId } = req.params
    const userId = req.user?.userId

    const favorite = db.prepare(`
      SELECT id FROM user_favorites WHERE user_id = ? AND question_id = ?
    `).get(userId, questionId)

    res.json({
      success: true,
      data: { isFavorited: !!favorite }
    })
  } catch (error) {
    console.error('检查收藏状态失败:', error)
    res.status(500).json({
      success: false,
      message: '检查收藏状态失败'
    })
  }
})

export default router
