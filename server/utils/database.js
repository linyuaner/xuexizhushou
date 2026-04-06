// 数据库初始化脚本 - 使用 sql.js
import initSqlJs from 'sql.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件路径
const dbPath = join(__dirname, '../data/quiz.db');
const dataDir = join(__dirname, '../data');

let db = null;

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建所有表
function createTables() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);



  // 分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 题目表
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      explanation TEXT,
      difficulty TEXT DEFAULT 'medium',
      category_id TEXT,
      tags TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // 题库表
  db.run(`
    CREATE TABLE IF NOT EXISTS question_banks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      question_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 题库-题目关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_questions (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_id) REFERENCES question_banks(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // 练习历史表
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_id TEXT,
      practice_type TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      start_time DATETIME,
      end_time DATETIME,
      duration INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      current_question_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (bank_id) REFERENCES question_banks(id)
    )
  `);

  // 用户答案表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_answers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT,
      is_correct INTEGER DEFAULT 0,
      practice_session_id TEXT,
      time_spent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (practice_session_id) REFERENCES practice_history(id)
    )
  `);

  // 用户收藏表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      UNIQUE(user_id, question_id)
    )
  `);

  // 用户笔记表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // 题目统计表
  db.run(`
    CREATE TABLE IF NOT EXISTS question_stats (
      id TEXT PRIMARY KEY,
      question_id TEXT UNIQUE NOT NULL,
      total_attempts INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      error_rate REAL DEFAULT 0,
      average_time REAL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_practice_history_user ON practice_history(user_id)`);
}

// 插入示例数据（已禁用）
function insertSampleData() {
  console.log('示例数据插入已禁用');
}

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 数据库操作辅助函数
const dbHelper = {
  prepare(sql) {
    return {
      run: (...params) => {
        console.log('执行 SQL:', sql.substring(0, 50) + '...');
        console.log('参数:', params);
        db.run(sql, params);
        saveDatabase();
        console.log('数据库已保存');
        return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] };
      },
      get: (...params) => {
        const result = db.exec(sql, params);
        if (result.length === 0) return null;
        const columns = result[0].columns;
        const values = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => obj[col] = values[i]);
        return obj;
      },
      all: (...params) => {
        const result = db.exec(sql, params);
        if (result.length === 0) return [];
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => obj[col] = row[i]);
          return obj;
        });
      }
    };
  }
};

// 导出数据库实例和初始化函数
export function getDatabase() {
  return dbHelper;
}

export async function initializeDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    const SQL = await initSqlJs();
    
    // 尝试加载已有数据库
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('已加载已有数据库');
    } else {
      db = new SQL.Database();
      console.log('创建新数据库');
    }
    
    createTables();
    insertSampleData();
    saveDatabase();
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

export default { getDatabase, initializeDatabase };
