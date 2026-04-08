import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/questions',
    name: 'Questions',
    component: () => import('@/views/QuestionsView.vue')
  },
  {
    path: '/questions/:id',
    name: 'QuestionDetail',
    component: () => import('@/views/QuestionDetailView.vue')
  },
  {
    path: '/practice',
    name: 'Practice',
    component: () => import('@/views/PracticeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/practice/session',
    name: 'PracticeSession',
    component: () => import('@/views/PracticeSessionView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/banks',
    name: 'Banks',
    component: () => import('@/views/BankView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/banks/:id',
    name: 'BankDetail',
    component: () => import('@/views/BankDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && token) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
