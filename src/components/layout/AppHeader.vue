<template>
  <el-header class="app-header">
    <div class="header-content">
      <div class="logo" @click="$router.push(isLoggedIn ? '/home' : '/')">
        <el-icon :size="28"><Reading /></el-icon>
        <span>刷题助手</span>
      </div>
      
      <el-menu 
        mode="horizontal" 
        :default-active="activeMenu" 
        :ellipsis="false"
        class="header-menu"
        v-if="!isMobile"
      >
        <el-menu-item index="/home" @click="$router.push('/home')">首页</el-menu-item>
        <el-menu-item index="/questions" @click="$router.push('/questions')">题目</el-menu-item>
        <el-menu-item v-if="isLoggedIn" index="/practice" @click="$router.push('/practice')">练习</el-menu-item>
        <el-menu-item v-if="isLoggedIn" index="/banks" @click="$router.push('/banks')">题库</el-menu-item>
      </el-menu>

      <div class="header-actions">
        <template v-if="isLoggedIn">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32" :src="userInfo?.avatar_url">
                {{ userInfo?.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <span v-if="!isMobile">{{ userInfo?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> 个人中心
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <el-button type="primary" @click="$router.push('/login')">登录</el-button>
        </template>
      </div>
    </div>
  </el-header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Reading, User, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { useWindowSize } from '@vueuse/core'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { width } = useWindowSize()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)
const isMobile = computed(() => width.value < 768)
const activeMenu = computed(() => route.path)

const handleCommand = (command) => {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    userStore.logout()
    router.push('/')
  }
}
</script>

<style scoped>
.app-header {
  background: white;
  border-bottom: 1px solid #eee;
  padding: 0;
  height: 60px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;
  color: #409eff;
  margin-right: 40px;
}

.header-menu {
  flex: 1;
  border: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
</style>
