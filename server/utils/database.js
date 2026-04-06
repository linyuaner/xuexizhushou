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

// 插入示例数据
function insertSampleData() {
  // 检查是否已有数据
  const result = db.exec('SELECT COUNT(*) as count FROM categories');
  if (result.length > 0 && result[0].values[0][0] > 0) {
    console.log('示例数据已存在，跳过插入');
    return;
  }

  console.log('插入示例数据...');

  // 插入分类
  const categories = [
    { id: randomUUID(), name: '数学', description: '数学相关题目' },
    { id: randomUUID(), name: '语文', description: '语文相关题目' },
    { id: randomUUID(), name: '英语', description: '英语相关题目' },
    { id: randomUUID(), name: '物理', description: '物理相关题目' },
    { id: randomUUID(), name: '化学', description: '化学相关题目' }
  ];

  for (const cat of categories) {
    db.run('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [cat.id, cat.name, cat.description]);
  }

  // 插入示例题目
  const questions = [
    // 数学题目
    {
      id: randomUUID(),
      title: '一元二次方程求解',
      content: '求解方程 x² - 5x + 6 = 0',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: 'x = 1 或 x = 6' },
        { key: 'B', value: 'x = 2 或 x = 3' },
        { key: 'C', value: 'x = -2 或 x = -3' },
        { key: 'D', value: 'x = 1 或 x = 5' }
      ]),
      answer: JSON.stringify({ selected: 'B' }),
      explanation: '因式分解：(x-2)(x-3)=0，所以 x=2 或 x=3',
      difficulty: 'easy',
      category_id: categories[0].id
    },
    {
      id: randomUUID(),
      title: '三角函数计算',
      content: 'sin(30°) 的值是多少？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: '0' },
        { key: 'B', value: '0.5' },
        { key: 'C', value: '0.707' },
        { key: 'D', value: '1' }
      ]),
      answer: JSON.stringify({ selected: 'B' }),
      explanation: 'sin(30°) = 1/2 = 0.5',
      difficulty: 'easy',
      category_id: categories[0].id
    },
    {
      id: randomUUID(),
      title: '概率计算',
      content: '一个袋子里有3个红球和2个白球，任意摸出2个球，都是红球的概率是多少？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: '3/10' },
        { key: 'B', value: '3/5' },
        { key: 'C', value: '2/5' },
        { key: 'D', value: '1/2' }
      ]),
      answer: JSON.stringify({ selected: 'A' }),
      explanation: 'C(3,2)/C(5,2) = 3/10',
      difficulty: 'medium',
      category_id: categories[0].id
    },
    {
      id: randomUUID(),
      title: '导数计算',
      content: '求函数 f(x) = x³ - 3x² + 2x 的导数',
      type: 'fill',
      options: JSON.stringify([]),
      answer: JSON.stringify({ text: "f'(x) = 3x² - 6x + 2" }),
      explanation: '使用幂函数求导法则：(xⁿ)\' = nxⁿ⁻¹',
      difficulty: 'medium',
      category_id: categories[0].id
    },
    {
      id: randomUUID(),
      title: '平面几何',
      content: '在直角三角形中，勾股定理的内容是什么？',
      type: 'fill',
      options: JSON.stringify([]),
      answer: JSON.stringify({ text: 'a² + b² = c²，其中c是斜边' }),
      explanation: '勾股定理：直角三角形两直角边的平方和等于斜边的平方',
      difficulty: 'easy',
      category_id: categories[0].id
    },
    // 语文题目
    {
      id: randomUUID(),
      title: '古诗词理解',
      content: '"床前明月光，疑是地上霜"出自哪位诗人？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: '杜甫' },
        { key: 'B', value: '白居易' },
        { key: 'C', value: '李白' },
        { key: 'D', value: '王维' }
      ]),
      answer: JSON.stringify({ selected: 'C' }),
      explanation: '出自李白的《静夜思》',
      difficulty: 'easy',
      category_id: categories[1].id
    },
    {
      id: randomUUID(),
      title: '文学常识',
      content: '《红楼梦》的作者是谁？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: '罗贯中' },
        { key: 'B', value: '施耐庵' },
        { key: 'C', value: '曹雪芹' },
        { key: 'D', value: '吴承恩' }
      ]),
      answer: JSON.stringify({ selected: 'C' }),
      explanation: '《红楼梦》是清代作家曹雪芹所著',
      difficulty: 'easy',
      category_id: categories[1].id
    },
    // 英语题目
    {
      id: randomUUID(),
      title: '语法选择',
      content: 'I ___ to Beijing last week.',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: 'go' },
        { key: 'B', value: 'went' },
        { key: 'C', value: 'going' },
        { key: 'D', value: 'will go' }
      ]),
      answer: JSON.stringify({ selected: 'B' }),
      explanation: 'last week表示过去时间，使用一般过去时',
      difficulty: 'easy',
      category_id: categories[2].id
    },
    // 物理题目
    {
      id: randomUUID(),
      title: '力学基础',
      content: '牛顿第二定律的公式是什么？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: 'F = m + a' },
        { key: 'B', value: 'F = m - a' },
        { key: 'C', value: 'F = ma' },
        { key: 'D', value: 'F = m/a' }
      ]),
      answer: JSON.stringify({ selected: 'C' }),
      explanation: '牛顿第二定律：F = ma，力等于质量乘以加速度',
      difficulty: 'easy',
      category_id: categories[3].id
    },
    // 化学题目
    {
      id: randomUUID(),
      title: '化学元素',
      content: '水的化学式是什么？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: 'CO2' },
        { key: 'B', value: 'H2O' },
        { key: 'C', value: 'NaCl' },
        { key: 'D', value: 'O2' }
      ]),
      answer: JSON.stringify({ selected: 'B' }),
      explanation: '水由两个氢原子和一个氧原子组成，化学式为H2O',
      difficulty: 'easy',
      category_id: categories[4].id
    },
    {
      id: randomUUID(),
      title: '化学反应类型',
      content: '下列哪个是化合反应？',
      type: 'single',
      options: JSON.stringify([
        { key: 'A', value: '2H2O → 2H2 + O2' },
        { key: 'B', value: 'C + O2 → CO2' },
        { key: 'C', value: 'Zn + 2HCl → ZnCl2 + H2' },
        { key: 'D', value: 'CaCO3 → CaO + CO2' }
      ]),
      answer: JSON.stringify({ selected: 'B' }),
      explanation: '化合反应：多种反应物生成一种生成物',
      difficulty: 'medium',
      category_id: categories[4].id
    }
  ];

  for (const q of questions) {
    db.run(`
      INSERT INTO questions (id, title, content, type, options, answer, explanation, difficulty, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [q.id, q.title, q.content, q.type, q.options, q.answer, q.explanation, q.difficulty, q.category_id]);
  }

  // 插入默认题库
  const defaultBank = {
    id: randomUUID(),
    user_id: null,
    name: '通用题库',
    description: '系统默认题库，包含各学科基础题目',
    question_count: questions.length
  };

  db.run(`
    INSERT INTO question_banks (id, user_id, name, description, question_count)
    VALUES (?, ?, ?, ?, ?)
  `, [defaultBank.id, defaultBank.user_id, defaultBank.name, defaultBank.description, defaultBank.question_count]);

  // 将所有题目添加到默认题库
  for (const q of questions) {
    db.run(`
      INSERT INTO bank_questions (id, bank_id, question_id) VALUES (?, ?, ?)
    `, [randomUUID(), defaultBank.id, q.id]);
  }

  console.log(`示例数据插入完成：${categories.length} 个分类，${questions.length} 道题目`);
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
