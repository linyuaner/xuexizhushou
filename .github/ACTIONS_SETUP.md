# GitHub Actions 配置指南

本项目的 CI/CD 流程由 GitHub Actions 驱动，共包含两个工作流文件。

---

## 工作流概览

| 文件 | 触发条件 | 职责 |
|------|----------|------|
| `.github/workflows/ci.yml` | PR / push 到 `main`、`develop` | 前端构建验证、后端语法检查、单元测试、Docker 构建验证 |
| `.github/workflows/cd.yml` | push 到 `main` / 手动触发 | 构建多架构 Docker 镜像 → 推送到镜像仓库 → SSH 部署到服务器 |

---

## 必须配置的 GitHub Secrets

前往仓库页面 → **Settings → Secrets and variables → Actions → New repository secret**

### Docker Hub 推送（可选，推荐用 GHCR 替代）

| Secret 名称 | 说明 |
|-------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token（[生成地址](https://hub.docker.com/settings/security)） |

> 如果不使用 Docker Hub，删除 `cd.yml` 中 `DOCKERHUB_IMAGE` 相关的 `images:` 行即可。
> GitHub Container Registry (GHCR) 无需额外配置，使用自带的 `GITHUB_TOKEN`。

### SSH 部署到服务器

| Secret 名称 | 说明 | 示例值 |
|-------------|------|--------|
| `SSH_HOST` | 服务器 IP 或域名 | `1.2.3.4` |
| `SSH_USER` | SSH 登录用户名 | `ubuntu` |
| `SSH_PRIVATE_KEY` | SSH 私钥内容（整个 `-----BEGIN...-----END...` 块） | — |
| `SSH_PORT` | SSH 端口（可选，默认 22） | `22` |
| `JWT_SECRET` | 生产环境 JWT 密钥（最少 32 字符随机字符串） | `your-super-secret-key` |
| `PRODUCTION_URL` | 生产环境访问 URL（用于 GitHub Environment 显示） | `https://your-domain.com` |

### 预发布环境（使用 `workflow_dispatch` 手动触发时）

| Secret 名称 | 说明 |
|-------------|------|
| `STAGING_SSH_HOST` | 预发布服务器 IP |
| `STAGING_SSH_USER` | 预发布服务器 SSH 用户名 |
| `STAGING_JWT_SECRET` | 预发布环境 JWT 密钥 |
| `STAGING_URL` | 预发布环境访问 URL |

---

## 生成 SSH 密钥对

在本地或服务器执行：

```bash
# 生成密钥对（不设置密码）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""

# 将公钥添加到服务器的授权列表
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys

# 将私钥内容完整复制到 GitHub Secret SSH_PRIVATE_KEY
cat ~/.ssh/deploy_key
```

---

## 配置 GitHub Environments（可选但推荐）

GitHub Environments 可以为部署添加审批保护：

1. 仓库页面 → **Settings → Environments → New environment**
2. 创建名为 `production` 的 Environment
3. 勾选 **Required reviewers** → 添加自己
4. 这样每次 CD 部署到生产前都需要手动审批

---

## CI 流程说明

```
Push / PR
    │
    ├─ Job 1: 前端构建验证 ─────────────────────┐
    │   npm ci → npm run build                   │
    │   ↓ 上传 dist 产物（3天保留）              │
    │                                            │
    ├─ Job 2: 后端验证 ──────────────────────────┤
    │   npm ci → 语法检查 → 服务器启动测试       │
    │                                            │
    ├─ Job 3: 前端单元测试 (Vitest) ─────────────┤
    │   npm test                                  │
    │                                            ▼
    └─ Job 4: Docker 构建验证（依赖 Job1+2）──────┘
        docker build → 容器健康检查
```

---

## CD 流程说明

```
Push to main
    │
    └─ Job 1: 构建 & 推送镜像
        Docker Buildx（amd64 + arm64）
        → 推送到 GHCR / Docker Hub
        → 输出镜像摘要
        │
        └─ Job 2: 部署到生产服务器
            SSH 连接 → docker pull → docker run
            → 健康检查（最多等待 30s）
            → 失败时回滚
```

---

## 本地验证工作流（act）

使用 [act](https://github.com/nektos/act) 在本地模拟 GitHub Actions：

```bash
# 安装 act
brew install act  # macOS
# 或 choco install act-cli  # Windows

# 本地运行 CI 工作流
act push --job frontend-build

# 本地运行所有 CI Job
act push -W .github/workflows/ci.yml
```

---

## 常见问题

**Q: CD 工作流推送后没有触发？**
A: 检查 `paths` 过滤规则，仅 `src/`、`server/`、`Dockerfile` 等路径变更才触发。修改文档不会触发。

**Q: Docker 镜像构建超时？**
A: CI 使用了 GitHub Actions Cache (`type=gha`) 加速 BuildKit 缓存，第一次构建较慢（约 5-8 分钟），后续有缓存约 2-3 分钟。

**Q: 如何只部署到预发布环境？**
A: 在仓库 Actions 页面 → 选择 `CD` 工作流 → `Run workflow` → 选择 `staging` 环境。
