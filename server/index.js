import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// 导入路由
import authRoutes from './routes/auth.js';
import questionsRoutes from './routes/questions.js';
import practiceRoutes from './routes/practice.js';
import banksRoutes from './routes/banks.js';
import favoritesRoutes from './routes/favorites.js';
import notesRoutes from './routes/notes.js';
import statsRoutes from './routes/stats.js';

// 导入数据库初始化
import { initializeDatabase, getDatabase } from './utils/database.js';

// 默认管理员配置

const DEFAULT_ADMIN = {
  username: 'admin',
  password: process.env.ADMIN_PASSWORD || randomBytes(8).toString('hex'),
  email: 'admin@example.com'
};

// 创建默认管理员用户
async function createDefaultAdmin() {
  const db = getDatabase();
  
  // 检查管理员是否已存在（按用户名检查）
  const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get(DEFAULT_ADMIN.username);
  if (existingAdmin) {
    console.log('✅ 管理员账户已存在:', DEFAULT_ADMIN.username);
    return;
  }
  
  try {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    const adminId = randomUUID();
    
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(adminId, DEFAULT_ADMIN.username, DEFAULT_ADMIN.email, passwordHash);
    
    console.log('✅ 默认管理员账户已创建:');
    console.log('   用户名:', DEFAULT_ADMIN.username);
    console.log('   密码:', DEFAULT_ADMIN.password);
  } catch (error) {
    console.error('创建管理员失败:', error);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保数据目录存在
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 静态文件服务（上传目录）
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/banks', banksRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/stats', statsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务器运行正常', timestamp: new Date().toISOString() });
});

// ── 生产环境：服务前端静态文件 ──────────────────────────────
// Docker 构建时前端 dist 被复制至 server/public
const publicDir = join(__dirname, 'public');
if (process.env.NODE_ENV === 'production' && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA 回退：将所有非 /api 路由指向 index.html（支持 Vue Router history 模式）
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
} else {
  // 开发模式：API 404 兜底
  app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: '接口不存在' });
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    success: false, 
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    await initializeDatabase();
    console.log('数据库初始化完成');
    
    // 创建默认管理员
    await createDefaultAdmin();
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📚 API文档: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
