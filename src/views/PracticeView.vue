<template>
  <div class="practice-view">
    <div class="header">
      <h1>选择练习</h1>
    </div>

    <div class="quick-start">
      <div class="quick-card" @click="quickPractice('all_random')">
        <el-icon :size="48"><RefreshRight /></el-icon>
        <h3>快速练习</h3>
        <p>从所有题目中随机抽取练习</p>
      </div>
      <div class="quick-card" @click="quickPractice('all_sequential')">
        <el-icon :size="48"><Rank /></el-icon>
        <h3>顺序练习</h3>
        <p>按题目顺序逐个练习</p>
      </div>
      <div class="quick-card" @click="quickPractice('exam')">
        <el-icon :size="48"><Timer /></el-icon>
        <h3>模拟考试</h3>
        <p>限时答题，模拟考试环境</p>
      </div>
    </div>

    <el-divider>或选择题库</el-divider>

    <div class="bank-list" v-loading="loading">
      <div v-if="banks.length === 0 && !loading" class="empty">
        <el-empty description="暂无题库" />
      </div>
      <div v-for="bank in banks" :key="bank.id" class="bank-card">
        <div class="bank-info">
          <h3>{{ bank.name }}</h3>
          <p>{{ bank.description || '暂无描述' }}</p>
          <div class="bank-meta">
            <span><el-icon><Document /></el-icon> {{ bank.question_count }} 道题目</span>
            <span v-if="bank.creator_name"><el-icon><User /></el-icon> {{ bank.creator_name }}</span>
          </div>
        </div>
        <div class="bank-actions">
          <el-button type="primary" @click="startPractice(bank.id)">开始练习</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showModeDialog" title="选择练习模式" width="500px">
      <div class="mode-grid">
        <div class="mode-card" @click="selectMode('sequential')">
          <el-icon :size="40"><Rank /></el-icon>
          <h4>顺序练习</h4>
          <p>按题库顺序逐个练习</p>
        </div>
        <div class="mode-card" @click="selectMode('random')">
          <el-icon :size="40"><RefreshRight /></el-icon>
          <h4>随机练习</h4>
          <p>随机抽取题目练习</p>
        </div>
        <div class="mode-card" @click="selectMode('exam')">
          <el-icon :size="40"><Timer /></el-icon>
          <h4>模拟考试</h4>
          <p>限时答题，模拟考试环境</p>
        </div>
        <div class="mode-card" @click="selectMode('wrong')">
          <el-icon :size="40"><Warning /></el-icon>
          <h4>错题练习</h4>
          <p>练习你的错题</p>
        </div>
        <div class="mode-card" @click="selectMode('favorite')">
          <el-icon :size="40"><Star /></el-icon>
          <h4>收藏练习</h4>
          <p>练习你收藏的题目</p>
        </div>
        <div class="mode-card" @click="selectMode('easy_wrong')">
          <el-icon :size="40"><Aim /></el-icon>
          <h4>易错题</h4>
          <p>练习错误率高的题目</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Document, User, Rank, RefreshRight, Timer, Warning, Star, Aim } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const router = useRouter()
const loading = ref(false)
const banks = ref([])
const showModeDialog = ref(false)
const selectedBankId = ref(null)

onMounted(() => {
  loadBanks()
})

const loadBanks = async () => {
  loading.value = true
  try {
    const res = await api.get('/banks')
    banks.value = res.data
  } catch (error) {
    console.error('获取题库列表失败', error)
  } finally {
    loading.value = false
  }
}

// 快速练习 - 不需要选择题库
const quickPractice = async (mode) => {
  try {
    let practiceType = mode
    if (mode === 'all_random') {
      practiceType = 'all_random'
    } else if (mode === 'all_sequential') {
      practiceType = 'all_sequential'
    }
    
    const res = await api.post('/practice/sessions', {
      bank_id: null,  // 不指定题库，练习所有题目
      practice_type: practiceType,
      total_questions: 10
    })
    
    router.push({
      name: 'PracticeSession',
      query: {
        session_id: res.data.session_id,
        questions: JSON.stringify(res.data.question_ids),
        type: practiceType
      }
    })
  } catch (error) {
    ElMessage.error(error.message || '创建练习失败')
  }
}

const startPractice = (bankId) => {
  selectedBankId.value = bankId
  showModeDialog.value = true
}

const selectMode = async (mode) => {
  showModeDialog.value = false
  
  try {
    const res = await api.post('/practice/sessions', {
      bank_id: selectedBankId.value,
      practice_type: mode,
      total_questions: 10
    })
    
    router.push({
      name: 'PracticeSession',
      query: {
        session_id: res.data.session_id,
        questions: JSON.stringify(res.data.question_ids),
        type: mode
      }
    })
  } catch (error) {
    ElMessage.error(error.message || '创建练习失败')
  }
}
</script>

<style scoped>
.practice-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
}

.quick-start {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.quick-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.quick-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.quick-card h3 {
  margin: 12px 0 8px;
  font-size: 1.2rem;
}

.quick-card p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.bank-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bank-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bank-info h3 {
  margin: 0 0 8px;
}

.bank-info p {
  color: #666;
  margin: 0 0 12px;
}

.bank-meta {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 0.9rem;
}

.bank-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.mode-card {
  padding: 20px;
  border: 2px solid #eee;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-card:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.mode-card h4 {
  margin: 12px 0 4px;
}

.mode-card p {
  color: #666;
  font-size: 0.85rem;
  margin: 0;
}

.empty {
  padding: 60px 0;
}

@media (max-width: 768px) {
  .quick-start {
    grid-template-columns: 1fr;
  }
}
</style>
