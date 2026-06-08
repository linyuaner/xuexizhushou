# 学习助手 - 完整架构图与部署指南

## 🏗️ 热更新架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker 容器内热更新流程                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐      ┌──────────────────────────────┐     │
│  │   容器启动 (start.sh) │      │   热更新后台进程 (hot-update.sh) │
│  │                     │      │                               │     │
│  │ 1. 版本检测          │      │ 1. 定时检查 GitHub Release    │     │
│  │ 2. 数据库迁移        │      │ 2. 发现新版本时:              │     │
│  │ 3. 启动热更新守护进程 │      │    - 下载源码                 │     │
│  │ 4. 启动主服务        │      │    - 在容器内构建             │     │
│  └─────────┬───────────┘      │    - 替换代码                 │     │
│            │                  │    - 通知主服务重启            │     │
│            ▼                  └──────────────┬────────────────┘     │
│  ┌─────────────────────┐                      │                     │
│  │   主服务循环         │                      │                     │
│  │                     │                      │                     │
│  │ - 运行 Express 服务  │                      │                     │
│  │ - 提供 API           │                      │                     │
│  │ - 提供静态前端       │                      │                     │
│  │ - 检测 .need-restart  │◄─────────────────────┘                     │
│  │ - 收到信号后重启     │                                              │
│  └─────────────────────┘                                              │
│                                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 完整更新流程

### 开发者视角

```bash
# 1. 推送代码到 GitHub
git add . && git commit -m "feat: add new feature"
git push

# 2. CI/CD 自动触发（GitHub Actions）
#    - 自动递增版本号
#    - 构建前端和后端
#    - 推送 Docker 镜像到 GHCR/Docker Hub
#    - 创建 GitHub Release

# 3. 容器中自动热更新
#    - 热更新进程检测到新版本
#    - 下载代码并构建
#    - 无缝重启服务
```

### 容器内部视角

```
时间轴 ────────────────────────────────────────────────────►

T0: 容器启动
    ├─ start.sh 执行版本检测
    ├─ 数据库迁移（如果需要）
    ├─ 启动热更新守护进程
    └─ 启动主服务

T1: 热更新守护进程定期检查（每 5 分钟）
    ├─ 查询 GitHub Release API
    ├─ 比较当前版本与远程版本
    └─ 发现新版本时触发更新

T2: 热更新执行
    ├─ 下载 GitHub Release 源码
    ├─ 解压并准备构建环境
    ├─ 使用预安装依赖加速构建
    ├─ 构建前端（Vite）
    ├─ 构建后端（TypeScript）
    ├─ 替换应用代码
    ├─ 备份并恢复数据
    └─ 创建 .need-restart 标记

T3: 主服务重启
    ├─ 主服务检测到 .need-restart
    ├─ 安全停止当前进程
    ├─ 加载新代码并启动
    └─ 清理重启标记

T4: 更新完成
    ├─ 服务正常运行在新版本
    └─ 继续监控下一版本
```

## 📁 文件结构

```
study-helper/
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # GitHub Actions CI/CD 工作流
├── scripts/
│   ├── bump-version.sh            # Linux/macOS 版本递增脚本
│   └── bump-version.ps1           # Windows 版本递增脚本
├── server/
│   ├── start.sh                   # Docker 容器启动脚本
│   ├── hot-update.sh              # Docker 热更新脚本
│   ├── VERSION                    # 版本号文件
│   ├── data/                      # 数据目录 (Docker 卷挂载)
│   │   ├── quiz.db                # SQLite 数据库
│   │   ├── update.log             # 更新日志
│   │   └── hot-update.log         # 热更新日志
│   └── uploads/                   # 上传文件目录
├── Dockerfile                     # Docker 构建文件
├── docker-compose.yml             # Docker Compose 配置
├── VERSION                        # 前端版本号
└── .env.example                   # 环境变量示例
```

