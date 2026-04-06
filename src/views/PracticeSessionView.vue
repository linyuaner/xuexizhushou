<template>
  <div class="practice-session">
    <div class="header">
      <div class="progress-info">
        <span>题目 {{ currentIndex + 1 }} / {{ questionIds.length }}</span>
        <el-progress :percentage="progress" :stroke-width="8" style="width: 200px" />
      </div>
      <div class="timer" v-if="practiceType === 'exam'">
        <el-icon><Timer /></el-icon>
        <span>{{ formatTime(timeLeft) }}</span>
      </div>
    </div>

    <div class="question-area" v-if="currentQuestion">
      <div class="question-header">
        <el-tag :type="getDifficultyType(currentQuestion.difficulty)" size="small">
          {{ getDifficultyText(currentQuestion.difficulty) }}
        </el-tag>
        <el-tag type="info" size="small">{{ getTypeText(currentQuestion.type) }}</el-tag>
      </div>
      
      <h2 class="question-title">{{ currentQuestion.title }}</h2>
      <p class="question-content">{{ currentQuestion.content }}</p>

      <div class="options" v-if="currentQuestion.options && currentQuestion.options.length">
        <div 
          v-for="option in currentQuestion.options" 
          :key="option.key"
          class="option-item"
          :class="{ selected: isSelected(option.key), correct: showResult && isCorrectOption(option.key), wrong: showResult && isSelected(option.key) && !isCorrectOption(option.key) }"
          @click="selectOption(option.key)"
        >
          <span class="option-key">{{ option.key }}</span>
          <span class="option-value">{{ option.value }}</span>
        </div>
      </div>

      <div class="input-area" v-else-if="currentQuestion.type === 'fill' || currentQuestion.type === 'essay'">
        <el-input
          v-model="textAnswer"
          type="textarea"
          :rows="4"
          placeholder="请输入答案"
          :disabled="showResult"
        />
      </div>

      <div class="result-area" v-if="showResult">
        <el-alert :type="lastAnswer?.is_correct ? 'success' : 'error'" :title="lastAnswer?.is_correct ? '回答正确！' : '回答错误'" show-icon>
          <template #default>
            <div v-if="!lastAnswer?.is_correct && currentQuestion.answer">
              <p>正确答案：{{ formatAnswer(currentQuestion.answer) }}</p>
            </div>
            <div v-if="currentQuestion.explanation" class="explanation">
              <strong>解析：</strong>{{ currentQuestion.explanation }}
            </div>
          </template>
        </el-alert>
      </div>

      <div class="actions">
        <el-button @click="finishPractice" v-if="showResult && currentIndex >= questionIds.length - 1">
          完成练习
        </el-button>
        <el-button type="primary" v-if="!showResult" @click="submitAnswer" :disabled="!hasAnswer">
          提交答案
        </el-button>
        <el-button v-if="showResult && currentIndex < questionIds.length - 1" @click="nextQuestion">
          下一题
        </el-button>
      </div>
    </div>

    <div class="loading" v-else>
      <el-skeleton :rows="5" animated />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Timer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const route = useRoute()
const router = useRouter()

const sessionId = ref(route.query.session_id)
const questionIds = ref(JSON.parse(route.query.questions || '[]'))
const practiceType = ref(route.query.type || 'sequential')
const startIndex = ref(parseInt(route.query.start_index) || 0)

const currentIndex = ref(startIndex.value)
const currentQuestion = ref(null)
const selectedAnswer = ref(null)
const textAnswer = ref('')
const showResult = ref(false)
const lastAnswer = ref(null)
const timeLeft = ref(3600)
const timer = ref(null)
const isCompleted = ref(false)

const progress = computed(() => {
  if (questionIds.value.length === 0) return 0
  return Math.round(((currentIndex.value + (showResult.value ? 1 : 0)) / questionIds.value.length) * 100)
})

const hasAnswer = computed(() => {
  if (currentQuestion.value?.type === 'fill' || currentQuestion.value?.type === 'essay') {
    return textAnswer.value.trim().length > 0
  }
  return selectedAnswer.value !== null
})

