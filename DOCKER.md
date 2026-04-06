# Docker 部署指南

## 项目架构概览

```
学习助手/
├── src/               # 前端：Vue 3 + Vite + Element Plus
├── server/            # 后端：Node.js + Express + sql.js
│   ├── data/          # SQLite 数据库（Volume 挂载持久化）
│   ├── uploads/       # 上传文件（Volume 挂载持久化）
│   └── public/        # 构建时注入的前端静态产物
├── Dockerfile         # 多阶段构建
├── docker-compose.yml # 一键编排
└── .dockerignore      # 构建上下文过滤
```

---

## 多阶段构建说明

| Stage | 基础镜像 | 作用 |
|-------|---------|------|
| `frontend-deps` | node:20-alpine | 安装前端全量依赖（含 devDeps） |
| `frontend-builder` | node:20-alpine | `vite build` 生成静态产物 |
| `backend-deps` | node:20-alpine | 仅安装后端生产依赖（`--omit=dev`） |
| `production` | node:20-alpine | 最终镜像，只包含运行时所需文件 |

**镜像优化要点：**
- 使用 `node:20-alpine`（约 180 MB），替代 `node:20`（约 1 GB）
- `--omit=dev` 排除开发依赖
- 构建产物与源码分离，源码不进入最终镜像
- 以非 root 用户 `appuser` 运行，提升安全性
- `.dockerignore` 排除 `node_modules`、`.git` 等，大幅缩短构建时间

---

## 快速启动

### 方式一：docker compose（推荐）

```bash
# 首次构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f app

# 停止
docker compose down

# 停止并清除数据（⚠️ 会删除数据库文件）
docker compose down -v
```

### 方式二：手动 docker 命令

```bash
# 构建镜像
docker build -t ghcr.io/linyuaner/study-helper:latest .

# 运行容器
docker run -d \
  --name study-helper-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret-key \
  -v study-helper-data:/app/server/data \
  -v study-helper-uploads:/app/server/uploads \
  ghcr.io/linyuaner/study-helper:latest
```

---

## 访问地址

服务启动后，打开浏览器访问：

```
http://localhost:3000
```

- 前端页面和后端 API 由同一个 Node.js 服务提供
- API 路径统一以 `/api/` 开头
- 健康检查：`http://localhost:3000/api/health`

默认管理员账号：
- 用户名：`admin`
- 密码：首次启动时自动生成随机密码
- 查看初始密码：`docker compose logs app | grep "Admin password"`

---

## 密码重置

如果需要重置用户密码，可以在Docker容器中运行密码重置脚本：

```bash
# 进入运行中的容器
docker exec -it study-helper-app sh

# 在容器内运行密码重置脚本
node reset-password.js <用户名> <新密码>

# 示例：重置admin用户密码
node reset-password.js admin newpassword123

# 退出容器
exit
```

或者一行命令：
```bash
docker exec -it study-helper-app node reset-password.js admin newpassword123
```

**注意事项：**
- 新密码长度至少6位
- 只有能访问Docker终端的用户才能重置密码
- 重置密码后需要重新登录

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3000` | 监听端口 |
| `JWT_SECRET` | `change-me-in-production` | JWT 签名密钥，**生产必须修改** |

生产环境建议创建 `.env` 文件：

```env
JWT_SECRET=your-very-long-random-secret-key
PORT=3000
```

---

## 数据持久化

数据存储在 Docker Named Volume 中：

| Volume | 容器路径 | 内容 |
|--------|---------|------|
| `quiz-data` | `/app/server/data` | SQLite 数据库 `quiz.db` |
| `quiz-uploads` | `/app/server/uploads` | 用户上传的文件 |

备份数据：
```bash
# 备份数据库
docker run --rm \
  -v quiz-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/quiz-data-backup.tar.gz /data
```

---

## 预期镜像大小

| 镜像类型 | 预计大小 |
|---------|---------|
| 最终生产镜像 | ~200–250 MB |
| 含前端源码的完整镜像 | ~800 MB+ |

通过多阶段构建，最终镜像体积可缩减 **70%+**。
