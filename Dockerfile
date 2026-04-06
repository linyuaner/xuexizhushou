# =============================================================================
# 学习助手 - 多阶段构建 Dockerfile
# 架构：Vue3 前端 (Vite 构建) + Node.js 后端 (Express + sql.js)
# =============================================================================

# ─────────────────────────────────────────────
# Stage 1: 前端依赖安装
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-deps

WORKDIR /app

# 只复制依赖声明文件，充分利用 Docker layer 缓存
COPY package.json package-lock.json ./

# 安装依赖（ci 更快更确定性，--omit=dev 仅在 build 阶段不适用，因为 vite 在 devDependencies）
RUN npm ci --prefer-offline

# ─────────────────────────────────────────────
# Stage 2: 前端构建
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# 复用上一阶段的 node_modules
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY vite.config.js uno.config.ts ./
COPY src/ ./src/
COPY index.html ./

# 构建静态产物
RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: 后端依赖安装（仅生产依赖）
# ─────────────────────────────────────────────
FROM node:20-alpine AS backend-deps

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./

# 仅安装生产依赖，大幅减小镜像体积
RUN npm ci --omit=dev --prefer-offline

# ─────────────────────────────────────────────
# Stage 4: 最终生产镜像
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

# 安全：不以 root 运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 复制后端生产代码 + 依赖
COPY --from=backend-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# 将前端构建产物放入后端的 public 目录（由 Express 静态服务）
COPY --from=frontend-builder /app/dist ./server/public

# 创建数据持久化目录并设置权限
RUN mkdir -p ./server/data ./server/uploads \
    && chown -R appuser:appgroup /app

# 切换到非 root 用户
USER appuser

# 暴露后端端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# 启动后端服务
WORKDIR /app/server
CMD ["node", "index.js"]