onMounted(() => {
  loadCurrentQuestion()
  if (practiceType.value === 'exam') {
    startTimer()
  }
})

onUnmounted(() => {
  if (timer.value) clearInterval(timer.value)
  // 自动完成练习
  if (sessionId.value && !isCompleted.value) {
    api.post(`/practice/sessions/${sessionId.value}/complete`).catch(() => {})
  }
})

const startTimer = () => {
  timer.value = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(timer.value)
      ElMessage.warning('时间到！')
      finishPractice()
    }
  }, 1000)
}

const loadCurrentQuestion = async () => {
  if (currentIndex.value >= questionIds.value.length) return
  
  try {
    const res = await api.get(`/questions/${questionIds.value[currentIndex.value]}`)
    currentQuestion.value = res.data
    selectedAnswer.value = null
    textAnswer.value = ''
    showResult.value = false
  } catch (error) {
    console.error('加载题目失败', error)
  }
}

const selectOption = (key) => {
  if (showResult.value) return
  
  if (currentQuestion.value.type === 'multiple') {
    if (!selectedAnswer.value) selectedAnswer.value = []
    const index = selectedAnswer.value.indexOf(key)
    if (index > -1) {
      selectedAnswer.value.splice(index, 1)
    } else {
      selectedAnswer.value.push(key)
    }
    selectedAnswer.value = [...selectedAnswer.value]
  } else {
    selectedAnswer.value = key
  }
}

const isSelected = (key) => {
  if (Array.isArray(selectedAnswer.value)) {
    return selectedAnswer.value.includes(key)
  }
  return selectedAnswer.value === key
}

const isCorrectOption = (key) => {
  if (!currentQuestion.value?.answer?.selected) return false
  const correctAnswer = currentQuestion.value.answer.selected
  // 处理字符串格式的答案（如 "A" 或 "A,B,D"）
  if (typeof correctAnswer === 'string') {
    const correctKeys = correctAnswer.split(',').map(s => s.trim())
    return correctKeys.includes(key)
  }
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.includes(key)
  }
  return correctAnswer === key
}

const submitAnswer = async () => {
  if (!hasAnswer.value) {
    ElMessage.warning('请先作答')
    return
  }

  const answer = currentQuestion.value.type === 'fill' || currentQuestion.value.type === 'essay'
    ? { text: textAnswer.value }
    : { selected: selectedAnswer.value }

  try {
    const res = await api.post('/practice/answers', {
      session_id: sessionId.value,
      question_id: currentQuestion.value.id,
      answer,
      time_spent: 0
    })
    
    lastAnswer.value = res.data
    showResult.value = true
  } catch (error) {
    ElMessage.error('提交失败')
  }
}

const nextQuestion = () => {
  currentIndex.value++
  loadCurrentQuestion()
}

const finishPractice = async () => {
  isCompleted.value = true
  try {
    await api.post(`/practice/sessions/${sessionId.value}/complete`)
    router.push('/profile')
  } catch (error) {
    router.push('/profile')
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatAnswer = (answer) => {
  if (answer.selected) {
    return Array.isArray(answer.selected) ? answer.selected.join(', ') : answer.selected
  }
  return answer.text || ''
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
</script>

<style scoped>
.practice-session {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  color: #f56c6c;
  font-weight: bold;
}

.question-area {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.question-title {
  font-size: 1.3rem;
  margin: 0 0 16px;
}

.question-content {
  color: #666;
  font-size: 1rem;
  margin-bottom: 24px;
  line-height: 1.6;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.option-item:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.option-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.option-item.correct {
  border-color: #67c23a;
  background: #f0f9eb;
}

.option-item.wrong {
  border-color: #f56c6c;
  background: #fef0f0;
}

.option-key {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 50%;
  margin-right: 12px;
  font-weight: bold;
}

.option-value {
  flex: 1;
}

.input-area {
  margin-bottom: 20px;
}

.result-area {
  margin: 20px 0;
}

.explanation {
  margin-top: 12px;
  line-height: 1.6;
}

.actions {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.loading {
  padding: 30px;
  background: white;
  border-radius: 12px;
}
</style>
