// 题库路由
import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { getDatabase } from '../utils/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import XLSX from 'xlsx';
import fs from 'fs';

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const router = express.Router();
const db = getDatabase();

// 获取题库列表
router.get('/', optionalAuth, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user?.userId;

    let whereClause = '(is_public = 1 OR user_id = ?)';
    const params = [userId || 'anonymous'];

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM question_banks WHERE ${whereClause}
    `).get(...params);

    const banks = db.prepare(`
      SELECT qb.*, u.username as creator_name
      FROM question_banks qb
      LEFT JOIN users u ON qb.user_id = u.id
      WHERE ${whereClause}
      ORDER BY qb.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: banks,
      total: countResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult.total / parseInt(limit))
    });
  } catch (error) {
    console.error('获取题库列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取题库列表失败'
    });
  }
});

// 获取单个题库详情
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const bank = db.prepare(`
      SELECT qb.*, u.username as creator_name
      FROM question_banks qb
      LEFT JOIN users u ON qb.user_id = u.id
      WHERE qb.id = ? AND (qb.is_public = 1 OR qb.user_id = ?)
    `).get(id, userId || 'anonymous');

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      });
    }

    // 获取题库中的题目数量
    const questionCount = db.prepare(`
      SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?
    `).get(id);

    bank.question_count = questionCount.count;

    res.json({
      success: true,
      data: bank
    });
  } catch (error) {
    console.error('获取题库详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取题库详情失败'
    });
  }
});

// 创建题库
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description, is_public = false } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '请输入题库名称'
      });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO question_banks (id, user_id, name, description, is_public)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, description || '', is_public ? 1 : 0);

    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      data: bank,
      message: '题库创建成功'
    });
  } catch (error) {
    console.error('创建题库失败:', error);
    res.status(500).json({
      success: false,
      message: '创建题库失败'
    });
  }
});

// 更新题库
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_public } = req.body;
    const userId = req.user.userId;

    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      db.prepare(`UPDATE question_banks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updatedBank = db.prepare('SELECT * FROM question_banks WHERE id = ?').get(id);

    res.json({
      success: true,
      data: updatedBank,
      message: '题库更新成功'
    });
  } catch (error) {
    console.error('更新题库失败:', error);
    res.status(500).json({
      success: false,
      message: '更新题库失败'
    });
  }
});

// 删除题库
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      });
    }

    // 获取题库中的所有题目ID
    const questions = db.prepare('SELECT question_id FROM bank_questions WHERE bank_id = ?').all(id);
    const questionIds = questions.map(q => q.question_id);

    // 删除题目的关联数据
    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM user_answers WHERE question_id IN (${placeholders})`).run(...questionIds);
      db.prepare(`DELETE FROM user_favorites WHERE question_id IN (${placeholders})`).run(...questionIds);
      db.prepare(`DELETE FROM user_notes WHERE question_id IN (${placeholders})`).run(...questionIds);
      db.prepare(`DELETE FROM question_stats WHERE question_id IN (${placeholders})`).run(...questionIds);
      db.prepare(`DELETE FROM questions WHERE id IN (${placeholders})`).run(...questionIds);
    }

    // 删除关联记录
    db.prepare('DELETE FROM bank_questions WHERE bank_id = ?').run(id);
    db.prepare('DELETE FROM question_banks WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '题库删除成功'
    });
  } catch (error) {
    console.error('删除题库失败:', error);
    res.status(500).json({
      success: false,
      message: '删除题库失败'
    });
  }
});

