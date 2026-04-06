# 项目长期记忆

## 项目：学习助手（study-helper）

### 技术栈
- **前端**：Vue 3 + Vite + UnoCSS + Element Plus + Pinia + Vue Router（SPA）
- **后端**：Node.js + Express + sql.js（SQLite 纯 JS 实现，数据文件：`server/data/quiz.db`）
- **前端端口**：5173（开发），**后端端口**：3000

### 项目结构
- `src/` — 前端源码（Vue 组件、路由、状态、API）
- `server/` — 后端（Express API，独立 package.json）
- `server/data/quiz.db` — SQLite 数据库（需 Volume 持久化）
- `server/uploads/` — 用户上传文件

### Docker 部署（2026-04-06 完成）
- 创建了 `Dockerfile`（4 阶段构建：frontend-deps → frontend-builder → backend-deps → production）
- 创建了 `docker-compose.yml`（含 Named Volume 持久化 + 健康检查）
- 创建了 `.dockerignore`
- 创建了 `DOCKER.md` 部署文档
- 修改了 `server/index.js`：生产环境下自动服务前端静态文件（`server/public/`），支持 Vue Router history 模式 SPA 回退
- 最终镜像基于 `node:20-alpine`，预计大小 200-250 MB（相比全量镜像缩减 70%+）

### 默认管理员
- 用户名：admin / 密码：admin123
