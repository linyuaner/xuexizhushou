#!/bin/sh
# =============================================================================
# 学习助手 - Docker 容器启动脚本（支持热更新）
# 功能：
#   1. 检测代码版本与数据库版本
#   2. 自动执行数据库迁移/更新
#   3. 启动热更新后台进程
#   4. 启动应用服务
# =============================================================================

set -e

APP_DIR="/app"
SERVER_DIR="/app/server"
DATA_DIR="$SERVER_DIR/data"
VERSION_FILE="$SERVER_DIR/VERSION"
DB_PATH="$DATA_DIR/quiz.db"
UPDATE_LOG="$DATA_DIR/update.log"

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$UPDATE_LOG"
}

ensure_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        mkdir -p "$DATA_DIR"
        log "创建数据目录: $DATA_DIR"
    fi
}

get_app_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE" | tr -d '[:space:]'
    else
        echo "unknown"
    fi
}

get_stored_version() {
    local stored_version_file="$DATA_DIR/.app_version"
    if [ -f "$stored_version_file" ]; then
        cat "$stored_version_file" | tr -d '[:space:]'
    else
        echo "none"
    fi
}

save_app_version() {
    local version="$1"
    local stored_version_file="$DATA_DIR/.app_version"
    echo "$version" > "$stored_version_file"
    log "保存应用版本: $version"
}

version_compare() {
    if [ "$1" = "$2" ]; then
        return 0
    fi
    
    if [ "$2" = "none" ] || [ "$1" = "unknown" ]; then
        return 1
    fi
    
    local v1_major v1_minor v1_patch v2_major v2_minor v2_patch
    
    v1_major=$(echo "$1" | cut -d. -f1)
    v1_minor=$(echo "$1" | cut -d. -f2)
    v1_patch=$(echo "$1" | cut -d. -f3)
    v2_major=$(echo "$2" | cut -d. -f1)
    v2_minor=$(echo "$2" | cut -d. -f2)
    v2_patch=$(echo "$2" | cut -d. -f3)
    
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

perform_update() {
    local old_version="$1"
    local new_version="$2"
    
    log "========================================"
    log "检测到版本更新!"
    log "旧版本: $old_version"
    log "新版本: $new_version"
    log "========================================"
    
    log "执行数据库迁移..."
    
    cd "$SERVER_DIR"
    node dist/index.js --migrate-only 2>/dev/null || \
    npx tsx src/index.ts --migrate-only 2>/dev/null || \
    log "数据库迁移跳过（应用启动时会自动执行）"
    
    log "版本更新完成: $old_version -> $new_version"
}

check_need_restart() {
    local restart_file="$DATA_DIR/.need-restart"
    if [ -f "$restart_file" ]; then
        rm -f "$restart_file"
        return 0
    fi
    return 1
}

start_hot_update_daemon() {
    log "启动热更新后台进程..."
    cd "$SERVER_DIR"
    chmod +x hot-update.sh
    ./hot-update.sh &
    HOT_UPDATE_PID=$!
    log "热更新进程 PID: $HOT_UPDATE_PID"
}

stop_hot_update_daemon() {
    if [ -n "$HOT_UPDATE_PID" ]; then
        log "停止热更新进程: $HOT_UPDATE_PID"
        kill $HOT_UPDATE_PID 2>/dev/null || true
    fi
}

main() {
    log "========================================"
    log "学习助手 - 容器启动 (支持热更新)"
    log "========================================"
    
    ensure_data_dir
    
    APP_VERSION=$(get_app_version)
    STORED_VERSION=$(get_stored_version)
    
    log "应用版本: $APP_VERSION"
    log "存储版本: $STORED_VERSION"
    
    version_compare "$APP_VERSION" "$STORED_VERSION"
    case $? in
        0)
            log "版本一致，无需更新"
            ;;
        1)
            perform_update "$STORED_VERSION" "$APP_VERSION"
            save_app_version "$APP_VERSION"
            ;;
        2)
            log "警告: 应用版本低于存储版本 ($APP_VERSION < $STORED_VERSION)"
            log "可能是回滚操作，建议检查数据兼容性"
            ;;
    esac
    
    # 启动热更新后台进程
    if [ "${ENABLE_HOT_UPDATE:-true}" = "true" ]; then
        start_hot_update_daemon
    fi
    
    # 信号处理
    trap 'stop_hot_update_daemon; exit 0' SIGTERM SIGINT
    
    log "启动应用服务..."
    log "========================================"
    echo ""
    
    # 主服务循环（支持热更新后重启）
    while true; do
        cd "$SERVER_DIR"
        node dist/index.js &
        MAIN_PID=$!
        log "主服务进程 PID: $MAIN_PID"
        
        # 等待进程结束或被信号中断
        wait $MAIN_PID 2>/dev/null || true
        
        # 检查是否需要重启（热更新后）
        if check_need_restart; then
            log "检测到热更新完成，重启服务..."
            sleep 2
        else
            log "主服务已停止，退出..."
            break
        fi
    done
    
    stop_hot_update_daemon
    log "容器已关闭"
}

main "$@"
