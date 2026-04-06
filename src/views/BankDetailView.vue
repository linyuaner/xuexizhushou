<template>
  <div class="bank-detail-view">
    <div class="header">
      <el-button @click="$router.back()" :icon="ArrowLeft">返回</el-button>
      <h1>{{ bank.name }}</h1>
      <el-tag>{{ bank.question_count }} 道题目</el-tag>
      <el-button type="primary" @click="startPractice" :disabled="questions.length === 0">
        开始练习
      </el-button>
    </div>

    <p class="description">{{ bank.description || '暂无描述' }}</p>

    <div class="question-list" v-loading="loading">
      <div v-if="questions.length === 0 && !loading" class="empty">
        <el-empty description="暂无题目" />
      </div>
      <div v-for="q in questions" :key="q.id" class="question-card" @click="viewQuestion(q.id)">
        <div class="question-header">
          <el-tag size="small" :type="getTypeTagType(q.type)">{{ getTypeName(q.type) }}</el-tag>
          <el-tag size="small" :type="getDifficultyTagType(q.difficulty)">{{ getDifficultyName(q.difficulty) }}</el-tag>
        </div>
        <div class="question-content">{{ q.question || q.title }}</div>
        <div v-if="q.options && q.options.length > 0" class="options">
          <div v-for="opt in q.options" :key="opt.key" class="option">
            {{ opt.key }}. {{ opt.value }}
          </div>
        </div>
      </div>
    </div>

    <div class="pagination" v-if="totalPages > 1">
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
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const bank = ref({})
const questions = ref([])
const currentPage = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / pageSize))

const loadBank = async () => {
  try {
    const res = await api.get(`/banks/${route.params.id}`)
    bank.value = res.data
  } catch (error) {
    console.error('获取题库详情失败', error)
  }
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const res = await api.get(`/banks/${route.params.id}/questions`, {
      page: currentPage.value,
      limit: pageSize
    })
    questions.value = res.data
    total.value = res.total
  } catch (error) {
    console.error('获取题目列表失败', error)
  } finally {
    loading.value = false
  }
}

const startPractice = () => {
  router.push(`/practice?bank=${route.params.id}`)
}

const viewQuestion = (id) => {
  router.push(`/questions/${id}`)
}

const getTypeName = (type) => {
  const types = { single: '单选', multiple: '多选', truefalse: '判断', fill: '填空', essay: '简答' }
  return types[type] || type
}

const getDifficultyName = (difficulty) => {
  const difficulties = { easy: '简单', medium: '中等', hard: '困难' }
  return difficulties[difficulty] || difficulty
}

const getTypeTagType = (type) => {
  const types = { single: 'primary', multiple: 'success', truefalse: 'warning', fill: 'info', essay: 'danger' }
  return types[type] || 'info'
}

const getDifficultyTagType = (difficulty) => {
  const difficulties = { easy: 'success', medium: 'warning', hard: 'danger' }
  return difficulties[difficulty] || 'info'
}

onMounted(() => {
  loadBank()
  loadQuestions()
})
</script>

<style scoped>
.bank-detail-view {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  flex: 1;
}

.description {
  color: #666;
  margin-bottom: 24px;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.question-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.question-content {
  font-size: 16px;
  margin-bottom: 12px;
}

.options {
  padding-left: 16px;
}

.option {
  padding: 4px 0;
  color: #444;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.empty {
  padding: 60px 0;
}
</style>
