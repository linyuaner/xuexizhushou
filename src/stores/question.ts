import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import type { Question, ApiResponse } from '@/types/question'

interface QuestionFilters {
  type: string
  difficulty: string
  bankId: string
  keyword: string
}

interface QuestionListResponse {
  list: Question[]
  total: number
}

export const useQuestionStore = defineStore('question', () => {
  const questions = ref<Question[]>([])
  const currentQuestion = ref<Question | null>(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const isLoading = ref(false)
  const filters = ref<QuestionFilters>({
    type: '',
    difficulty: '',
    bankId: '',
    keyword: ''
  })

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  async function fetchQuestions(): Promise<void> {
    isLoading.value = true
    try {
      const params = {
        page: page.value,
        pageSize: pageSize.value,
        ...filters.value
      }
      const res = await api.get<ApiResponse<QuestionListResponse>>('/questions', params)
      questions.value = res.data?.list || []
      total.value = res.data?.total || 0
    } catch {
      ElMessage.error('获取题目列表失败')
    } finally {
      isLoading.value = false
    }
  }

  async function fetchQuestionDetail(id: number | string): Promise<Question> {
    isLoading.value = true
    try {
      const res = await api.get<ApiResponse<Question>>(`/questions/${id}`)
      currentQuestion.value = res.data as Question
      return res.data as Question
    } catch (error) {
      ElMessage.error('获取题目详情失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function createQuestion(data: Partial<Question>): Promise<ApiResponse> {
    try {
      const res = await api.post<ApiResponse>('/questions', data)
      ElMessage.success('创建成功')
      return res
    } catch (error) {
      ElMessage.error('创建失败')
      throw error
    }
  }

  async function updateQuestion(id: number | string, data: Partial<Question>): Promise<ApiResponse> {
    try {
      const res = await api.put<ApiResponse>(`/questions/${id}`, data)
      ElMessage.success('更新成功')
      return res
    } catch (error) {
      ElMessage.error('更新失败')
      throw error
    }
  }

  async function deleteQuestion(id: number | string): Promise<void> {
    try {
      await api.delete(`/questions/${id}`)
      ElMessage.success('删除成功')
      await fetchQuestions()
    } catch (error) {
      ElMessage.error('删除失败')
      throw error
    }
  }

  function setFilters(newFilters: Partial<QuestionFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
    page.value = 1
  }

  function resetFilters(): void {
    filters.value = {
      type: '',
      difficulty: '',
      bankId: '',
      keyword: ''
    }
    page.value = 1
  }

  function setPage(newPage: number): void {
    page.value = newPage
  }

  return {
    questions,
    currentQuestion,
    total,
    page,
    pageSize,
    isLoading,
    filters,
    totalPages,
    fetchQuestions,
    fetchQuestionDetail,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    setFilters,
    resetFilters,
    setPage
  }
})
