import express from 'express'
import type { Request, Response } from 'express'
import { getDatabase } from '../utils/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
const db = getDatabase()

router.get('/progress', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId

    const totalQuestions = db.prepare(`
      SELECT COUNT(DISTINCT q.id) as count 
      FROM questions q
      WHERE q.id IN (SELECT DISTINCT question_id FROM bank_questions)
    `).get()

    const answeredQuestions = db.prepare(`
      SELECT COUNT(DISTINCT question_id) as count
      FROM user_answers
      WHERE user_id = ?
    `).get(userId)

    const accuracy = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM user_answers
      WHERE user_id = ?
    `).get(userId)

    const total = accuracy?.total || 0
    const correct = accuracy?.correct || 0
    const correctRate = total > 0 
      ? (correct / total * 100).toFixed(1) 
      : '0'

    const totalTime = db.prepare(`
      SELECT SUM(duration) as total FROM practice_history
      WHERE user_id = ? AND is_completed = 1
    `).get(userId)

    const byCategory = db.prepare(`
      SELECT 
        COALESCE(c.name, '未分类') as category,
        COUNT(DISTINCT q.id) as total,
        COUNT(DISTINCT ua.question_id) as answered,
        SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
      WHERE q.id IN (SELECT DISTINCT question_id FROM bank_questions)
      GROUP BY c.id, c.name
    `).all(userId)

    const categoryStats = byCategory.map((cat: any) => ({
      category: cat.category,
      total: cat.total || 0,
      answered: cat.answered || 0,
      correct_rate: (cat.answered || 0) > 0 
        ? ((cat.correct || 0) / (cat.answered || 1) * 100).toFixed(1) 
        : '0'
    }))

    const difficultyNames: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }
    const byDifficulty = db.prepare(`
      SELECT 
        q.difficulty,
        COUNT(DISTINCT q.id) as total,
        COUNT(DISTINCT ua.question_id) as answered,
        SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM questions q
      LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
      WHERE q.difficulty IS NOT NULL
        AND q.id IN (SELECT DISTINCT question_id FROM bank_questions)
      GROUP BY q.difficulty
    `).all(userId)

    const difficultyStats = byDifficulty.map((diff: any) => ({
      difficulty: difficultyNames[diff.difficulty as string] || diff.difficulty || '未分类',
      total: diff.total || 0,
      answered: diff.answered || 0,
      correct_rate: (diff.answered || 0) > 0 
        ? ((diff.correct || 0) / (diff.answered || 1) * 100).toFixed(1) 
        : '0'
    }))

    res.json({
      success: true,
      data: {
        total_questions: totalQuestions?.count || 0,
        answered_questions: answeredQuestions?.count || 0,
        correct_rate: correctRate,
        total_time_spent: totalTime?.total || 0,
        by_category: categoryStats,
        by_difficulty: difficultyStats
      }
    })
  } catch (error) {
    console.error('获取学习进度统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取学习进度统计失败'
    })
  }
})

router.get('/trend', authenticateToken, (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query
    const userId = req.user?.userId

    const trend = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as practice_count,
        SUM(total_questions) as questions_count,
        SUM(correct_count) as correct_count,
        AVG(CAST(correct_count AS FLOAT) / NULLIF(total_questions, 0) * 100) as correct_rate
      FROM practice_history
      WHERE user_id = ? 
        AND is_completed = 1
        AND created_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(userId, parseInt(String(days)))

    res.json({
      success: true,
      data: trend.map((t: any) => ({
        ...t,
        correct_rate: t.correct_rate ? Number(t.correct_rate).toFixed(1) : '0'
      }))
    })
  } catch (error) {
    console.error('获取练习趋势失败:', error)
    res.status(500).json({
      success: false,
      message: '获取练习趋势失败'
    })
  }
})

router.get('/frequent-wrong', authenticateToken, (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query
    const userId = req.user?.userId

    const wrongQuestions = db.prepare(`
      SELECT 
        q.*,
        COUNT(*) as wrong_count,
        c.name as category_name
      FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE ua.user_id = ? AND ua.is_correct = 0
      GROUP BY q.id
      ORDER BY wrong_count DESC
      LIMIT ?
    `).all(userId, parseInt(String(limit)))

    const questions = wrongQuestions.map((q: any) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      tags: q.tags ? JSON.parse(q.tags) : []
    }))

    res.json({
      success: true,
      data: questions
    })
  } catch (error) {
    console.error('获取高频错题失败:', error)
    res.status(500).json({
      success: false,
      message: '获取高频错题失败'
    })
  }
})

router.get('/difficulty-distribution', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId

    const distribution = db.prepare(`
      SELECT 
        q.difficulty,
        COUNT(DISTINCT q.id) as total,
        COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN q.id END) as mastered,
        COUNT(DISTINCT CASE WHEN ua.is_correct = 0 THEN q.id END) as needs_review
      FROM questions q
      LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
      GROUP BY q.difficulty
    `).all(userId)

    res.json({
      success: true,
      data: distribution.map((d: any) => ({
        difficulty: d.difficulty || '未分类',
        total: d.total || 0,
        mastered: d.mastered || 0,
        needs_review: d.needs_review || 0
      }))
    })
  } catch (error) {
    console.error('获取难度分布失败:', error)
    res.status(500).json({
      success: false,
      message: '获取难度分布失败'
    })
  }
})

export default router
