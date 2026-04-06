# GitHub Actions 配置指南

本项目的 CI/CD 流程由 GitHub Actions 驱动，共包含两个工作流文件。

---

## 工作流概览

| 文件 | 触发条件 | 职责 |
|------|----------|------|
| `.github/workflows/ci.yml` | PR / push 到 `main`、`develop` | 前端构建验证、后端语法检查、单元测试、Docker 构建验证 |
| `.github/workflows/cd.yml` | push 到 `main` / 手动触发 | 构建多架构 Docker 镜像 → 推送到 GitHub Container Registry (GHCR) |

---

## 必须配置的 GitHub Secrets

前往仓库页面 → **Settings → Secrets and variables → Actions → New repository secret**

### GitHub Container Registry (GHCR) 配置

**无需额外配置**，GitHub Actions 会自动提供 `GITHUB_TOKEN` 用于 GHCR 认证。

> 仓库需要开启 Packages 权限，默认情况下是开启的。

### 可选配置（如果需要使用 Docker Hub）

| Secret 名称 | 说明 |
|-------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token（[生成地址](https://hub.docker.com/settings/security)） |

> 本项目默认只推送到 GHCR，如需推送到 Docker Hub，请修改 `cd.yml` 文件中的镜像配置。

---

## 配置 GitHub Environments（可选）

GitHub Environments 可以为部署添加审批保护：

1. 仓库页面 → **Settings → Environments → New environment**
2. 创建名为 `production` 的 Environment
3. 勾选 **Required reviewers** → 添加自己
4. 这样每次 CD 部署前都需要手动审批

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
    └─ Job 1: 构建 & 推送镜像到 GHCR
        Docker Buildx（amd64 + arm64）
        → 推送到 GitHub Container Registry (GHCR)
        → 输出镜像摘要和构建结果
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

**Q: 如何查看构建的镜像？**
A: 在 GitHub 仓库页面 → **Packages** 标签页查看已发布的镜像。
