<template>
  <el-aside :width="isCollapse ? '64px' : '200px'" class="app-sidebar">
    <el-menu 
      :default-active="activeMenu" 
      :collapse="isCollapse"
      :collapse-transition="false"
      router
    >
      <el-menu-item index="/home">
        <el-icon><HomeFilled /></el-icon>
        <template #title>首页</template>
      </el-menu-item>
      <el-menu-item index="/questions">
        <el-icon><Document /></el-icon>
        <template #title>题目</template>
      </el-menu-item>
      <el-menu-item index="/practice" v-if="isLoggedIn">
        <el-icon><Edit /></el-icon>
        <template #title>练习</template>
      </el-menu-item>
      <el-menu-item index="/banks" v-if="isLoggedIn">
        <el-icon><FolderOpened /></el-icon>
        <template #title>题库</template>
      </el-menu-item>
      <el-menu-item index="/profile" v-if="isLoggedIn">
        <el-icon><User /></el-icon>
        <template #title>个人中心</template>
      </el-menu-item>
    </el-menu>
    
    <div class="collapse-btn" @click="isCollapse = !isCollapse">
      <el-icon v-if="isCollapse"><DArrowRight /></el-icon>
      <el-icon v-else><DArrowLeft /></el-icon>
    </div>
  </el-aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { HomeFilled, Document, Edit, FolderOpened, User, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'

const route = useRoute()
const userStore = useUserStore()
const isCollapse = ref(false)

const isLoggedIn = computed(() => userStore.isLoggedIn)
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-sidebar {
  background: white;
  border-right: 1px solid #eee;
  height: calc(100vh - 60px);
  position: relative;
  transition: width 0.3s;
}

.collapse-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  cursor: pointer;
  padding: 8px;
  color: #999;
}

.collapse-btn:hover {
  color: #409eff;
}
</style>
