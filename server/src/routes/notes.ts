import express from 'express'
import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import { getDatabase } from '../utils/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
const db = getDatabase()

interface NoteBody {
  question_id?: string
  content?: string
}

router.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, question_id } = req.query
    const userId = req.user?.userId
    const offset = (parseInt(String(page)) - 1) * parseInt(String(limit))

    let whereClause = 'un.user_id = ?'
    const params: any[] = [userId]

    if (question_id) {
      whereClause += ' AND un.question_id = ?'
      params.push(question_id)
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM user_notes un WHERE ${whereClause}
    `).get(...params)

    const notes = db.prepare(`
      SELECT un.*, q.title as question_title
      FROM user_notes un
      LEFT JOIN questions q ON un.question_id = q.id
      WHERE ${whereClause}
      ORDER BY un.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(String(limit)), offset)

    res.json({
      success: true,
      data: notes,
      total: countResult?.total || 0,
      page: parseInt(String(page)),
      totalPages: Math.ceil((countResult?.total || 0) / parseInt(String(limit)))
    })
  } catch (error) {
    console.error('获取笔记列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取笔记列表失败'
    })
  }
})

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    const note = db.prepare(`
      SELECT un.*, q.title as question_title, q.content as question_content
      FROM user_notes un
      LEFT JOIN questions q ON un.question_id = q.id
      WHERE un.id = ? AND un.user_id = ?
    `).get(id, userId)

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      })
    }

    res.json({
      success: true,
      data: note
    })
  } catch (error) {
    console.error('获取笔记详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取笔记详情失败'
    })
  }
})

router.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const { question_id, content } = req.body as NoteBody
    const userId = req.user?.userId

    if (!question_id || !content) {
      return res.status(400).json({
        success: false,
        message: '请填写题目ID和笔记内容'
      })
    }

    const question = db.prepare('SELECT id FROM questions WHERE id = ?').get(question_id)
    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO user_notes (id, user_id, question_id, content)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, question_id, content)

    const note = db.prepare(
      'SELECT id, user_id, question_id, content, created_at, updated_at FROM user_notes WHERE id = ?'
    ).get(id)

    res.status(201).json({
      success: true,
      data: note,
      message: '笔记创建成功'
    })
  } catch (error) {
    console.error('创建笔记失败:', error)
    res.status(500).json({
      success: false,
      message: '创建笔记失败'
    })
  }
})

router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body as NoteBody
    const userId = req.user?.userId

    const note = db.prepare(`
      SELECT id FROM user_notes WHERE id = ? AND user_id = ?
    `).get(id, userId)

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      })
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请填写笔记内容'
      })
    }

    db.prepare(`
      UPDATE user_notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(content, id)

    const updatedNote = db.prepare(
      'SELECT id, user_id, question_id, content, created_at, updated_at FROM user_notes WHERE id = ?'
    ).get(id)

    res.json({
      success: true,
      data: updatedNote,
      message: '笔记更新成功'
    })
  } catch (error) {
    console.error('更新笔记失败:', error)
    res.status(500).json({
      success: false,
      message: '更新笔记失败'
    })
  }
})

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId

    const note = db.prepare(`
      SELECT id FROM user_notes WHERE id = ? AND user_id = ?
    `).get(id, userId)

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      })
    }

    db.prepare('DELETE FROM user_notes WHERE id = ?').run(id)

    res.json({
      success: true,
      message: '笔记删除成功'
    })
  } catch (error) {
    console.error('删除笔记失败:', error)
    res.status(500).json({
      success: false,
      message: '删除笔记失败'
    })
  }
})

export default router
