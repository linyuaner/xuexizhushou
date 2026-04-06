<template>
  <div class="question-card" @click="handleClick">
    <div class="card-header">
      <el-tag :type="typeTag" size="small">{{ typeLabel }}</el-tag>
      <el-tag :type="difficultyTag" size="small">{{ difficultyLabel }}</el-tag>
    </div>

    <div class="card-body">
      <h3 class="question-title">{{ question.title }}</h3>
      <p v-if="showPreview" class="question-preview">
        {{ previewText }}
      </p>
    </div>

    <div class="card-footer">
      <div class="meta-info">
        <span class="bank-name">
          <el-icon><FolderOpened /></el-icon>
          {{ question.bankName }}
        </span>
        <span class="create-time">{{ question.createdAt }}</span>
      </div>
      <div class="card-actions">
        <el-button type="primary" size="small" @click.stop="startPractice">
          开始练习
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { FolderOpened } from '@element-plus/icons-vue'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  showPreview: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['click'])

const router = useRouter()

const typeLabel = computed(() => {
  const map = {
    single: '单选题',
    multiple: '多选题',
    'true-false': '判断题',
    essay: '问答题'
  }
  return map[props.question.type] || '未知'
})

const typeTag = computed(() => {
  const map = {
    single: 'primary',
    multiple: 'success',
    'true-false': 'warning',
    essay: 'info'
  }
  return map[props.question.type] || 'info'
})

const difficultyLabel = computed(() => {
  const map = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return map[props.question.difficulty] || '未知'
})

const difficultyTag = computed(() => {
  const map = {
    easy: 'success',
    medium: 'warning',
    hard: 'danger'
  }
  return map[props.question.difficulty] || 'info'
})

const previewText = computed(() => {
  if (props.question.options && props.question.options.length > 0) {
    return props.question.options.slice(0, 2).join(' | ')
  }
  return ''
})

function handleClick() {
  emit('click', props.question)
  router.push(`/question/${props.question.id}`)
}

function startPractice() {
  router.push({ path: '/practice', query: { questionId: props.question.id } })
}
</script>

<style scoped>
.question-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.question-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.card-body {
  margin-bottom: 12px;
}

.question-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.question-preview {
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #909399;
  font-size: 12px;
}

.bank-name {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>