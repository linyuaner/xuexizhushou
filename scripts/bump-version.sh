#!/bin/sh
# =============================================================================
# 版本号自动递增脚本
# 用法:
#   ./scripts/bump-version.sh         # 自动递增补丁版本 (1.0.0 -> 1.0.1)
#   ./scripts/bump-version.sh patch   # 递增补丁版本 (1.0.0 -> 1.0.1)
#   ./scripts/bump-version.sh minor   # 递增次版本 (1.0.0 -> 1.1.0)
#   ./scripts/bump-version.sh major   # 递增主版本 (1.0.0 -> 2.0.0)
#   ./scripts/bump-version.sh 1.2.3   # 设置为指定版本
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_VERSION="$ROOT_DIR/VERSION"
BACKEND_VERSION="$ROOT_DIR/server/VERSION"

get_current_version() {
    if [ -f "$FRONTEND_VERSION" ]; then
        cat "$FRONTEND_VERSION" | tr -d '[:space:]'
    else
        echo "1.0.0"
    fi
}

bump_version() {
    local current="$1"
    local bump_type="$2"
    
    local IFS='.'
    local parts=($current)
    local major=${parts[0]:-0}
    local minor=${parts[1]:-0}
    local patch=${parts[2]:-0}
    
    case "$bump_type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch|*)
            patch=$((patch + 1))
            ;;
    esac
    
    echo "${major}.${minor}.${patch}"
}

# 获取当前版本
CURRENT_VERSION=$(get_current_version)
echo "当前版本: $CURRENT_VERSION"

# 确定新版本
BUMP_TYPE="${1:-patch}"

if echo "$BUMP_TYPE" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    NEW_VERSION="$BUMP_TYPE"
    echo "设置为指定版本: $NEW_VERSION"
else
    NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP_TYPE")
    echo "递增${BUMP_TYPE}版本: $NEW_VERSION"
fi

# 更新前后端版本号
echo "$NEW_VERSION" > "$FRONTEND_VERSION"
echo "$NEW_VERSION" > "$BACKEND_VERSION"

echo ""
echo "========================================="
echo "版本号已更新"
echo "前端: $FRONTEND_VERSION -> $NEW_VERSION"
echo "后端: $BACKEND_VERSION -> $NEW_VERSION"
echo "========================================="

# 输出给 CI/CD 使用
echo "VERSION=$NEW_VERSION" >> "$GITHUB_OUTPUT" 2>/dev/null || true
