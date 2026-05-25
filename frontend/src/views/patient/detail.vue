<template>
  <div class="patient-detail">
    <div class="page-header">
      <el-button @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>患者详情</h2>
      <el-button type="primary" @click="handleEdit">编辑信息</el-button>
    </div>

    <div v-loading="loading">
      <!-- 基本信息 -->
      <div class="info-card">
        <div class="card-header">
          <span>基本信息</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">患者ID</span>
            <span class="value">{{ patient.patient_id }}</span>
          </div>
          <div class="info-item">
            <span class="label">姓名</span>
            <span class="value">{{ patient.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">性别</span>
            <span class="value">{{ patient.gender === 'M' ? '男' : '女' }}</span>
          </div>
          <div class="info-item">
            <span class="label">年龄</span>
            <span class="value">{{ patient.age }}岁</span>
          </div>
          <div class="info-item">
            <span class="label">床位号</span>
            <span class="value">{{ patient.bed_number }}</span>
          </div>
          <div class="info-item">
            <span class="label">入院日期</span>
            <span class="value">{{ formatDate(patient.admission_date) }}</span>
          </div>
          <div class="info-item">
            <span class="label">主治医生</span>
            <span class="value">{{ patient.attendingDoctor?.real_name || '--' }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态</span>
            <el-tag :type="patient.status === 'admitted' ? 'success' : 'info'" size="small">
              {{ patient.status === 'admitted' ? '在院' : '出院' }}
            </el-tag>
          </div>
          <div class="info-item">
            <span class="label">病史</span>
            <span class="value">{{ patient.medical_history || '无记录' }}</span>
          </div>
          <div class="info-item">
            <span class="label">过敏史</span>
            <span class="value" :class="{ 'text-danger': patient.allergy }">{{ patient.allergy || '无已知过敏' }}</span>
          </div>
        </div>
      </div>

      <!-- 最新体征 -->
      <div class="info-card">
        <div class="card-header">
          <span>最新体征</span>
          <span class="header-time" v-if="latestVital">采集于 {{ formatDateTime(latestVital.collect_time) }}</span>
        </div>
        <div v-if="latestVital" class="vital-grid">
          <div class="vital-item">
            <div class="vital-icon pulse">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="vital-content">
              <span class="vital-label">脉搏</span>
              <span class="vital-value">{{ latestVital.pulse }} <small>次/分</small></span>
            </div>
          </div>
          <div class="vital-item">
            <div class="vital-icon temp">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
              </svg>
            </div>
            <div class="vital-content">
              <span class="vital-label">体温</span>
              <span class="vital-value">{{ latestVital.temperature }} <small>°C</small></span>
            </div>
          </div>
          <div class="vital-item">
            <div class="vital-icon bp">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="vital-content">
              <span class="vital-label">血压</span>
              <span class="vital-value">{{ latestVital.blood_pressure }} <small>mmHg</small></span>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无体征数据" :image-size="80" />
      </div>

      <!-- 最近报警 -->
      <div class="info-card">
        <div class="card-header">
          <span>最近报警</span>
        </div>
        <el-table v-if="alerts.length" :data="alerts" stripe>
          <el-table-column prop="timestamp" label="时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="alertLevel" label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="getAlertType(row.alertLevel)" size="small">
                {{ row.alertLevel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="indicator" label="指标" width="100">
            <template #default="{ row }">
              {{ getIndicatorName(row.indicator) }}
            </template>
          </el-table-column>
          <el-table-column prop="alertContent" label="内容" />
          <el-table-column prop="actualValue" label="实际值" width="100" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <span :class="'status-' + row.status">{{ row.status }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无报警记录" :image-size="80" />
      </div>

      <!-- 最近报告 -->
      <div class="info-card">
        <div class="card-header">
          <span>病情报告</span>
          <el-button type="primary" link size="small" @click="goToReports">查看全部</el-button>
        </div>
        <el-table v-if="reports.length" :data="reports" stripe>
          <el-table-column prop="report_id" label="报告ID" width="100" />
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="create_time" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.create_time) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewReport(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无报告" :image-size="80" />
      </div>

      <!-- 诊疗建议 -->
      <div class="info-card" v-if="userStore.isDoctor || userStore.isNurse">
        <div class="card-header">
          <span>诊疗建议</span>
          <el-button v-if="userStore.isDoctor" type="primary" size="small" @click="showAdviceDialog">
            录入建议
          </el-button>
        </div>
        <el-table v-if="advices.length" :data="advices" stripe>
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="type" label="类型" width="90">
            <template #default="{ row }">
              <el-tag :type="adviceTypeTag(row.type)" size="small">{{ adviceTypeName(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
          <el-table-column prop="doctor.real_name" label="录入医生" width="100" />
          <el-table-column prop="create_time" label="录入时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.create_time) }}
            </template>
          </el-table-column>
          <el-table-column v-if="userStore.isDoctor" label="操作" width="80">
            <template #default="{ row }">
              <el-button type="danger" link size="small" @click="deleteAdvice(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无诊疗建议" :image-size="80" />
      </div>
    </div>

    <!-- 诊疗建议录入弹窗 -->
    <el-dialog v-model="adviceVisible" title="录入诊疗建议" width="500px">
      <el-form ref="adviceFormRef" :model="adviceForm" :rules="adviceRules" label-width="80px">
        <el-form-item label="建议类型" prop="type">
          <el-select v-model="adviceForm.type" style="width: 100%">
            <el-option label="治疗方案" value="treatment" />
            <el-option label="饮食指导" value="diet" />
            <el-option label="康复事项" value="rehabilitation" />
            <el-option label="健康建议" value="health" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="adviceForm.title" placeholder="请输入建议标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="adviceForm.content" type="textarea" rows="4" placeholder="请输入建议内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adviceVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdvice">确定</el-button>
      </template>
    </el-dialog>

    <!-- 报告详情弹窗 -->
    <el-dialog v-model="reportDetailVisible" title="报告详情" width="700px">
      <div v-if="currentReport" class="report-detail-popup">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="报告标题">{{ currentReport.title }}</el-descriptions-item>
          <el-descriptions-item label="患者">{{ currentReport.patientName }}</el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatDateTime(currentReport.start_time) }} 至 {{ formatDateTime(currentReport.end_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">{{ currentReport.version }}</el-descriptions-item>
        </el-descriptions>
        <pre class="report-content-popup" v-if="currentReport.content">{{ currentReport.content }}</pre>
      </div>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="编辑患者" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
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
          <el-input v-model="form.bedNumber" />
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
        <el-form-item label="病史">
          <el-input v-model="form.medicalHistory" type="textarea" rows="2" placeholder="请输入病史" />
        </el-form-item>
        <el-form-item label="过敏史">
          <el-input v-model="form.allergy" placeholder="请输入过敏史（如：青霉素过敏）" />
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
import { useRoute, useRouter } from 'vue-router'
import { getPatientById, getLatestVital, updatePatient, getDoctors } from '@/api/patient'
import { getAlertsByPatient } from '@/api/vital'
import { getReports, getReportById } from '@/api/report'
import { getAdvicesByPatient, createAdvice, deleteAdvice as deleteAdviceApi } from '@/api/advice'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const ArrowLeft = 'ArrowLeft'

const loading = ref(false)
const patient = ref({})
const latestVital = ref(null)
const alerts = ref([])
const reports = ref([])
const doctors = ref([])
const advices = ref([])
const reportDetailVisible = ref(false)
const currentReport = ref(null)

const dialogVisible = ref(false)
const adviceVisible = ref(false)
const adviceFormRef = ref()
const adviceForm = reactive({
  type: 'treatment',
  title: '',
  content: ''
})
const adviceRules = {
  type: [{ required: true, message: '请选择建议类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}
const formRef = ref()
const form = reactive({
  name: '',
  gender: 'M',
  age: 30,
  bedNumber: '',
  attendingDoctorId: '',
  medicalHistory: '',
  allergy: ''
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  bedNumber: [{ required: true, message: '请输入床位号', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  const patientId = route.params.id

  try {
    const [patientRes, vitalRes, alertsRes, reportsRes, doctorsRes, advicesRes] = await Promise.all([
      getPatientById(patientId),
      getLatestVital(patientId).catch(() => ({ data: null })),
      getAlertsByPatient(patientId).catch(() => ({ data: { list: [] } })),
      getReports({ patientId, size: 5 }).catch(() => ({ data: { list: [] } })),
      getDoctors().catch(() => ({ data: [] })),
      getAdvicesByPatient(patientId).catch(() => ({ data: [] }))
    ])

    patient.value = patientRes.data
    latestVital.value = vitalRes.data?.latestVital || vitalRes.data
    alerts.value = alertsRes.data?.list?.slice(0, 5) || []
    reports.value = reportsRes.data?.list || []
    doctors.value = doctorsRes.data || []
    advices.value = advicesRes.data || []
  } catch (error) {
    ElMessage.error('加载患者详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const handleEdit = () => {
  form.name = patient.value.name
  form.gender = patient.value.gender
  form.age = patient.value.age
  form.bedNumber = patient.value.bed_number
  form.attendingDoctorId = patient.value.attending_doctor_id
  form.medicalHistory = patient.value.medical_history || ''
  form.allergy = patient.value.allergy || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  try {
    await formRef.value.validate()
    await updatePatient(patient.value.patient_id, {
      name: form.name,
      gender: form.gender,
      age: form.age,
      bedNumber: form.bedNumber,
      attendingDoctorId: form.attendingDoctorId,
      medicalHistory: form.medicalHistory,
      allergy: form.allergy
    })
    ElMessage.success('更新成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

const goToReports = () => {
  router.push({ path: '/reports', query: { patientId: patient.value.patient_id } })
}

const viewReport = async (row) => {
  try {
    const res = await getReportById(row.report_id)
    currentReport.value = res.data
    reportDetailVisible.value = true
  } catch (error) {
    ElMessage.error('加载报告详情失败')
  }
}

const showAdviceDialog = () => {
  adviceForm.type = 'treatment'
  adviceForm.title = ''
  adviceForm.content = ''
  adviceVisible.value = true
}

const submitAdvice = async () => {
  try {
    await adviceFormRef.value.validate()
    await createAdvice({
      patientId: patient.value.patient_id,
      type: adviceForm.type,
      title: adviceForm.title,
      content: adviceForm.content
    })
    ElMessage.success('诊疗建议已录入')
    adviceVisible.value = false
    loadData()
  } catch (error) {
    if (error !== false) {
      ElMessage.error('录入失败')
    }
  }
}

const deleteAdvice = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除该诊疗建议？', '提示', { type: 'warning' })
    await deleteAdviceApi(row.advice_id)
    ElMessage.success('已删除')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const adviceTypeTag = (type) => {
  const map = { treatment: 'danger', diet: 'success', rehabilitation: 'warning', health: 'info' }
  return map[type] || 'info'
}

const adviceTypeName = (type) => {
  const map = { treatment: '治疗', diet: '饮食', rehabilitation: '康复', health: '健康' }
  return map[type] || type
}

const formatDate = (date) => {
  if (!date) return '--'
  return new Date(date).toLocaleDateString()
}

const formatDateTime = (date) => {
  if (!date) return '--'
  return new Date(date).toLocaleString()
}

const getAlertType = (level) => {
  const map = { '危急': 'danger', '严重': 'warning', '一般': 'info' }
  return map[level] || 'info'
}

const getIndicatorName = (indicator) => {
  const map = {
    pulse: '脉搏',
    temperature: '体温',
    bloodPressure_systolic: '收缩压',
    bloodPressure_diastolic: '舒张压'
  }
  return map[indicator] || indicator
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.patient-detail {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.page-header h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
}

.info-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-base);
  font-weight: 600;
  color: #111827;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid #e5e7eb;
}

.header-time {
  font-size: var(--text-xs);
  font-weight: 400;
  color: #6b7280;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.info-item .label {
  font-size: var(--text-xs);
  color: #6b7280;
}

.info-item .value {
  font-size: var(--text-base);
  color: #111827;
  font-weight: 500;
}

.vital-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.vital-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background-color: #f8f9fa;
  border-radius: 8px;
}

.vital-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.vital-icon.pulse {
  background-color: #fef2f2;
  color: #dc2626;
}

.vital-icon.temp {
  background-color: #fef3c7;
  color: #d97706;
}

.vital-icon.bp {
  background-color: #ede9fe;
  color: #7c3aed;
}

.vital-content {
  display: flex;
  flex-direction: column;
}

.vital-label {
  font-size: var(--text-xs);
  color: #6b7280;
}

.vital-value {
  font-size: var(--text-lg);
  font-weight: 600;
  color: #111827;
}

.vital-value small {
  font-size: var(--text-xs);
  font-weight: 400;
  color: #6b7280;
}

.status-待处理 {
  color: #dc2626;
}

.status-已确认 {
  color: #2563eb;
}

.status-已解除 {
  color: #6b7280;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .vital-grid {
    grid-template-columns: 1fr;
  }
}

.report-content-popup {
  background: var(--bg-light);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  font-size: var(--text-sm);
  line-height: 1.8;
  max-height: 400px;
  overflow-y: auto;
  margin-top: var(--space-4);
}
</style>
