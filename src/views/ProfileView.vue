<template>
  <div class="profile-view">
    <div class="profile-header">
      <div class="avatar">
        <el-avatar :size="80" :src="userInfo?.avatar_url">
          {{ userInfo?.username?.charAt(0)?.toUpperCase() }}
        </el-avatar>
      </div>
      <div class="user-info">
        <h2>{{ userInfo?.username }}</h2>
        <p>{{ userInfo?.email }}</p>
      </div>
      <el-button @click="handleLogout">退出登录</el-button>
    </div>

    <el-row :gutter="20" class="stats-row">
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

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane label="练习历史" name="history">
        <div class="history-list" v-loading="historyLoading">
          <div v-if="history.length === 0" class="empty">
            <el-empty description="暂无练习记录" />
          </div>
          <div v-for="item in history" :key="item.id" class="history-card">
            <div class="history-info">
              <h4>{{ item.bank_name || '练习' }}</h4>
              <p>{{ formatDate(item.created_at) }}</p>
            </div>
            <div class="history-stats">
              <span class="correct">{{ item.correct_count }} 正确</span>
              <span class="incorrect">{{ item.incorrect_count }} 错误</span>
              <span class="rate">{{ getRate(item) }}%</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="错题本" name="wrong">
        <div class="question-list" v-loading="wrongLoading">
          <div v-if="wrongQuestions.length === 0" class="empty">
            <el-empty description="暂无错题" />
          </div>
          <div v-for="q in wrongQuestions" :key="q.id" class="question-card">
            <h4>{{ q.title }}</h4>
            <p>{{ q.content }}</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的收藏" name="favorites">
        <div class="question-list" v-loading="favoritesLoading">
          <div v-if="favorites.length === 0" class="empty">
            <el-empty description="暂无收藏" />
          </div>
          <div v-for="q in favorites" :key="q.id" class="question-card">
            <h4>{{ q.title }}</h4>
            <p>{{ q.content }}</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="数据分析" name="stats">
        <div class="charts" v-loading="statsLoading">
          <div class="chart-card">
            <h4>按分类正确率</h4>
            <div class="chart-content">
              <div v-for="cat in stats.by_category" :key="cat.category" class="category-stat">
                <span>{{ cat.category }}</span>
                <el-progress :percentage="parseFloat(cat.correct_rate)" :stroke-width="12" />
                <span class="stat-num">{{ cat.correct_rate }}%</span>
              </div>
            </div>
          </div>
          <div class="chart-card">
            <h4>按难度正确率</h4>
            <div class="chart-content">
              <div v-for="diff in stats.by_difficulty" :key="diff.difficulty" class="difficulty-stat">
                <el-tag :type="getDifficultyType(diff.difficulty)">{{ diff.difficulty }}</el-tag>
                <span class="stat-num">{{ diff.correct_rate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import api from '@/api'

const router = useRouter()
const userStore = useUserStore()

const userInfo = computed(() => userStore.userInfo)
const activeTab = ref('history')

const stats = ref({})
const history = ref([])
const wrongQuestions = ref([])
const favorites = ref([])

const historyLoading = ref(false)
const wrongLoading = ref(false)
const favoritesLoading = ref(false)
const statsLoading = ref(false)

onMounted(() => {
  loadStats()
  loadHistory()
})

const loadStats = async () => {
  statsLoading.value = true
  try {
    const res = await api.get('/stats/progress')
    stats.value = res.data
  } catch (error) {
    console.error('获取统计数据失败', error)
  } finally {
    statsLoading.value = false
  }
}

const loadHistory = async () => {
  historyLoading.value = true
  try {
    const res = await api.get('/practice/history')
    history.value = res.data
  } catch (error) {
    console.error('获取练习历史失败', error)
  } finally {
    historyLoading.value = false
  }
}

const loadWrongQuestions = async () => {
  wrongLoading.value = true
  try {
    const res = await api.get('/practice/wrong')
    wrongQuestions.value = res.data
  } catch (error) {
    console.error('获取错题失败', error)
  } finally {
    wrongLoading.value = false
  }
}

const loadFavorites = async () => {
  favoritesLoading.value = true
  try {
    const res = await api.get('/favorites')
    favorites.value = res.data
  } catch (error) {
    console.error('获取收藏失败', error)
  } finally {
    favoritesLoading.value = false
  }
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const formatTime = (seconds) => {
  if (!seconds) return '0分钟'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const getRate = (item) => {
  const total = item.correct_count + item.incorrect_count
  if (!total) return 0
  return ((item.correct_count / total) * 100).toFixed(1)
}

const getDifficultyType = (difficulty) => {
  const map = { '简单': 'success', '中等': 'warning', '困难': 'danger', easy: 'success', medium: 'warning', hard: 'danger' }
  return map[difficulty] || 'info'
}

// 监听tab切换加载数据
import { watch } from 'vue'
watch(activeTab, (val) => {
  if (val === 'wrong') loadWrongQuestions()
  if (val === 'favorites') loadFavorites()
})
</script>

<style scoped>
.profile-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.user-info {
  flex: 1;
}

.user-info h2 {
  margin: 0 0 4px;
}

.user-info p {
  margin: 0;
  color: #666;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
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

.tabs {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.history-list, .question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.history-info h4 {
  margin: 0 0 4px;
}

.history-info p {
  margin: 0;
  color: #999;
  font-size: 0.85rem;
}

.history-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}

.correct {
  color: #67c23a;
}

.incorrect {
  color: #f56c6c;
}

.rate {
  font-weight: bold;
  color: #409eff;
}

.question-card {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.question-card h4 {
  margin: 0 0 8px;
}

.question-card p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.chart-card {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.chart-card h4 {
  margin: 0 0 16px;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-stat span:first-child {
  width: 60px;
}

.category-stat .stat-num {
  width: 50px;
  text-align: right;
}

.difficulty-stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.empty {
  padding: 40px 0;
}
</style>
