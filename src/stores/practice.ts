import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import type { PracticeSession, Question, ApiResponse } from '@/types/question'

interface StartPracticeParams {
  type?: string
  bankId?: number
  category?: string
  count?: number
  mode?: 'practice' | 'exam' | 'review'
}

interface SubmitPracticeParams {
  sessionId: number
  answers: Record<number, string>
  timeSpent: number
}

export const usePracticeStore = defineStore('practice', () => {
  const currentSession = ref<PracticeSession | null>(null)
  const questionList = ref<Question[]>([])
  const currentIndex = ref(0)
  const answers = ref<Record<number | string, string>>({})
  const timeSpent = ref(0)
  const timer = ref<ReturnType<typeof setInterval> | null>(null)
  const isLoading = ref(false)
  const mode = ref<'practice' | 'exam' | 'review'>('practice')

  const currentQuestion = computed(() => questionList.value[currentIndex.value])
  const progress = computed(() => {
    if (questionList.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / questionList.value.length) * 100)
  })
  const answeredCount = computed(() => Object.keys(answers.value).length)
  const isFinished = computed(() => answeredCount.value === questionList.value.length)

  async function startPractice(params: StartPracticeParams): Promise<{ session: PracticeSession; questions: Question[] }> {
    isLoading.value = true
    try {
      const res = await api.post<ApiResponse<{ session: PracticeSession; questions: Question[] }>>('/practice/start', params)
      const data = res.data as { session: PracticeSession; questions: Question[] }
      currentSession.value = data.session
      questionList.value = data.questions
      currentIndex.value = 0
      answers.value = {}
      timeSpent.value = 0
      mode.value = params.mode || 'practice'
      startTimer()
      return data
    } catch (error) {
      ElMessage.error('开始练习失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function submitAnswer(questionId: number | string, answer: string): void {
    answers.value[questionId] = answer
  }

  function nextQuestion(): void {
    if (currentIndex.value < questionList.value.length - 1) {
      currentIndex.value++
    }
  }

  function prevQuestion(): void {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function goToQuestion(index: number): void {
    if (index >= 0 && index < questionList.value.length) {
      currentIndex.value = index
    }
  }

  function startTimer(): void {
    if (timer.value) clearInterval(timer.value)
    timer.value = setInterval(() => {
      timeSpent.value++
    }, 1000)
  }

  function stopTimer(): void {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  async function submitPractice(): Promise<unknown> {
    stopTimer()
    try {
      const res = await api.post<ApiResponse>('/practice/submit', {
        sessionId: currentSession.value?.id,
        answers: answers.value,
        timeSpent: timeSpent.value
      } as SubmitPracticeParams)
      ElMessage.success('提交成功')
      return res.data
    } catch (error) {
      ElMessage.error('提交失败')
      throw error
    }
  }

  async function fetchPracticeHistory(params?: Record<string, unknown>): Promise<unknown> {
    try {
      const res = await api.get<ApiResponse>('/practice/history', params)
      return res.data
    } catch (error) {
      ElMessage.error('获取记录失败')
      throw error
    }
  }

  async function fetchPracticeDetail(id: number | string): Promise<unknown> {
    try {
      const res = await api.get<ApiResponse>(`/practice/${id}`)
      return res.data
    } catch (error) {
      ElMessage.error('获取详情失败')
      throw error
    }
  }

  function reset(): void {
    currentSession.value = null
    questionList.value = []
    currentIndex.value = 0
    answers.value = {}
    timeSpent.value = 0
    stopTimer()
  }

  function formatTime(seconds: number): string {
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
