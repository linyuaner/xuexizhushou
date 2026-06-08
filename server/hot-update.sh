#!/bin/sh
# =============================================================================
# Docker 容器内热更新脚本
# 功能：
#   1. 定期检测 GitHub 新版本
#   2. 自动拉取最新代码
#   3. 在容器内构建前端和后端
#   4. 无缝重启服务（不丢失数据）
# =============================================================================

set -e

APP_DIR="/app"
SERVER_DIR="/app/server"
DATA_DIR="/app/server/data"
UPLOADS_DIR="/app/server/uploads"
PUBLIC_DIR="/app/server/public"
TEMP_DIR="/app/server/temp"
VERSION_FILE="/app/server/VERSION"
UPDATE_LOG="/app/server/data/hot-update.log"
GITHUB_REPO="${GITHUB_REPO:-linyuaner/xuexizhushou}"
CHECK_INTERVAL="${HOT_UPDATE_INTERVAL:-300}"  # 默认 5 分钟

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [热更新] $1" | tee -a "$UPDATE_LOG"
}

ensure_dirs() {
    mkdir -p "$DATA_DIR" "$UPLOADS_DIR" "$PUBLIC_DIR" "$TEMP_DIR"
}

get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE" | tr -d '[:space:]'
    else
        echo "unknown"
    fi
}

