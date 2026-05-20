<template>
  <div class="patient-container">
    <div class="page-header">
      <h2>患者管理</h2>
      <div class="header-actions">
        <el-input 
          v-model="keyword" 
          placeholder="搜索患者姓名/ID" 
          style="width: 200px"
          clearable
          @clear="loadPatients"
          @keyup.enter="loadPatients"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="handleAdd">新增患者</el-button>
      </div>
    </div>

    <el-table :data="patients" stripe style="width: 100%">
      <el-table-column prop="patient_id" label="患者ID" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="gender" label="性别" width="80">
        <template #default="{ row }">
          {{ row.gender === 'M' ? '男' : '女' }}
        </template>
      </el-table-column>
      <el-table-column prop="age" label="年龄" width="80" />
      <el-table-column prop="bed_number" label="床位号" width="120" />
      <el-table-column prop="attendingDoctor.real_name" label="主治医生" width="120" />
      <el-table-column prop="admission_date" label="入院日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.admission_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'admitted' ? 'success' : 'info'" size="small">
            {{ row.status === 'admitted' ? '在院' : '出院' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top: 20px"
      @size-change="loadPatients"
      @current-change="loadPatients"
    />

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio label="M">男</el-radio>
            <el-radio label="F">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="form.age" :min="0" :max="150" />
        </el-form-item>
        <el-form-item label="床位号" prop="bedNumber">
          <el-input v-model="form.bedNumber" placeholder="如: A区-301床" />
        </el-form-item>
        <el-form-item label="主治医生" prop="attendingDoctorId">
          <el-select v-model="form.attendingDoctorId" placeholder="请选择">
            <el-option 
              v-for="doc in doctors" 
              :key="doc.user_id" 
              :label="doc.real_name" 
              :value="doc.user_id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getPatients, createPatient, updatePatient } from '@/api/patient'
import { ElMessage } from 'element-plus'

const Search = 'Search'

const patients = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const keyword = ref('')
const doctors = ref([])

const dialogVisible = ref(false)
const dialogTitle = ref('新增患者')
const dialogMode = ref('add')
const currentPatientId = ref(null)
const formRef = ref()

const form = reactive({
  name: '',
  gender: 'M',
  age: 30,
  bedNumber: '',
  attendingDoctorId: ''
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  bedNumber: [{ required: true, message: '请输入床位号', trigger: 'blur' }]
}

const loadPatients = async () => {
  try {
    const res = await getPatients({
      page: page.value,
      size: size.value,
      keyword: keyword.value || undefined
    })
    patients.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('加载患者列表失败')
  }
}

const handleAdd = () => {
  dialogMode.value = 'add'
  dialogTitle.value = '新增患者'
  Object.assign(form, { name: '', gender: 'M', age: 30, bedNumber: '', attendingDoctorId: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑患者'
  currentPatientId.value = row.patient_id
  Object.assign(form, {
    name: row.name,
    gender: row.gender,
    age: row.age,
    bedNumber: row.bed_number,
    attendingDoctorId: row.attending_doctor_id
  })
  dialogVisible.value = true
}

const handleView = (row) => {
  // TODO: 跳转到患者详情页
  ElMessage.info('查看详情功能开发中')
}

const submitForm = async () => {
  try {
    await formRef.value.validate()
    const data = {
      name: form.name,
      gender: form.gender,
      age: form.age,
      bedNumber: form.bedNumber,
      attendingDoctorId: form.attendingDoctorId
    }
    
    if (dialogMode.value === 'add') {
      await createPatient(data)
      ElMessage.success('新增成功')
    } else {
      await updatePatient(currentPatientId.value, data)
      ElMessage.success('更新成功')
    }
    
    dialogVisible.value = false
    loadPatients()
  } catch (error) {
    console.error(error)
  }
}

const formatDate = (date) => {
  if (!date) return '--'
  return new Date(date).toLocaleDateString()
}

onMounted(() => {
  loadPatients()
  // TODO: 加载医生列表
})
</script>

<style scoped>
.patient-container { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 { margin: 0; }

.header-actions { display: flex; gap: 10px; }
</style>
