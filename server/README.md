# 刷题助手后端 API 服务

基于 Node.js + Express + sql.js (SQLite) 的刷题助手后端服务。

## 技术栈

- Node.js 18+
- Express.js 4.21.2
- sql.js 1.11.0 (纯JavaScript实现的SQLite)
- jsonwebtoken 9.0.2 (JWT认证)
- bcryptjs 2.4.3 (密码加密)
- multer 2.1.1 (文件上传)
- xlsx 0.18.5 (Excel文件处理)
- cors 2.8.5 (跨域处理)
- dotenv 16.4.7 (环境变量)
- uuid 11.0.4 (UUID生成)

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```env
PORT=3000
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
DATABASE_PATH=./data/quiz.db
NODE_ENV=development
```

### 3. 启动服务

```bash
npm start
```

服务将在 http://localhost:3000 启动。

### 4. 默认账户

首次启动会自动创建管理员账户：
- 用户名: `admin`
- 密码: `admin123`

## API 接口

### 认证接口 `/api/auth`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /register | 用户注册 | 否 |
| POST | /login | 用户登录 | 否 |
| GET | /me | 获取当前用户 | 是 |
| PUT | /profile | 更新用户信息 | 是 |
| PUT | /password | 修改密码 | 是 |

### 题目接口 `/api/questions`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | / | 获取题目列表 | 可选 |
| GET | /:id | 获取题目详情 | 可选 |
| POST | / | 创建题目 | 是 |
| PUT | /:id | 更新题目 | 是 |
| DELETE | /:id | 删除题目 | 是 |

### 练习接口 `/api/practice`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /sessions | 创建练习会话 | 是 |
| GET | /sessions/:id | 获取会话详情 | 是 |
| POST | /answers | 提交答案 | 是 |
| GET | /history | 获取练习历史 | 是 |
| GET | /wrong | 获取错题列表 | 是 |
| GET | /easy-wrong | 获取易错题列表 | 是 |

### 题库接口 `/api/banks`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | / | 获取题库列表 | 可选 |
| POST | / | 创建题库 | 是 |
| GET | /:id | 获取题库详情 | 可选 |
| PUT | /:id | 更新题库 | 是 |
| DELETE | /:id | 删除题库 | 是 |
| POST | /:id/import | 导入题目(Excel) | 是 |
| POST | /:id/questions | 添加题目到题库 | 是 |

### 收藏接口 `/api/favorites`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | / | 获取收藏列表 | 是 |
| POST | / | 添加收藏 | 是 |
| DELETE | /:id | 取消收藏 | 是 |

### 笔记接口 `/api/notes`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | / | 获取笔记列表 | 是 |
| POST | / | 创建笔记 | 是 |
| PUT | /:id | 更新笔记 | 是 |
| DELETE | /:id | 删除笔记 | 是 |

### 统计接口 `/api/stats`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /progress | 学习进度统计 | 是 |
| GET | /trend | 练习趋势分析 | 是 |

## 数据库表结构

项目使用 sql.js（纯JavaScript实现的SQLite），数据库文件存储在 `data/quiz.db`。

### 数据表
- `users` - 用户表
- `categories` - 分类表
- `questions` - 题目表
- `question_banks` - 题库表
- `bank_questions` - 题库-题目关联表
- `practice_history` - 练习历史表
- `user_answers` - 用户答案表
- `user_favorites` - 用户收藏表
- `user_notes` - 用户笔记表
- `question_stats` - 题目统计表

### 自动初始化
首次启动服务时，系统会自动：
1. 创建数据库文件
2. 创建所有数据表
3. 插入示例分类数据
4. 插入示例题目数据
5. 创建默认题库
6. 创建管理员账户

## 响应格式

所有接口返回统一格式：

```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

错误响应：

```json
{
  "success": false,
  "message": "错误信息"
}
```

## 认证方式

使用 JWT Token 认证。在请求头中添加：

```
Authorization: Bearer <token>
```

## 许可

MIT License
