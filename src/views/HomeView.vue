<template>
  <div class="home">
    <div class="hero">
      <div class="hero-content">
        <h1>欢迎使用刷题助手</h1>
        <p class="subtitle">高效学习，轻松备考</p>
        <div class="actions">
          <el-button type="primary" size="large" @click="$router.push('/questions')">
            开始刷题
          </el-button>
          <el-button size="large" @click="$router.push('/login')" v-if="!isLoggedIn">
            登录账号
          </el-button>
        </div>
      </div>
    </div>

    <div class="features">
      <div class="feature-card">
        <el-icon :size="48"><Reading /></el-icon>
        <h3>海量题库</h3>
        <p>涵盖各学科的精选题目</p>
      </div>
      <div class="feature-card">
        <el-icon :size="48"><TrendCharts /></el-icon>
        <h3>智能练习</h3>
        <p>多种练习模式，个性化学习</p>
      </div>
      <div class="feature-card">
        <el-icon :size="48"><DataAnalysis /></el-icon>
        <h3>数据统计</h3>
        <p>详细分析你的学习进度</p>
      </div>
      <div class="feature-card">
        <el-icon :size="48"><Star /></el-icon>
        <h3>错题收藏</h3>
        <p>针对性复习薄弱知识点</p>
      </div>
    </div>

    <div class="stats-section" v-if="isLoggedIn">
      <h2>学习统计</h2>
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.answered_questions || 0 }}</div>
            <div class="stat-label">已答题数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.correct_rate || 0 }}%</div>
            <div class="stat-label">正确率</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.total_questions || 0 }}</div>
            <div class="stat-label">题库总数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ formatTime(stats.total_time_spent || 0) }}</div>
            <div class="stat-label">学习时长</div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { Reading, TrendCharts, DataAnalysis, Star } from '@element-plus/icons-vue'
import api from '@/api'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const stats = ref({})

onMounted(async () => {
  if (isLoggedIn.value) {
    try {
      const res = await api.get('/stats/progress')
      stats.value = res.data
    } catch (error) {
      console.error('获取统计数据失败', error)
    }
  }
})

function formatTime(seconds) {
  if (!seconds) return '0分钟'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}
</script>

<style scoped>
.home {
  padding: 20px;
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 60px 40px;
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin-bottom: 30px;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.feature-card {
  background: white;
  padding: 30px 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  margin: 16px 0 8px;
  font-size: 1.2rem;
}

.feature-card p {
  color: #666;
  font-size: 0.9rem;
}

.stats-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stats-section h2 {
  margin-bottom: 20px;
}

.stat-card {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  color: #666;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .hero {
    padding: 40px 20px;
  }
  
  .hero h1 {
    font-size: 1.8rem;
  }
}
</style>
