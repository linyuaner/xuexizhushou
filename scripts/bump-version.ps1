# =============================================================================
# 版本号自动递增脚本 (Windows PowerShell 版本)
# 用法:
#   .\scripts\bump-version.ps1         # 自动递增补丁版本 (1.0.0 -> 1.0.1)
#   .\scripts\bump-version.ps1 patch   # 递增补丁版本 (1.0.0 -> 1.0.1)
#   .\scripts\bump-version.ps1 minor   # 递增次版本 (1.0.0 -> 1.1.0)
#   .\scripts\bump-version.ps1 major   # 递增主版本 (1.0.0 -> 2.0.0)
#   .\scripts\bump-version.ps1 1.2.3   # 设置为指定版本
# =============================================================================

$RootDir = Split-Path -Parent $PSScriptRoot
$FrontendVersion = Join-Path $RootDir "VERSION"
$BackendVersion = Join-Path $RootDir "server" "VERSION"

function Get-CurrentVersion {
    if (Test-Path $FrontendVersion) {
        return (Get-Content $FrontendVersion).Trim()
    }
    return "1.0.0"
}

function Bump-Version {
    param(
        [string]$Current,
        [string]$BumpType
    )
    
    $parts = $Current -split '\.'
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    
    switch ($BumpType) {
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
        "minor" {
            $minor++
            $patch = 0
        }
        default {
            $patch++
        }
    }
    
    return "${major}.${minor}.${patch}"
}

# 获取当前版本
$CurrentVersion = Get-CurrentVersion
Write-Host "当前版本: $CurrentVersion"

# 确定新版本
$BumpType = if ($args.Count -gt 0) { $args[0] } else { "patch" }

if ($BumpType -match '^\d+\.\d+\.\d+$') {
    $NewVersion = $BumpType
    Write-Host "设置为指定版本: $NewVersion"
} else {
    $NewVersion = Bump-Version -Current $CurrentVersion -BumpType $BumpType
    Write-Host "递增${BumpType}版本: $NewVersion"
}

# 更新前后端版本号
Set-Content -Path $FrontendVersion -Value $NewVersion -NoNewline
Set-Content -Path $BackendVersion -Value $NewVersion -NoNewline

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "版本号已更新" -ForegroundColor Green
Write-Host "前端: $FrontendVersion -> $NewVersion" -ForegroundColor Cyan
Write-Host "后端: $BackendVersion -> $NewVersion" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green

# 输出给 CI/CD 使用
Write-Host "VERSION=$NewVersion"