get_remote_version() {
    local latest_release_url="https://api.github.com/repos/$GITHUB_REPO/releases/latest"
    local tag_name
    
    tag_name=$(wget -qO- "$latest_release_url" 2>/dev/null | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/' || echo "")
    
    if [ -n "$tag_name" ]; then
        echo "$tag_name" | sed 's/^v//'
    else
        echo "unknown"
    fi
}

version_compare() {
    local v1="$1"
    local v2="$2"
    
    if [ "$v1" = "$v2" ]; then
        return 0
    fi
    
    local v1_major v1_minor v1_patch v2_major v2_minor v2_patch
    
    v1_major=$(echo "$v1" | cut -d. -f1)
    v1_minor=$(echo "$v1" | cut -d. -f2)
    v1_patch=$(echo "$v1" | cut -d. -f3)
    v2_major=$(echo "$v2" | cut -d. -f1)
    v2_minor=$(echo "$v2" | cut -d. -f2)
    v2_patch=$(echo "$v2" | cut -d. -f3)
    
    v1_major=${v1_major:-0}
    v1_minor=${v1_minor:-0}
    v1_patch=${v1_patch:-0}
    v2_major=${v2_major:-0}
    v2_minor=${v2_minor:-0}
    v2_patch=${v2_patch:-0}
    
    if [ "$v1_major" -gt "$v2_major" ]; then return 1; fi
    if [ "$v1_major" -lt "$v2_major" ]; then return 2; fi
    if [ "$v1_minor" -gt "$v2_minor" ]; then return 1; fi
    if [ "$v1_minor" -lt "$v2_minor" ]; then return 2; fi
    if [ "$v1_patch" -gt "$v2_patch" ]; then return 1; fi
    if [ "$v1_patch" -lt "$v2_patch" ]; then return 2; fi
    return 0
}

download_and_update() {
    local new_version="$1"
    
    log "========================================"
    log "开始热更新到版本: $new_version"
    log "========================================"
    
    # 备份当前版本的关键数据
    log "备份数据目录..."
    local backup_dir="/tmp/study-helper-backup"
    rm -rf "$backup_dir"
    mkdir -p "$backup_dir/data" "$backup_dir/uploads"
    
    cp -r "$DATA_DIR"/* "$backup_dir/data/" 2>/dev/null || true
    cp -r "$UPLOADS_DIR"/* "$backup_dir/uploads/" 2>/dev/null || true
    
    # 从 GitHub 拉取最新代码
    log "从 GitHub 拉取代码..."
    local download_dir="$TEMP_DIR/download"
    rm -rf "$download_dir"
    mkdir -p "$download_dir"
    
    # 下载 release 源码
    local release_url="https://github.com/$GITHUB_REPO/archive/refs/tags/v${new_version}.tar.gz"
    log "下载: $release_url"
    
    if wget -q "$release_url" -O "$download_dir/release.tar.gz" 2>/dev/null; then
        log "代码下载成功，开始解压..."
        cd "$download_dir"
        tar -xzf release.tar.gz
        local extracted_dir=$(ls -d */ 2>/dev/null | head -1)
        
        if [ -n "$extracted_dir" ]; then
            log "代码解压成功: $extracted_dir"
            
            # 准备构建环境
            log "准备构建环境..."
            cd "$TEMP_DIR"
            
            # 复制源码
            rm -rf source
            cp -r "$download_dir/$extracted_dir" source
            cd source
            
            # 使用预安装的 node_modules 加速构建
            if [ -d "$SERVER_DIR/node_modules-base" ]; then
                log "使用预安装的基础依赖..."
                cp -r "$SERVER_DIR/node_modules-base" "$TEMP_DIR/source/node_modules"
            fi
            
            # 安装前端依赖（如果需要）
            if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
                log "安装前端依赖..."
                npm ci --prefer-offline
            fi
            
            # 构建前端
            log "构建前端..."
            npm run build
            
            # 安装后端依赖并构建
            if [ -d "$SERVER_DIR/node_modules-dev" ]; then
                log "使用预安装的后端依赖..."
                cp -r "$SERVER_DIR/node_modules-dev" "$TEMP_DIR/source/server/node_modules"
            fi
            
            cd server
            if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
                log "安装后端依赖..."
                npm ci --prefer-offline
            fi
            
            # 构建后端
            log "构建后端..."
            npm run build
            
            # 替换应用代码
            log "替换应用代码..."
            
            # 备份并替换 server 目录
            rm -rf "$SERVER_DIR/dist"
            cp -r "$TEMP_DIR/source/server/dist" "$SERVER_DIR/dist"
            
            # 更新 VERSION 文件
            if [ -f "$TEMP_DIR/source/server/VERSION" ]; then
                cp "$TEMP_DIR/source/server/VERSION" "$VERSION_FILE"
            fi
            
            # 替换前端构建产物
            rm -rf "$PUBLIC_DIR"
            cp -r "$TEMP_DIR/source/dist" "$PUBLIC_DIR"
            
            # 恢复数据目录
            if [ -d "$backup_dir/data" ]; then
                cp -r "$backup_dir/data/"* "$DATA_DIR/" 2>/dev/null || true
            fi
            if [ -d "$backup_dir/uploads" ]; then
                cp -r "$backup_dir/uploads/"* "$UPLOADS_DIR/" 2>/dev/null || true
            fi
            
            # 设置权限
            chown -R appuser:appgroup "$APP_DIR" 2>/dev/null || true
            
            log "热更新完成: 版本已升级到 $new_version"
            
            # 清理临时文件
            rm -rf "$TEMP_DIR/download" "$backup_dir"
            
            return 0
        else
            log "错误: 代码解压失败"
            return 1
        fi
    else
        log "错误: 代码下载失败"
        return 1
    fi
}

check_and_update() {
    log "检查远程版本..."
    
    local current_version=$(get_current_version)
    local remote_version=$(get_remote_version)
    
    log "当前版本: $current_version"
    log "远程版本: $remote_version"
    
    if [ "$remote_version" = "unknown" ]; then
        log "无法获取远程版本，跳过更新"
        return
    fi
    
    if [ "$current_version" = "$remote_version" ]; then
        log "当前已是最新版本"
        return
    fi
    
    version_compare "$current_version" "$remote_version"
    case $? in
        0)
            log "当前已是最新版本"
            ;;
        2)
            log "发现新版本: $current_version -> $remote_version"
            if download_and_update "$remote_version"; then
                log "热更新成功！将在重启后生效"
                # 创建标记文件，通知主进程重启
                touch "$DATA_DIR/.need-restart"
            else
                log "热更新失败，保持当前版本"
            fi
            ;;
        *)
            log "警告: 远程版本低于当前版本，跳过更新"
            ;;
    esac
}

# 主循环
ensure_dirs
log "热更新监控已启动"
log "检查间隔: ${CHECK_INTERVAL}秒"
log "GitHub 仓库: $GITHUB_REPO"

while true; do
    check_and_update
    sleep "$CHECK_INTERVAL"
done