// 获取题库中的题目
router.get('/:id/questions', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log('查询题库题目 - bank_id:', id);

    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ?').get(id);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      });
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM bank_questions WHERE bank_id = ?
    `).get(id);
    console.log('关联记录数:', countResult.total);

    const questions = db.prepare(`
      SELECT q.*, c.name as category_name
      FROM questions q
      JOIN bank_questions bq ON q.id = bq.question_id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE bq.bank_id = ?
      ORDER BY bq.created_at
      LIMIT ? OFFSET ?
    `).all(id, parseInt(limit), offset);
    console.log('查询到的题目数:', questions.length);

    const parsedQuestions = questions.map(q => ({
      ...q,
      question: q.title, // 兼容前端字段名
      options: q.options ? JSON.parse(q.options) : [],
      answer: q.answer ? JSON.parse(q.answer) : null,
      analysis: q.explanation, // 兼容前端字段名
      tags: q.tags ? JSON.parse(q.tags) : []
    }));

    res.json({
      success: true,
      data: parsedQuestions,
      total: countResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult.total / parseInt(limit))
    });
  } catch (error) {
    console.error('获取题库题目失败:', error);
    res.status(500).json({
      success: false,
      message: '获取题库题目失败'
    });
  }
});

// 添加题目到题库
router.post('/:id/questions', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { question_ids } = req.body;
    const userId = req.user.userId;

    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      });
    }

    if (!question_ids || !Array.isArray(question_ids)) {
      return res.status(400).json({
        success: false,
        message: '请提供题目ID列表'
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO bank_questions (id, bank_id, question_id)
      VALUES (?, ?, ?)
    `);

    for (const questionId of question_ids) {
      // 检查是否已存在
      const existing = db.prepare(`
        SELECT id FROM bank_questions WHERE bank_id = ? AND question_id = ?
      `).get(id, questionId);

      if (!existing) {
        insertStmt.run(randomUUID(), id, questionId);
      }
    }

    // 更新题库题目数量
    const count = db.prepare('SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?')
      .get(id);
    db.prepare('UPDATE question_banks SET question_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(count.count, id);

    res.json({
      success: true,
      message: `成功添加 ${question_ids.length} 道题目到题库`
    });
  } catch (error) {
    console.error('添加题目到题库失败:', error);
    res.status(500).json({
      success: false,
      message: '添加题目失败'
    });
  }
});

// 从题库移除题目
router.delete('/:id/questions/:questionId', authenticateToken, (req, res) => {
  try {
    const { id, questionId } = req.params;
    const userId = req.user.userId;

    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ? AND user_id = ?')
      .get(id, userId);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在或无权限'
      });
    }

    db.prepare('DELETE FROM bank_questions WHERE bank_id = ? AND question_id = ?')
      .run(id, questionId);

    // 更新题库题目数量
    const count = db.prepare('SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?')
      .get(id);
    db.prepare('UPDATE question_banks SET question_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(count.count, id);

    res.json({
      success: true,
      message: '题目已从题库移除'
    });
  } catch (error) {
    console.error('移除题目失败:', error);
    res.status(500).json({
      success: false,
      message: '移除题目失败'
    });
  }
});

