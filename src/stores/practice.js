import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

export const usePracticeStore = defineStore('practice', () => {
  // 状态
  const currentSession = ref(null)
  const questionList = ref([])
  const currentIndex = ref(0)
  const answers = ref({})
  const timeSpent = ref(0)
  const timer = ref(null)
  const isLoading = ref(false)
  const mode = ref('practice') // practice | exam | review

  // 计算属性
  const currentQuestion = computed(() => questionList.value[currentIndex.value])
  const progress = computed(() => {
    if (questionList.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / questionList.value.length) * 100)
  })
  const answeredCount = computed(() => Object.keys(answers.value).length)
  const isFinished = computed(() => answeredCount.value === questionList.value.length)

  // 开始练习
  async function startPractice(params) {
    isLoading.value = true
    try {
      const res = await api.post('/practice/start', params)
      currentSession.value = res.data.session
      questionList.value = res.data.questions
      currentIndex.value = 0
      answers.value = {}
      timeSpent.value = 0
      mode.value = params.mode || 'practice'
      startTimer()
      return res.data
    } catch (error) {
      ElMessage.error('开始练习失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 提交答案
  function submitAnswer(questionId, answer) {
    answers.value[questionId] = answer
  }

  // 下一题
  function nextQuestion() {
    if (currentIndex.value < questionList.value.length - 1) {
      currentIndex.value++
    }
  }

  // 上一题
  function prevQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  // 跳转到指定题目
  function goToQuestion(index) {
    if (index >= 0 && index < questionList.value.length) {
      currentIndex.value = index
    }
  }

  // 计时器
  function startTimer() {
    if (timer.value) clearInterval(timer.value)
    timer.value = setInterval(() => {
      timeSpent.value++
    }, 1000)
  }

  function stopTimer() {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  // 提交练习
  async function submitPractice() {
    stopTimer()
    try {
      const res = await api.post('/practice/submit', {
        sessionId: currentSession.value?.id,
        answers: answers.value,
        timeSpent: timeSpent.value
      })
      ElMessage.success('提交成功')
      return res.data
    } catch (error) {
      ElMessage.error('提交失败')
      throw error
    }
  }

  // 获取练习记录
  async function fetchPracticeHistory(params) {
    try {
      const res = await api.get('/practice/history', params)
      return res.data
    } catch (error) {
      ElMessage.error('获取记录失败')
      throw error
    }
  }

  // 获取练习详情
  async function fetchPracticeDetail(id) {
    try {
      const res = await api.get(`/practice/${id}`)
      return res.data
    } catch (error) {
      ElMessage.error('获取详情失败')
      throw error
    }
  }

  // 重置
  function reset() {
    currentSession.value = null
    questionList.value = []
    currentIndex.value = 0
    answers.value = {}
    timeSpent.value = 0
    stopTimer()
  }

  // 格式化时间
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return {
    currentSession,
    questionList,
    currentIndex,
    answers,
    timeSpent,
    isLoading,
    mode,
    currentQuestion,
    progress,
    answeredCount,
    isFinished,
    startPractice,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    startTimer,
    stopTimer,
    submitPractice,
    fetchPracticeHistory,
    fetchPracticeDetail,
    reset,
    formatTime
  }
})