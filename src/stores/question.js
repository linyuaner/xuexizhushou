import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

export const useQuestionStore = defineStore('question', () => {
  // 状态
  const questions = ref([])
  const currentQuestion = ref(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const isLoading = ref(false)
  const filters = ref({
    type: '',
    difficulty: '',
    bankId: '',
    keyword: ''
  })

  // 计算属性
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  // 获取题目列表
  async function fetchQuestions() {
    isLoading.value = true
    try {
      const params = {
        page: page.value,
        pageSize: pageSize.value,
        ...filters.value
      }
      const res = await api.get('/questions', params)
      questions.value = res.data.list
      total.value = res.data.total
    } catch (error) {
      ElMessage.error('获取题目列表失败')
    } finally {
      isLoading.value = false
    }
  }

  // 获取单个题目详情
  async function fetchQuestionDetail(id) {
    isLoading.value = true
    try {
      const res = await api.get(`/questions/${id}`)
      currentQuestion.value = res.data
      return res.data
    } catch (error) {
      ElMessage.error('获取题目详情失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 创建题目
  async function createQuestion(data) {
    try {
      const res = await api.post('/questions', data)
      ElMessage.success('创建成功')
      return res
    } catch (error) {
      ElMessage.error('创建失败')
      throw error
    }
  }

  // 更新题目
  async function updateQuestion(id, data) {
    try {
      const res = await api.put(`/questions/${id}`, data)
      ElMessage.success('更新成功')
      return res
    } catch (error) {
      ElMessage.error('更新失败')
      throw error
    }
  }

  // 删除题目
  async function deleteQuestion(id) {
    try {
      await api.delete(`/questions/${id}`)
      ElMessage.success('删除成功')
      await fetchQuestions()
    } catch (error) {
      ElMessage.error('删除失败')
      throw error
    }
  }

  // 设置筛选条件
  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    page.value = 1
  }

  // 重置筛选
  function resetFilters() {
    filters.value = {
      type: '',
      difficulty: '',
      bankId: '',
      keyword: ''
    }
    page.value = 1
  }

  // 分页
  function setPage(newPage) {
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