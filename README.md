# 刷题助手 - 学习辅助应用

> 基于 Vue 3 + Node.js + SQLite 的刷题练习平台

## 项目简介

这是一个功能完善的在线刷题学习系统，支持多种练习模式、题目管理、学习数据统计等功能。

## 技术栈

### 前端
- Vue 3.5.13 (Composition API)
- Vite 6.0.0
- Element Plus 2.9.1
- Pinia 2.3.0 (状态管理)
- Vue Router 4.5.0
- Axios 1.7.9
- ECharts 5.5.1 (数据可视化)
- UnoCSS 0.65.3 (原子化CSS)

### 后端
- Node.js 18+
- Express.js 4.21.2
- sql.js 1.11.0 (SQLite数据库)
- JWT (jsonwebtoken 9.0.2)
- bcryptjs 2.4.3 (密码加密)

## 功能特性

### 核心功能
- 用户注册/登录（JWT认证）
- 题目浏览与搜索
- 多种练习模式
  - 顺序练习
  - 随机练习
  - 模拟考试
  - 错题练习
  - 易错题练习
  - 收藏练习
- 题目收藏与笔记
- 学习数据统计（ECharts图表）
- 题库管理（支持Excel导入）

### 支持题型
- 单选题
- 多选题
- 判断题
- 填空题
- 简答题

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 2. 配置环境变量

前端配置文件 `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

后端配置文件 `server/.env`:
```env
PORT=3000
JWT_SECRET=your-super-secret-key-at-least-32-characters
DATABASE_PATH=./data/quiz.db
```

### 3. 启动服务

```bash
# 启动后端服务
cd server
npm start

# 新开终端，启动前端服务
npm run dev
```

### 4. 访问应用

- 前端地址: http://localhost:5173
- 后端API: http://localhost:3000
- API健康检查: http://localhost:3000/api/health
- 默认管理员: 用户名 `admin`，密码首次启动时自动生成
- 查看初始密码: 启动后查看日志 `npm start` 输出或 `docker compose logs app`

## 项目结构

```
刷题助手/
├── src/                      # 前端源码
│   ├── api/                  # API请求封装
│   ├── components/           # 可复用组件
│   │   ├── common/           # 通用组件
│   │   └── layout/           # 布局组件
│   ├── router/               # 路由配置
│   ├── stores/               # Pinia状态管理
│   ├── styles/               # 全局样式
│   ├── utils/                # 工具函数
│   └── views/                # 页面组件
├── server/                   # 后端源码
│   ├── data/                 # SQLite数据库文件
│   ├── middleware/           # 中间件
│   ├── routes/               # API路由
│   ├── utils/                # 工具函数
│   └── index.js              # 服务器入口
├── .env                      # 前端环境变量
├── index.html                # HTML入口
├── package.json              # 前端依赖
├── vite.config.js            # Vite配置
└── uno.config.ts             # UnoCSS配置
```

## API接口

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户

### 题目接口
- `GET /api/questions` - 获取题目列表
- `GET /api/questions/:id` - 获取题目详情
- `POST /api/questions` - 创建题目
- `GET /api/questions/categories/list` - 获取分类列表

### 练习接口
- `POST /api/practice/sessions` - 创建练习会话
- `POST /api/practice/answers` - 提交答案
- `POST /api/practice/sessions/:id/complete` - 完成练习
- `GET /api/practice/history` - 获取练习历史
- `GET /api/practice/wrong` - 获取错题列表

### 题库接口
- `GET /api/banks` - 获取题库列表
- `POST /api/banks` - 创建题库
- `GET /api/banks/:id` - 获取题库详情
- `POST /api/banks/:id/questions` - 添加题目到题库

### 收藏接口
- `GET /api/favorites` - 获取收藏列表
- `POST /api/favorites` - 添加收藏
- `DELETE /api/favorites/:id` - 取消收藏

### 笔记接口
- `GET /api/notes` - 获取笔记列表
- `POST /api/notes` - 创建笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

### 统计接口
- `GET /api/stats/progress` - 学习进度统计
- `GET /api/stats/trend` - 练习趋势分析



## 使用说明

1. **注册账号**: 点击注册按钮创建新账号
2. **浏览题目**: 在题目页面查看所有题目，支持筛选和搜索
3. **开始练习**: 选择题库和练习模式开始刷题
4. **查看统计**: 在个人中心查看学习数据和进度

## 开发指南

### 添加新页面
1. 在 `src/views/` 创建页面组件
2. 在 `src/router/index.js` 添加路由配置

### 添加API接口
1. 在 `server/routes/` 创建路由文件
2. 在 `server/index.js` 注册路由

### 添加组件
1. 在 `src/components/` 创建组件文件
2. 在需要的页面中导入使用

## 许可证

MIT License