// 导入题目到题库
router.post('/:id/import', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    console.log('导入请求 - 题库ID:', id, '用户ID:', userId);

    // 检查题库是否存在
    const bank = db.prepare('SELECT * FROM question_banks WHERE id = ?')
      .get(id);
    console.log('题库信息:', bank);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在'
      });
    }

    // 检查是否是题库所有者或题库是公开的
    if (bank.user_id !== userId && !bank.is_public) {
      console.log('权限检查失败 - 题库user_id:', bank.user_id, '当前用户:', userId);
      return res.status(403).json({
        success: false,
        message: '无权限导入到此题库'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    // 解析 Excel 文件
    const workbook = XLSX.readFile(req.file.path, { 
      type: 'buffer',
      codepage: 65001,  // UTF-8
      raw: false
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });

    if (data.length < 2) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '文件内容为空或格式不正确'
      });
    }

    // 获取表头（第一行）
    const headers = data[0].map(h => {
      let str = h?.toString().trim() || '';
      // 移除BOM字符和不可见字符
      str = str.replace(/^[\uFEFF\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');
      return str;
    });
    
    console.log('解析到的表头:', headers);
    
    const colIndex = {
      title: headers.findIndex(h => h === '题目'),
      type: headers.findIndex(h => h === '类型'),
      options: headers.findIndex(h => h === '选项'),
      answer: headers.findIndex(h => h === '答案'),
      explanation: headers.findIndex(h => h === '解析'),
      category: headers.findIndex(h => h === '分类'),
      difficulty: headers.findIndex(h => h === '难度')
    };
    
    console.log('列索引:', colIndex);

    if (colIndex.title === -1) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '缺少必需的列：题目。请确保Excel第一行包含"题目"列名'
      });
    }

    // 类型映射
    const typeMap = {
      '单选': 'single', '单选题': 'single', 'single': 'single',
      '多选': 'multiple', '多选题': 'multiple', 'multiple': 'multiple',
      '判断': 'truefalse', '判断题': 'truefalse', 'truefalse': 'truefalse'
    };

    // 难度映射
    const difficultyMap = {
      '简单': 'easy', '容易': 'easy', 'easy': 'easy',
      '中等': 'medium', '一般': 'medium', 'medium': 'medium',
      '困难': 'hard', '难': 'hard', 'hard': 'hard'
    };

    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log('开始解析 Excel，共', data.length - 1, '行数据');

    // 解析每一行数据（从第二行开始）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row[colIndex.title]) {
        continue;
      }

      try {
        const title = row[colIndex.title]?.toString().trim();
        if (!title) continue;

        const typeStr = row[colIndex.type]?.toString().trim() || '单选';
        const type = typeMap[typeStr] || 'single';
        
        const difficultyStr = row[colIndex.difficulty]?.toString().trim() || '中等';
        const difficulty = difficultyMap[difficultyStr] || 'medium';

        const optionsStr = row[colIndex.options]?.toString().trim() || '';
        const answerStr = row[colIndex.answer]?.toString().trim() || '';
        const explanation = row[colIndex.explanation]?.toString().trim() || '';
        const categoryName = row[colIndex.category]?.toString().trim() || '';

        // 解析选项
        let options = [];
        let answer = {};

        // 解析选项格式：A.选项1 B.选项2 C.选项3 D.选项4
        if (optionsStr) {
          const optionParts = optionsStr.split(/\s+(?=[A-Z]\.)/).filter(p => p.trim());
          for (const part of optionParts) {
            const match = part.match(/^([A-Z])\.(.+)$/);
            if (match) {
              options.push({ key: match[1], value: match[2].trim() });
            }
          }
        }

        // 如果没有选项，生成默认选项
        if (options.length === 0) {
          if (type === 'truefalse') {
            options = [
              { key: 'A', value: '正确' },
              { key: 'B', value: '错误' }
            ];
          } else {
            options = [
              { key: 'A', value: '选项A' },
              { key: 'B', value: '选项B' },
              { key: 'C', value: '选项C' },
              { key: 'D', value: '选项D' }
            ];
          }
        }

        // 解析答案
        if (type === 'multiple') {
          // 多选题答案：A,B,C
          const selected = answerStr.split(/[,，]/).map(s => s.trim().toUpperCase()).filter(s => s);
          answer = { selected: selected.join(',') };
        } else {
          // 单选/判断题答案：A
          answer = { selected: answerStr.trim().toUpperCase() || 'A' };
        }

        // 查找或创建分类
        let categoryId = null;
        if (categoryName) {
          const existingCategory = db.prepare('SELECT id FROM categories WHERE name = ?').get(categoryName);
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            categoryId = randomUUID();
            db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(categoryId, categoryName);
          }
        }

        // 创建题目
        const questionId = randomUUID();
        console.log('插入题目:', { questionId, title: title.substring(0, 20), type, difficulty });
        
        db.prepare(`
          INSERT INTO questions (id, user_id, title, content, type, difficulty, options, answer, explanation, category_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(questionId, userId, title, title, type, difficulty, JSON.stringify(options), JSON.stringify(answer), explanation, categoryId);

        // 关联到题库
        const relationId = randomUUID();
        db.prepare(`
          INSERT INTO bank_questions (id, bank_id, question_id)
          VALUES (?, ?, ?)
        `).run(relationId, id, questionId);

        importedCount++;
      } catch (rowError) {
        errorCount++;
        errors.push(`第 ${i + 1} 行：${rowError.message}`);
      }
    }

    // 更新题库题目数量
    const count = db.prepare('SELECT COUNT(*) as count FROM bank_questions WHERE bank_id = ?').get(id);
    db.prepare('UPDATE question_banks SET question_count = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(count.count, id);

    // 删除上传的文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `导入完成：成功 ${importedCount} 道，失败 ${errorCount} 道`,
      imported: importedCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('导入题目失败:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败：' + error.message
    });
  }
});

export default router;
