<template>
  <div class="app-container">
    <AppHeader />
    <div class="app-main">
      <AppSidebar v-if="isLoggedIn" />
      <main class="main-content" :class="{ 'with-sidebar': isLoggedIn }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useWindowSize } from '@vueuse/core'

const userStore = useUserStore()
const { width } = useWindowSize()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isMobile = computed(() => width.value < 768)

onMounted(() => {
  userStore.init()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
}

.app-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-top: 64px;
}

.app-main {
  display: flex;
  min-height: calc(100vh - 64px);
}

.main-content {
  flex: 1;
  min-height: 100%;
}
</style>
