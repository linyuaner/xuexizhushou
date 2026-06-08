# =============================================================================
# 学习助手 - 多阶段构建 Dockerfile (支持热更新)
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
# Stage 3: 后端依赖安装（生产 + 开发依赖用于编译）
# ─────────────────────────────────────────────
FROM node:20-alpine AS backend-deps

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./

# 安装所有依赖（包括 devDependencies 用于编译 TypeScript）
RUN npm ci --prefer-offline

# ─────────────────────────────────────────────
# Stage 4: 后端 TypeScript 编译
# ─────────────────────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# 复制依赖和源码
COPY --from=backend-deps /app/server/node_modules ./node_modules
COPY server/package.json server/package-lock.json server/tsconfig.json ./
COPY server/src/ ./src/
COPY server/VERSION ./VERSION

# 编译 TypeScript
RUN npm run build

# ─────────────────────────────────────────────
# Stage 5: 后端生产依赖
# ─────────────────────────────────────────────
FROM node:20-alpine AS backend-prod-deps

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./

# 仅安装生产依赖，大幅减小镜像体积
RUN npm ci --omit=dev --prefer-offline

# ─────────────────────────────────────────────
# Stage 6: 热更新依赖安装
# ─────────────────────────────────────────────
FROM node:20-alpine AS hot-update-base

# 安装热更新需要的工具：wget (下载代码), tar (解压), bash
RUN apk add --no-cache wget tar bash coreutils git

# 将 npm 和 node 复制到后续阶段
COPY --from=backend-deps /app/server/node_modules /base-node-modules
COPY --from=backend-builder /app/server/node_modules /base-dev-node-modules

# ─────────────────────────────────────────────
# Stage 7: 最终生产镜像 (支持热更新)
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

# 安装热更新需要的工具
RUN apk add --no-cache wget tar bash coreutils

# 安全：不以 root 运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 复制后端生产依赖
COPY --from=backend-prod-deps /app/server/node_modules ./server/node_modules

# 复制编译后的后端代码
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/server/VERSION ./server/VERSION

# 复制热更新基础依赖 (用于热更新时重新构建)
COPY --from=hot-update-base /base-node-modules ./server/node_modules-base
COPY --from=hot-update-base /base-dev-node-modules ./server/node_modules-dev

# 复制启动脚本和热更新脚本
COPY server/start.sh ./server/start.sh
COPY server/hot-update.sh ./server/hot-update.sh

# 将前端构建产物放入后端的 public 目录（由 Express 静态服务）
COPY --from=frontend-builder /app/dist ./server/public

# 创建数据持久化目录并设置权限
RUN mkdir -p ./server/data ./server/uploads ./server/temp \
    && chown -R appuser:appgroup /app \
    && chmod +x ./server/start.sh ./server/hot-update.sh

# 切换到非 root 用户
USER appuser

# 暴露后端端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# 环境变量
ENV ENABLE_HOT_UPDATE=true
ENV HOT_UPDATE_INTERVAL=300
ENV GITHUB_REPO=linyuaner/xuexizhushou

# 启动后端服务（使用启动脚本进行版本检测和热更新）
WORKDIR /app/server
CMD ["./start.sh"]
