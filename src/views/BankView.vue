<template>
  <div class="bank-view">
    <div class="header">
      <h1>题库管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 创建题库
      </el-button>
    </div>

    <div class="bank-list" v-loading="loading">
      <div v-if="banks.length === 0 && !loading" class="empty">
        <el-empty description="暂无题库" />
      </div>
      <div v-for="bank in banks" :key="bank.id" class="bank-card">
        <div class="bank-info">
          <h3>{{ bank.name }}</h3>
          <p>{{ bank.description || '暂无描述' }}</p>
          <div class="bank-meta">
            <el-tag size="small">{{ bank.question_count }} 道题目</el-tag>
            <el-tag v-if="bank.is_public" type="success" size="small">公开</el-tag>
            <el-tag v-else type="info" size="small">私有</el-tag>
          </div>
        </div>
        <div class="bank-actions">
          <el-button size="small" @click="viewBank(bank.id)">查看</el-button>
          <el-button size="small" type="primary" @click="importQuestions(bank.id)">导入</el-button>
          <el-button size="small" type="danger" @click="deleteBank(bank)">删除</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showCreateDialog" title="创建题库" width="500px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入题库名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="请输入题库描述" />
        </el-form-item>
        <el-form-item label="公开">
          <el-switch v-model="createForm.is_public" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createBank" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showImportDialog" title="导入题目" width="600px">
      <div class="import-tips">
        <el-alert type="info" :closable="false">
          <strong>Excel 格式说明：</strong>
          <br>必需列：题目
          <br>可选列：类型、选项、答案、解析、分类、难度
          <br><br>
          <strong>示例格式：</strong>
          <br>题目 | 类型 | 选项 | 答案 | 解析 | 分类 | 难度
          <br>以下哪个是JS的数据类型？ | 单选 | A.number B.boolean C.undefined D.以上都是 | D | JS有六种基本数据类型 | 前端 | 简单
          <br><br>
          <strong>类型：</strong>单选、多选、判断（默认单选）
          <br><strong>难度：</strong>简单、中等、困难（默认中等）
          <br><strong>选项格式：</strong>A.选项1 B.选项2 C.选项3 D.选项4（空格分隔）
          <br><strong>答案格式：</strong>单选/判断填A/B/C/D，多选用逗号分隔如A,B,C
        </el-alert>
      </div>
      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div>将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="upload-tip">请使用 Excel 保存为 .xlsx 格式（不要用CSV格式）</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="submitImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const router = useRouter()
const loading = ref(false)
const banks = ref([])
const showCreateDialog = ref(false)
const showImportDialog = ref(false)
const creating = ref(false)
const importing = ref(false)
const createFormRef = ref()
const uploadRef = ref()
const importFile = ref(null)
const currentImportBankId = ref(null)

const createForm = reactive({
  name: '',
  description: '',
  is_public: false
})

const createRules = {
  name: [{ required: true, message: '请输入题库名称', trigger: 'blur' }]
}

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

const createBank = async () => {
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  creating.value = true
  try {
    await api.post('/banks', createForm)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    createFormRef.value.resetFields()
    loadBanks()
  } catch (error) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    creating.value = false
  }
}

const viewBank = (id) => {
  router.push(`/banks/${id}`)
}

const importQuestions = (bankId) => {
  currentImportBankId.value = bankId
  showImportDialog.value = true
}

const handleFileChange = (file) => {
  importFile.value = file.raw
}

const submitImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请选择文件')
    return
  }

  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    
    await api.upload(`/banks/${currentImportBankId.value}/import`, formData)
    ElMessage.success('导入成功')
    showImportDialog.value = false
    uploadRef.value.clearFiles()
    loadBanks()
  } catch (error) {
    ElMessage.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}

const deleteBank = async (bank) => {
  try {
    await ElMessageBox.confirm(`确定要删除题库"${bank.name}"吗？`, '提示', {
      type: 'warning'
    })
    
    await api.delete(`/banks/${bank.id}`)
    ElMessage.success('删除成功')
    loadBanks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}
</script>

<style scoped>
.bank-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  gap: 8px;
}

.bank-actions {
  display: flex;
  gap: 8px;
}

.import-tips {
  margin-bottom: 20px;
}

.upload-area {
  text-align: center;
  padding: 30px 0;
}

.upload-icon {
  font-size: 48px;
  color: #909399;
  margin-bottom: 16px;
}

.upload-tip {
  margin-top: 12px;
  color: #909399;
  font-size: 13px;
}

.empty {
  padding: 60px 0;
}
</style>
