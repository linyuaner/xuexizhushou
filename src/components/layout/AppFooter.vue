<template>
  <div class="app-footer">
    <div class="footer-content">
      <div class="footer-left">
        <span class="copyright">© 2024 刷题助手</span>
        <span class="divider">|</span>
        <a href="#" class="footer-link">帮助文档</a>
        <a href="#" class="footer-link">隐私政策</a>
      </div>
      <div class="footer-right">
        <span class="version">版本 1.0.0</span>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.app-footer {
  background: white;
  border-top: 1px solid #ebeef5;
  padding: 16px 20px;
  margin-left: 200px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.copyright {
  color: #909399;
  font-size: 14px;
}

.divider {
  color: #dcdfe6;
}

.footer-link {
  color: #909399;
  font-size: 14px;
  text-decoration: none;
}

.footer-link:hover {
  color: #409eff;
}

.version {
  color: #c0c4cc;
  font-size: 14px;
}

@media (max-width: 768px) {
  .app-footer {
    margin-left: 0;
  }

  .footer-left {
    flex-wrap: wrap;
  }
}
</style>