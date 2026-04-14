// 练习路由
import express from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../utils/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// 创建练习会话
router.post('/sessions', authenticateToken, (req, res) => {
  try {
    const { bank_id, practice_type, total_questions = 10, settings = {} } = req.body;
    const userId = req.user.userId;

    console.log('📋 创建练习会话:', { bank_id, practice_type, total_questions });

    if (!practice_type) {
      return res.status(400).json({
        success: false,
        message: '请选择练习类型'
      });
    }

    // 检查是否有未完成的顺序练习会话
    let existingSession = null;
    if (practice_type === 'sequential' || practice_type === 'all_sequential') {
      existingSession = db.prepare(`
        SELECT * FROM practice_history 
        WHERE user_id = ? 
        AND practice_type = ? 
        AND bank_id ${bank_id ? '= ?' : 'IS NULL'} 
        AND is_completed = 0 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(userId, practice_type, ...(bank_id ? [bank_id] : []));
      
      if (existingSession) {
        console.log('🔄 找到未完成的练习会话:', existingSession.id);
        
        // 获取完整的题目列表（根据练习类型重新获取）
        let questions;
        let query;
        
        if (practice_type === 'sequential') {
          if (bank_id) {
            query = `
              SELECT q.id FROM questions q
              JOIN bank_questions bq ON q.id = bq.question_id
              WHERE bq.bank_id = ?
              ORDER BY bq.created_at
              LIMIT ?
            `;
            questions = db.prepare(query).all(bank_id, total_questions);
          } else {
            query = `SELECT id FROM questions ORDER BY created_at LIMIT ?`;
            questions = db.prepare(query).all(total_questions);
          }
        } else if (practice_type === 'all_sequential') {
          query = `SELECT id FROM questions ORDER BY created_at LIMIT ?`;
          questions = db.prepare(query).all(total_questions);
        }
        
        const questionIds = questions.map(q => q.id);
        
        return res.status(200).json({
          success: true,
          data: {
            session_id: existingSession.id,
            question_ids: questionIds,
            total_questions: questionIds.length,
            settings,
            current_index: existingSession.current_question_index
          },
          message: '继续未完成的练习'
        });
      }
    }

    // 获取题库中的题目
    let questions;
    let query;

    switch (practice_type) {
      case 'sequential':
        // 顺序练习（从指定题库）
        if (bank_id) {
          query = `
            SELECT q.id FROM questions q
            JOIN bank_questions bq ON q.id = bq.question_id
            WHERE bq.bank_id = ?
            ORDER BY bq.created_at
            LIMIT ?
          `;
          questions = db.prepare(query).all(bank_id, total_questions);
        } else {
          // 从所有题目中顺序练习
          query = `SELECT id FROM questions ORDER BY created_at LIMIT ?`;
          questions = db.prepare(query).all(total_questions);
        }
        break;

      case 'random':
        // 随机练习（从指定题库）
        if (bank_id) {
          query = `
            SELECT q.id FROM questions q
            JOIN bank_questions bq ON q.id = bq.question_id
            WHERE bq.bank_id = ?
            ORDER BY RANDOM()
            LIMIT ?
          `;
          questions = db.prepare(query).all(bank_id, total_questions);
        } else {
          query = `SELECT id FROM questions ORDER BY RANDOM() LIMIT ?`;
          questions = db.prepare(query).all(total_questions);
        }
        break;

      case 'all_random':
        // 从所有题目中随机练习
        query = `SELECT id FROM questions ORDER BY RANDOM() LIMIT ?`;
        questions = db.prepare(query).all(total_questions);
        break;

      case 'all_sequential':
        // 从所有题目中顺序练习
        query = `SELECT id FROM questions ORDER BY created_at LIMIT ?`;
        questions = db.prepare(query).all(total_questions);
        break;

      case 'exam':
        // 模拟考试（从指定题库）
        const questionDistribution = settings?.question_distribution;
        if (questionDistribution) {
          // 按照题目类型分布选择题目
          questions = [];
          
          // 定义题目类型映射
          const typeMap = {
            single: 'single',
            multiple: 'multiple',
            truefalse: 'truefalse'
          };
          
          // 为每种类型选择题目
          for (const [type, count] of Object.entries(questionDistribution)) {
            if (count > 0 && typeMap[type]) {
              let typeQuery;
              let typeQuestions;
              
              if (bank_id) {
                typeQuery = `
                  SELECT q.id FROM questions q
                  JOIN bank_questions bq ON q.id = bq.question_id
                  WHERE bq.bank_id = ? AND q.type = ?
                  ORDER BY RANDOM()
                  LIMIT ?
                `;
                typeQuestions = db.prepare(typeQuery).all(bank_id, typeMap[type], count);
              } else {
                typeQuery = `
                  SELECT id FROM questions 
                  WHERE type = ?
                  ORDER BY RANDOM()
                  LIMIT ?
                `;
                typeQuestions = db.prepare(typeQuery).all(typeMap[type], count);
              }
              
              questions = [...questions, ...typeQuestions];
            }
          }
        } else {
          // 没有指定分布，使用默认随机选择
          if (bank_id) {
            query = `
              SELECT q.id FROM questions q
              JOIN bank_questions bq ON q.id = bq.question_id
              WHERE bq.bank_id = ?
              ORDER BY RANDOM()
              LIMIT ?
            `;
            questions = db.prepare(query).all(bank_id, total_questions);
          } else {
            query = `SELECT id FROM questions ORDER BY RANDOM() LIMIT ?`;
            questions = db.prepare(query).all(total_questions);
          }
        }
        break;

      case 'wrong':
        // 错题练习
        query = `
          SELECT DISTINCT q.id FROM questions q
          JOIN user_answers ua ON q.id = ua.question_id
          WHERE ua.user_id = ? AND ua.is_correct = 0
          ORDER BY ua.created_at DESC
          LIMIT ?
        `;
        questions = db.prepare(query).all(userId, total_questions);
        break;

      case 'easy_wrong':
        // 易错题练习（从所有题目中找）
        query = `
          SELECT qs.question_id as id FROM question_stats qs
          JOIN questions q ON qs.question_id = q.id
          WHERE qs.total_attempts >= 3
          ORDER BY qs.error_rate DESC
          LIMIT ?
        `;
        questions = db.prepare(query).all(total_questions);
        break;

      case 'favorite':
        // 收藏练习
        query = `
          SELECT q.id FROM questions q
          JOIN user_favorites uf ON q.id = uf.question_id
          WHERE uf.user_id = ?
          ORDER BY uf.created_at DESC
          LIMIT ?
        `;
        questions = db.prepare(query).all(userId, total_questions);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '无效的练习类型'
        });
    }

    console.log('📝 找到题目:', questions.length);

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有找到可练习的题目，请先添加题目'
      });
    }

    // 创建练习会话
    const sessionId = randomUUID();
    db.prepare(`
      INSERT INTO practice_history (id, user_id, bank_id, practice_type, total_questions, start_time, is_completed, current_question_index)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 0)
    `).run(sessionId, userId, bank_id || null, practice_type, questions.length);

    res.status(201).json({
      success: true,
      data: {
        session_id: sessionId,
        question_ids: questions.map(q => q.id),
        total_questions: questions.length,
        settings,
        current_index: 0
      },
      message: '练习会话创建成功'
    });
  } catch (error) {
    console.error('创建练习会话失败:', error);
    res.status(500).json({
      success: false,
      message: '创建练习会话失败'
    });
  }
});

// 获取练习会话详情
router.get('/sessions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = db.prepare(`
      SELECT ph.*, qb.name as bank_name
      FROM practice_history ph
      LEFT JOIN question_banks qb ON ph.bank_id = qb.id
      WHERE ph.id = ? AND ph.user_id = ?
    `).get(id, userId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '练习会话不存在'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('获取练习会话失败:', error);
    res.status(500).json({
      success: false,
      message: '获取练习会话失败'
    });
  }
});

// 提交答案
router.post('/answers', authenticateToken, (req, res) => {
  try {
    const { session_id, question_id, answer, time_spent } = req.body;
    const userId = req.user.userId;

    if (!session_id || !question_id || answer === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 获取正确答案
    const question = db.prepare('SELECT id, type, answer FROM questions WHERE id = ?').get(question_id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 判断是否正确
    const correctAnswer = JSON.parse(question.answer);
    let isCorrect = false;

    // 将答案转换为数组格式
    const normalizeAnswer = (ans) => {
      if (!ans) return [];
      if (Array.isArray(ans)) return ans;
      if (typeof ans === 'string') return ans.split(',').map(s => s.trim());
      return [ans];
    };

    if (question.type === 'single' || question.type === 'truefalse') {
      // 单选题和判断题
      const userAnswer = answer.selected;
      const correctKey = correctAnswer.selected;
      isCorrect = userAnswer === correctKey;
    } else if (question.type === 'multiple') {
      // 多选题比较
      const userAnswer = normalizeAnswer(answer.selected);
      const correctKeys = normalizeAnswer(correctAnswer.selected);
      
      const userSet = new Set(userAnswer);
      const correctSet = new Set(correctKeys);
      isCorrect = userSet.size === correctSet.size && 
                  [...userSet].every(x => correctSet.has(x));
    } else if (question.type === 'fill' || question.type === 'essay') {
      // 简答/填空题暂不自动判分
      isCorrect = null;
    }

    // 保存答案
    const answerId = randomUUID();
    db.prepare(`
      INSERT INTO user_answers (id, user_id, question_id, answer, is_correct, practice_session_id, time_spent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      answerId,
      userId,
      question_id,
      JSON.stringify(answer),
      isCorrect === null ? 0 : (isCorrect ? 1 : 0),
      session_id,
      time_spent || 0
    );

    // 更新练习进度
    db.prepare(`
      UPDATE practice_history
      SET current_question_index = current_question_index + 1
      WHERE id = ?
    `).run(session_id);

    // 更新题目统计
    const existingStats = db.prepare('SELECT * FROM question_stats WHERE question_id = ?').get(question_id);
    if (existingStats) {
      const newTotal = existingStats.total_attempts + 1;
      const newCorrect = existingStats.correct_count + (isCorrect ? 1 : 0);
      const newIncorrect = existingStats.incorrect_count + (isCorrect === false ? 1 : 0);
      const newAvgTime = ((existingStats.average_time * existingStats.total_attempts) + (time_spent || 0)) / newTotal;

      db.prepare(`
        UPDATE question_stats SET
          total_attempts = ?,
          correct_count = ?,
          incorrect_count = ?,
          error_rate = ?,
          average_time = ?
        WHERE question_id = ?
      `).run(newTotal, newCorrect, newIncorrect, newIncorrect / newTotal, newAvgTime, question_id);
    } else {
      db.prepare(`
        INSERT INTO question_stats (id, question_id, total_attempts, correct_count, incorrect_count, error_rate, average_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        question_id,
        1,
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        isCorrect ? 0 : 1,
        time_spent || 0
      );
    }

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: correctAnswer
      },
      message: isCorrect ? '回答正确！' : '回答错误'
    });
  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({
      success: false,
      message: '提交答案失败'
    });
  }
});

// 完成练习会话
router.post('/sessions/:id/complete', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = db.prepare(`
      SELECT * FROM practice_history WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '练习会话不存在'
      });
    }

    // 统计正确率
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM user_answers
      WHERE practice_session_id = ?
    `).get(id);

    const duration = session.start_time ? 
      Math.floor((new Date() - new Date(session.start_time)) / 1000) : 0;

    // 更新会话
    db.prepare(`
      UPDATE practice_history SET
        correct_count = ?,
        incorrect_count = ?,
        end_time = CURRENT_TIMESTAMP,
        duration = ?,
        is_completed = 1
      WHERE id = ?
    `).run(stats.correct || 0, (stats.total || 0) - (stats.correct || 0), duration, id);

    res.json({
      success: true,
      data: {
        total: stats.total || 0,
        correct: stats.correct || 0,
        incorrect: (stats.total || 0) - (stats.correct || 0),
        correct_rate: stats.total ? ((stats.correct || 0) / stats.total * 100).toFixed(1) : 0,
        duration
      },
      message: '练习完成'
    });
  } catch (error) {
    console.error('完成练习会话失败:', error);
    res.status(500).json({
      success: false,
      message: '完成练习会话失败'
    });
  }
});

// 获取练习历史
router.get('/history', authenticateToken, (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const userId = req.user.userId;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'ph.user_id = ?';
    const params = [userId];

    if (type) {
      whereClause += ' AND ph.practice_type = ?';
      params.push(type);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM practice_history ph WHERE ${whereClause}
    `).get(...params);

    const history = db.prepare(`
      SELECT ph.*, qb.name as bank_name
      FROM practice_history ph
      LEFT JOIN question_banks qb ON ph.bank_id = qb.id
      WHERE ${whereClause}
      ORDER BY ph.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: history,
      total: countResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult.total / parseInt(limit))
    });
  } catch (error) {
    console.error('获取练习历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取练习历史失败'
    });
  }
});

// 获取错题列表
router.get('/wrong', authenticateToken, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = db.prepare(`
      SELECT COUNT(DISTINCT question_id) as total
      FROM user_answers
      WHERE user_id = ? AND is_correct = 0
    `).get(userId);

    const wrongQuestions = db.prepare(`
      SELECT DISTINCT q.*, ua.created_at as wrong_time
      FROM questions q
      JOIN user_answers ua ON q.id = ua.question_id
      WHERE ua.user_id = ? AND ua.is_correct = 0
      ORDER BY ua.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, parseInt(limit), offset);

    const questions = wrongQuestions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      tags: q.tags ? JSON.parse(q.tags) : []
    }));

    res.json({
      success: true,
      data: questions,
      total: countResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult.total / parseInt(limit))
    });
  } catch (error) {
    console.error('获取错题列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取错题列表失败'
    });
  }
});

export default router;
