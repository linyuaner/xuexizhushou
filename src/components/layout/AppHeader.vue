<template>
  <el-header class="app-header" :class="{ scrolled: isScrolled }">
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
        <template v-if="isLoggedIn">
          <el-menu-item index="/home" @click="$router.push('/home')">首页</el-menu-item>
          <el-menu-item index="/questions" @click="$router.push('/questions')">题目</el-menu-item>
          <el-menu-item index="/practice" @click="$router.push('/practice')">练习</el-menu-item>
          <el-menu-item index="/banks" @click="$router.push('/banks')">题库</el-menu-item>
        </template>
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
        <el-button 
          v-if="isMobile" 
          text 
          class="hamburger-btn"
          @click="toggleMobileMenu"
        >
          <el-icon v-if="!mobileMenuOpen"><Menu /></el-icon>
          <el-icon v-else><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <el-drawer
      v-model="mobileMenuOpen"
      direction="rtl"
      size="70%"
      :with-header="false"
      class="mobile-menu-drawer"
    >
      <el-menu
        :default-active="activeMenu"
        @select="handleMenuSelect"
        class="mobile-menu"
      >
        <template v-if="isLoggedIn">
          <el-menu-item index="/home">首页</el-menu-item>
          <el-menu-item index="/questions">题目</el-menu-item>
          <el-menu-item index="/practice">练习</el-menu-item>
          <el-menu-item index="/banks">题库</el-menu-item>
          <el-menu-item index="/profile">个人中心</el-menu-item>
        </template>
      </el-menu>
      <div class="mobile-menu-footer">
        <template v-if="!isLoggedIn">
          <el-button type="primary" @click="$router.push('/login')" style="width: 100%">登录</el-button>
        </template>
        <template v-else>
          <el-button @click="handleCommand('logout')" style="width: 100%">退出登录</el-button>
        </template>
      </div>
    </el-drawer>
  </el-header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Reading, User, ArrowDown, SwitchButton, Menu, Close } from '@element-plus/icons-vue'
import { useWindowSize } from '@vueuse/core'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { width } = useWindowSize()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)
const isMobile = computed(() => width.value < 768)
const activeMenu = computed(() => route.path)

const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 10
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const handleMenuSelect = (index) => {
  mobileMenuOpen.value = false
  router.push(index)
}

const handleCommand = (command) => {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    userStore.logout()
    router.push('/')
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #eee;
  padding: 0;
  height: 64px;
  transition: all 0.3s ease;
}

.app-header.scrolled {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
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

.hamburger-btn {
  margin-left: 8px;
}

:deep(.mobile-menu-drawer) {
  .el-drawer__body {
    padding: 20px 0;
    display: flex;
    flex-direction: column;
  }
}

.mobile-menu {
  flex: 1;
  border: none;
}

.mobile-menu-footer {
  padding: 20px;
}
</style>
