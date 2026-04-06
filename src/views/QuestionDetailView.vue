<template>
  <div class="question-detail-view" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <!-- 题目详情 -->
    <el-card shadow="never" class="question-card" v-if="questionData">
      <template #header>
        <div class="question-header">
          <div class="question-tags">
            <el-tag :type="getTypeTag(question.type)">
              {{ getTypeLabel(question.type) }}
            </el-tag>
            <el-tag :type="getDifficultyTag(question.difficulty)">
              {{ getDifficultyLabel(question.difficulty) }}
            </el-tag>
          </div>
          <div class="question-actions">
            <el-button type="primary" @click="editQuestion">编辑</el-button>
            <el-button type="danger" @click="deleteQuestion">删除</el-button>
          </div>
        </div>
      </template>

      <div class="question-content">
        <h2 class="question-title">{{ question.title }}</h2>

        <!-- 选择题选项 -->
        <div v-if="['single', 'multiple', 'truefalse'].includes(question.type) && question.options.length > 0" class="options-section">
          <div
            v-for="(option, index) in question.options"
            :key="index"
            class="option-item"
            :class="{ correct: showAnswer && question.correctAnswer.includes(option.key) }"
          >
            <span class="option-label">{{ option.key }}.</span>
            <span class="option-text">{{ option.value }}</span>
          </div>
        </div>

        <!-- 填空题答案 -->
        <div v-if="question.type === 'fill' && showAnswer" class="answer-section">
          <h3>正确答案</h3>
          <p class="correct-answer">{{ question.correctAnswer.join(', ') }}</p>
        </div>

        <!-- 问答题 -->
        <div v-if="question.type === 'essay' && showAnswer" class="answer-section">
          <h3>答案解析</h3>
          <p>{{ question.correctAnswer.join(', ') || '暂无答案' }}</p>
        </div>
      </div>

      <!-- 答案区域 -->
      <div v-if="showAnswer" class="result-section">
        <el-divider />
        <div class="answer-display">
          <h3>正确答案</h3>
          <div class="correct-answer">
            {{ question.correctAnswer.join(', ') }}
          </div>
        </div>
        <div v-if="question.explanation" class="explanation">
          <h3>解析</h3>
          <p>{{ question.explanation }}</p>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="toggleAnswer">
          {{ showAnswer ? '隐藏答案' : '显示答案' }}
        </el-button>
        <el-button type="primary" @click="startPractice">开始练习此题</el-button>
      </div>
    </el-card>

    <!-- 题目元信息 -->
    <el-card shadow="never" class="meta-card" v-if="questionData">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="所属分类">{{ question.bankName }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ question.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ question.updatedAt }}</el-descriptions-item>
        <el-descriptions-item label="被练习次数">{{ question.practiceCount }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import api from '@/api'

const route = useRoute()
const router = useRouter()

const showAnswer = ref(false)
const loading = ref(false)

const questionData = ref(null)

const question = computed(() => {
  if (!questionData.value) {
    return {
      id: '',
      title: '',
      type: 'single',
      difficulty: 'medium',
      options: [],
      answer: null,
      explanation: '',
      created_at: '',
      updated_at: ''
    }
  }
  
  const q = questionData.value
  const answer = q.answer || {}
  
  return {
    id: q.id,
    title: q.title,
    type: q.type,
    difficulty: q.difficulty,
    options: q.options || [],
    correctAnswer: answer.selected ? answer.selected.split(',') : (answer.text ? [answer.text] : []),
    explanation: q.explanation || '',
    bankName: q.category_name || '未分类',
    createdAt: q.created_at || '',
    updatedAt: q.updated_at || '',
    practiceCount: q.stats?.total_attempts || 0
  }
})

const loadQuestion = async () => {
  loading.value = true
  try {
    const res = await api.get(`/questions/${route.params.id}`)
    questionData.value = res.data
  } catch (error) {
    console.error('获取题目详情失败', error)
    ElMessage.error('获取题目详情失败')
    router.push('/questions')
  } finally {
    loading.value = false
  }
}

function getTypeLabel(type) {
  const map = { single: '单选题', multiple: '多选题', truefalse: '判断题', fill: '填空题', essay: '问答题' }
  return map[type] || type
}

function getTypeTag(type) {
  const map = { single: 'primary', multiple: 'success', truefalse: 'warning', fill: 'info', essay: 'info' }
  return map[type] || 'info'
}

function getDifficultyLabel(difficulty) {
  const map = { easy: '简单', medium: '中等', hard: '困难' }
  return map[difficulty] || difficulty
}

function getDifficultyTag(difficulty) {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' }
  return map[difficulty] || 'info'
}

function toggleAnswer() {
  showAnswer.value = !showAnswer.value
}

async function editQuestion() {
  ElMessage.info('编辑功能开发中')
}

async function deleteQuestion() {
  try {
    await ElMessageBox.confirm('确定要删除此题吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await api.delete(`/questions/${route.params.id}`)
    ElMessage.success('删除成功')
    router.push('/questions')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败', error)
      ElMessage.error('删除失败')
    }
  }
}

function startPractice() {
  router.push({ path: '/practice', query: { questionId: question.value.id } })
}

onMounted(() => {
  loadQuestion()
})
</script>

<style scoped>
.question-detail-view {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-tags {
  display: flex;
  gap: 12px;
}

.question-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
  line-height: 1.6;
}

.options-section {
  margin-bottom: 20px;
}

.option-item {
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
}

.option-item.correct {
  border-color: #67c23a;
  background-color: #f0f9eb;
}

.option-label {
  font-weight: 600;
  color: #409eff;
  margin-right: 12px;
}

.result-section {
  margin-top: 20px;
}

.answer-display {
  margin-bottom: 16px;
}

.answer-display h3,
.explanation h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.correct-answer {
  font-size: 18px;
  font-weight: 600;
  color: #67c23a;
}

.explanation {
  color: #606266;
  line-height: 1.6;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.meta-card {
  margin-top: 20px;
}
</style>