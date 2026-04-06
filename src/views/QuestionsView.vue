<template>
  <div class="questions-view">
    <div class="header">
      <h1>题目浏览</h1>
      <el-button type="primary" @click="$router.push('/practice')" v-if="isLoggedIn">
        开始练习
      </el-button>
    </div>

    <div class="filters">
      <el-input v-model="searchKeyword" placeholder="搜索题目..." clearable @input="handleSearch" style="width: 300px">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="selectedCategory" placeholder="选择分类" clearable @change="handleFilter" style="width: 150px">
        <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
      </el-select>
      <el-select v-model="selectedDifficulty" placeholder="选择难度" clearable @change="handleFilter" style="width: 120px">
        <el-option label="简单" value="easy" />
        <el-option label="中等" value="medium" />
        <el-option label="困难" value="hard" />
      </el-select>
      <el-select v-model="selectedType" placeholder="题目类型" clearable @change="handleFilter" style="width: 120px">
        <el-option label="单选题" value="single" />
        <el-option label="多选题" value="multiple" />
        <el-option label="判断题" value="truefalse" />

       
      </el-select>
    </div>

    <div class="question-list" v-loading="loading">
      <div v-if="questions.length === 0 && !loading" class="empty">
        <el-empty description="暂无题目" />
      </div>
      <div v-for="(question, index) in questions" :key="question.id" class="question-card" @click="viewQuestion(question, index)">
        <div class="question-header">
          <el-tag :type="getDifficultyType(question.difficulty)" size="small">
            {{ getDifficultyText(question.difficulty) }}
          </el-tag>
          <el-tag type="info" size="small">{{ getTypeText(question.type) }}</el-tag>
          <span class="category" v-if="question.category_name">{{ question.category_name }}</span>
        </div>
        <h3 class="question-title">{{ question.title }}</h3>
        <p class="question-content">{{ question.content }}</p>
        <div class="question-footer">
          <span class="date">{{ formatDate(question.created_at) }}</span>
          <el-button text size="small" @click.stop="viewQuestion(question, index)">开始练习</el-button>
        </div>
      </div>
    </div>

    <div class="pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadQuestions"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const router = useRouter()
const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)

const loading = ref(false)
const questions = ref([])
const categories = ref([])
const searchKeyword = ref('')
const selectedCategory = ref('')
const selectedDifficulty = ref('')
const selectedType = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

onMounted(() => {
  loadCategories()
  loadQuestions()
})

const loadCategories = async () => {
  try {
    const res = await api.get('/questions/categories/list')
    categories.value = res.data
  } catch (error) {
    console.error('获取分类失败', error)
  }
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (searchKeyword.value) params.search = searchKeyword.value
    if (selectedCategory.value) params.category = selectedCategory.value
    if (selectedDifficulty.value) params.difficulty = selectedDifficulty.value
    if (selectedType.value) params.type = selectedType.value

    const res = await api.get('/questions', params)
    questions.value = res.data
    total.value = res.total
  } catch (error) {
    console.error('获取题目列表失败', error)
  } finally {
    loading.value = false
  }
}

let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadQuestions()
  }, 300)
}

const handleFilter = () => {
  currentPage.value = 1
  loadQuestions()
}

const viewQuestion = async (question, index) => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  try {
    // 从当前题目开始顺序练习
    const res = await api.post('/practice/sessions', {
      bank_id: null,
      practice_type: 'all_sequential',
      total_questions: total.value
    })
    
    router.push({
      name: 'PracticeSession',
      query: {
        session_id: res.data.session_id,
        questions: JSON.stringify(res.data.question_ids),
        type: 'all_sequential',
        start_index: index
      }
    })
  } catch (error) {
    ElMessage.error(error.message || '创建练习失败')
  }
}

const getDifficultyType = (difficulty) => {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' }
  return map[difficulty] || 'info'
}

const getDifficultyText = (difficulty) => {
  const map = { easy: '简单', medium: '中等', hard: '困难' }
  return map[difficulty] || '未分类'
}

const getTypeText = (type) => {
  const map = { single: '单选', multiple: '多选', truefalse: '判断', fill: '填空', essay: '简答' }
  return map[type] || '未分类'
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.questions-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.question-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.question-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.question-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.question-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.category {
  color: #666;
  font-size: 0.85rem;
}

.question-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  color: #333;
}

.question-content {
  color: #666;
  font-size: 0.9rem;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.date {
  color: #999;
  font-size: 0.85rem;
}

.pagination {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.empty {
  grid-column: 1 / -1;
  padding: 60px 0;
}
</style>
