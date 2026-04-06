// 统计路由
import express from 'express';
import { getDatabase } from '../utils/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// 获取学习进度统计
router.get('/progress', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    // 获取总题目数（只统计属于题库的题目）
    const totalQuestions = db.prepare(`
      SELECT COUNT(DISTINCT q.id) as count 
      FROM questions q
      WHERE q.id IN (SELECT DISTINCT question_id FROM bank_questions)
    `).get();

    // 获取用户已答题数量
    const answeredQuestions = db.prepare(`
      SELECT COUNT(DISTINCT question_id) as count
      FROM user_answers
      WHERE user_id = ?
    `).get(userId);

    // 获取正确率
    const accuracy = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM user_answers
      WHERE user_id = ?
    `).get(userId);

    const correctRate = accuracy.total > 0 
      ? ((accuracy.correct || 0) / accuracy.total * 100).toFixed(1) 
      : 0;

    // 获取总学习时长（秒）
    const totalTime = db.prepare(`
      SELECT SUM(duration) as total FROM practice_history
      WHERE user_id = ? AND is_completed = 1
    `).get(userId);

    // 按分类统计
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
    `).all(userId);

    const categoryStats = byCategory.map(cat => ({
      category: cat.category,
      total: cat.total || 0,
      answered: cat.answered || 0,
      correct_rate: cat.answered > 0 
        ? ((cat.correct || 0) / cat.answered * 100).toFixed(1) 
        : 0
    }));

    // 按难度统计
    const difficultyNames = { easy: '简单', medium: '中等', hard: '困难' };
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
    `).all(userId);

    const difficultyStats = byDifficulty.map(diff => ({
      difficulty: difficultyNames[diff.difficulty] || diff.difficulty || '未分类',
      total: diff.total || 0,
      answered: diff.answered || 0,
      correct_rate: diff.answered > 0 
        ? ((diff.correct || 0) / diff.answered * 100).toFixed(1) 
        : 0
    }));

    res.json({
      success: true,
      data: {
        total_questions: totalQuestions.count,
        answered_questions: answeredQuestions.count,
        correct_rate: correctRate,
        total_time_spent: totalTime.total || 0,
        by_category: categoryStats,
        by_difficulty: difficultyStats
      }
    });
  } catch (error) {
    console.error('获取学习进度统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取学习进度统计失败'
    });
  }
});

// 获取练习趋势分析
router.get('/trend', authenticateToken, (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.userId;

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
    `).all(userId, parseInt(days));

    res.json({
      success: true,
      data: trend.map(t => ({
        ...t,
        correct_rate: t.correct_rate ? t.correct_rate.toFixed(1) : 0
      }))
    });
  } catch (error) {
    console.error('获取练习趋势失败:', error);
    res.status(500).json({
      success: false,
      message: '获取练习趋势失败'
    });
  }
});

// 获取高频错题
router.get('/frequent-wrong', authenticateToken, (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.userId;

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
    `).all(userId, parseInt(limit));

    const questions = wrongQuestions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      tags: q.tags ? JSON.parse(q.tags) : []
    }));

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('获取高频错题失败:', error);
    res.status(500).json({
      success: false,
      message: '获取高频错题失败'
    });
  }
});

// 获取题目难度分布
router.get('/difficulty-distribution', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const distribution = db.prepare(`
      SELECT 
        q.difficulty,
        COUNT(DISTINCT q.id) as total,
        COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN q.id END) as mastered,
        COUNT(DISTINCT CASE WHEN ua.is_correct = 0 THEN q.id END) as needs_review
      FROM questions q
      LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
      GROUP BY q.difficulty
    `).all(userId);

    res.json({
      success: true,
      data: distribution.map(d => ({
        difficulty: d.difficulty || '未分类',
        total: d.total || 0,
        mastered: d.mastered || 0,
        needs_review: d.needs_review || 0
      }))
    });
  } catch (error) {
    console.error('获取难度分布失败:', error);
    res.status(500).json({
      success: false,
      message: '获取难度分布失败'
    });
  }
});

export default router;