## ⚙️ 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ENABLE_HOT_UPDATE` | `true` | 是否启用热更新 |
| `HOT_UPDATE_INTERVAL` | `300` | 热更新检查间隔（秒） |
| `GITHUB_REPO` | `jqlshr/study-helper` | GitHub 仓库地址 |

## 🚀 使用指南

### 首次部署

```bash
# 1. 克隆仓库
git clone https://github.com/jqlshr/study-helper.git
cd study-helper

# 2. 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件

# 3. 启动容器
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 禁用热更新

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - ENABLE_HOT_UPDATE=false
```

### 调整检查间隔

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - HOT_UPDATE_INTERVAL=600  # 10 分钟检查一次
```

### 使用自定义仓库

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - GITHUB_REPO=your-username/your-repo
```

## 🔍 监控与调试

### 查看热更新日志

```bash
# 实时查看热更新日志
docker exec study-helper-app cat /app/server/data/hot-update.log

# 查看容器日志
docker logs study-helper-app
```

### 手动触发更新

```bash
# 进入容器
docker exec -it study-helper-app sh

# 手动运行热更新检查
cd /app/server
./hot-update.sh --once
```

### 查看当前版本

```bash
# 查看容器内版本
docker exec study-helper-app cat /app/server/VERSION

# 通过 API 查看
curl http://localhost:3000/api/version
```

## ⚠️ 注意事项

1. **数据持久化**: 确保 `data` 和 `uploads` 目录使用 Docker 卷挂载
2. **网络访问**: 容器需要能够访问 GitHub API 和下载 Release
3. **权限问题**: 容器内以非 root 用户运行，确保目录权限正确
4. **热更新失败**: 如果热更新失败，容器会保持当前版本继续运行
5. **回滚**: 如需回滚，可以重新部署旧版本镜像

## 📊 性能优化

### 预安装依赖

Dockerfile 中包含预安装的 `node_modules` 用于加速热更新构建：

```dockerfile
COPY --from=hot-update-base /base-node-modules ./server/node_modules-base
COPY --from=hot-update-base /base-dev-node-modules ./server/node_modules-dev
```

这使得热更新时不需要重新下载依赖，大幅缩短更新时间。

### 镜像大小

```
阶段              大小
───────────────────────
生产依赖镜像      ~100 MB
含热更新依赖镜像  ~250 MB
```

建议根据实际需求选择是否启用热更新。

## 🔄 更新策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **热更新** | 无需重建镜像，实时生效 | 容器内需要构建工具，占用更多资源 | 开发环境、频繁更新 |
| **重建镜像** | 镜像更小更稳定 | 需要完整构建和部署流程 | 生产环境、稳定版本 |
| **混合模式** | 结合两者优点 | 配置更复杂 | 灵活选择更新方式 |

## 📋 CI/CD 工作流说明

统一的 [ci-cd.yml](file:///d:/桌面/学习助手/.github/workflows/ci-cd.yml) 工作流包含以下阶段：

| Job | 触发条件 | 功能 |
|-----|---------|------|
| **版本管理** | 手动触发 | 自动递增版本、创建 Git Tag、创建 Release |
| **前端构建** | 推送/PR/手动 | TypeScript 检查、构建、上传产物、测试 |
| **后端验证** | 推送/PR/手动 | TypeScript 检查、构建、启动验证 |
| **Docker 验证** | 推送/PR | 构建镜像（不推送）、容器健康检查 |
| **Docker 推送** | 手动触发 | 多架构构建、推送到 Docker Hub + GHCR |

### 推送代码时

```
推送代码到 main
        ↓
前端构建 + TypeScript 检查 + 测试 ✅
后端构建 + TypeScript 检查 + 启动验证 ✅
        ↓
Docker 构建验证 + 健康检查 ✅ (不推送)
```

### 手动触发时

```
手动触发工作流
        ↓
版本递增 + Git Tag + Release ✅
前端构建 + 后端构建 ✅
        ↓
Docker 多架构构建 + 推送到 Docker Hub + GHCR ✅
```
