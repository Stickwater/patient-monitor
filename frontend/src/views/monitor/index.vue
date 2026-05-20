<template>
  <div class="monitor-container">
    <div class="page-header">
      <h2>实时监护面板</h2>
      <div class="header-actions">
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="正常" value="normal" />
          <el-option label="异常" value="abnormal" />
        </el-select>
        <el-button :icon="Refresh" @click="loadPatients">刷新</el-button>
      </div>
    </div>

    <!-- 报警统计 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: #e6f7ff">
          <el-icon size="24" color="#1890ff"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ patients.length }}</div>
          <div class="stat-label">在院患者</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fff2f0">
          <el-icon size="24" color="#ff4d4f"><Bell /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value text-danger">{{ alertStats.pendingCount || 0 }}</div>
          <div class="stat-label">待处理报警</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #f6ffed">
          <el-icon size="24" color="#52c41a"><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value text-success">{{ normalCount }}</div>
          <div class="stat-label">状态正常</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fffbe6">
          <el-icon size="24" color="#faad14"><Warning /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value text-warning">{{ abnormalCount }}</div>
          <div class="stat-label">异常预警</div>
        </div>
      </div>
    </div>

    <!-- 患者卡片列表 -->
    <div class="patient-grid">
      <div 
        v-for="patient in filteredPatients" 
        :key="patient.patient_id"
        class="patient-card"
        :class="{ 'has-alert': patient.hasAlert }"
      >
        <div class="card-header">
          <div class="patient-info">
            <span class="patient-name">{{ patient.name }}</span>
            <span class="bed-number">{{ patient.bed_number }}</span>
          </div>
          <el-tag :type="patient.hasAlert ? 'danger' : 'success'" size="small">
            {{ patient.hasAlert ? '异常' : '正常' }}
          </el-tag>
        </div>
        
        <div class="vital-data">
          <div class="vital-item">
            <span class="vital-label">脉搏</span>
            <span class="vital-value" :class="{ abnormal: patient.pulseAbnormal }">
              {{ patient.latestVital?.pulse || '--' }}
              <span class="unit">次/分</span>
            </span>
          </div>
          <div class="vital-item">
            <span class="vital-label">体温</span>
            <span class="vital-value" :class="{ abnormal: patient.tempAbnormal }">
              {{ patient.latestVital?.temperature || '--' }}
              <span class="unit">°C</span>
            </span>
          </div>
          <div class="vital-item">
            <span class="vital-label">血压</span>
            <span class="vital-value" :class="{ abnormal: patient.bpAbnormal }">
              {{ patient.latestVital?.blood_pressure || '--' }}
            </span>
          </div>
        </div>
        
        <div class="card-footer">
          <span class="update-time">
            更新于 {{ formatTime(patient.latestVital?.collect_time) }}
          </span>
          <el-button type="primary" link @click="showDetail(patient)">
            查看详情
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-if="patients.length === 0" description="暂无患者数据" />

    <!-- 患者详情弹窗 -->
    <el-dialog v-model="detailVisible" title="患者详情" width="800px">
      <div v-if="currentPatient" class="patient-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="患者姓名">{{ currentPatient.name }}</el-descriptions-item>
          <el-descriptions-item label="床位号">{{ currentPatient.bed_number }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ currentPatient.age }}岁</el-descriptions-item>
          <el-descriptions-item label="性别">{{ currentPatient.gender === 'M' ? '男' : '女' }}</el-descriptions-item>
          <el-descriptions-item label="主治医生">{{ currentPatient.attendingDoctor?.real_name }}</el-descriptions-item>
          <el-descriptions-item label="入院日期">{{ formatDate(currentPatient.admission_date) }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 20px 0 10px">体征趋势图（24小时）</h4>
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { getPatients, getLatestVital } from '@/api/patient'
import { getAlertStats } from '@/api/alert'
import { getTrendData } from '@/api/vital'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const Refresh = 'Refresh'

const patients = ref([])
const alertStats = ref({})
const filterStatus = ref('')
const detailVisible = ref(false)
const currentPatient = ref(null)
const chartRef = ref(null)
let chart = null

const normalCount = computed(() => patients.value.filter(p => !p.hasAlert).length)
const abnormalCount = computed(() => patients.value.filter(p => p.hasAlert).length)

const filteredPatients = computed(() => {
  if (!filterStatus.value) return patients.value
  if (filterStatus.value === 'normal') return patients.value.filter(p => !p.hasAlert)
  return patients.value.filter(p => p.hasAlert)
})

const loadPatients = async () => {
  try {
    const res = await getPatients({ status: 'admitted', size: 100 })
    const list = res.data.list || []
    
    for (const patient of list) {
      try {
        const vitalRes = await getLatestVital(patient.patient_id)
        patient.latestVital = vitalRes.data.latestVital
        patient.hasAlert = vitalRes.data.status === 'abnormal'
      } catch {
        patient.latestVital = null
        patient.hasAlert = false
      }
    }
    
    patients.value = list
  } catch (error) {
    ElMessage.error('加载患者数据失败')
  }
}

const loadAlertStats = async () => {
  try {
    const res = await getAlertStats()
    alertStats.value = res.data
  } catch (error) {
    console.error('加载报警统计失败:', error)
  }
}

const showDetail = async (patient) => {
  currentPatient.value = patient
  detailVisible.value = true
  
  await nextTick()
  loadTrendChart(patient.patient_id)
}

const loadTrendChart = async (patientId) => {
  try {
    const res = await getTrendData(patientId, { hours: 24 })
    const { pulse, temperature, timestamps } = res.data.trendData
    
    if (!chart) {
      chart = echarts.init(chartRef.value)
    }
    
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['脉搏', '体温'] },
      xAxis: { type: 'category', data: timestamps.map(t => new Date(t).toLocaleTimeString()) },
      yAxis: [
        { type: 'value', name: '脉搏', min: 40, max: 120 },
        { type: 'value', name: '体温', min: 35, max: 40 }
      ],
      series: [
        { name: '脉搏', type: 'line', data: pulse },
        { name: '体温', type: 'line', yAxisIndex: 1, data: temperature }
      ]
    })
  } catch (error) {
    console.error('加载趋势图失败:', error)
  }
}

const formatTime = (time) => {
  if (!time) return '--'
  return new Date(time).toLocaleTimeString()
}

const formatDate = (date) => {
  if (!date) return '--'
  return new Date(date).toLocaleDateString()
}

onMounted(() => {
  loadPatients()
  loadAlertStats()
  setInterval(loadPatients, 30000) // 30秒刷新
})
</script>

<style scoped>
.monitor-container { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 { margin: 0; }

.header-actions { display: flex; gap: 10px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.text-danger { color: #ff4d4f; }
.text-success { color: #52c41a; }
.text-warning { color: #faad14; }

.stat-label { color: #909399; font-size: 14px; margin-top: 4px; }

.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.patient-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s;
}

.patient-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.patient-card.has-alert {
  border: 2px solid #ff4d4f;
  animation: alertPulse 2s infinite;
}

@keyframes alertPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,77,79,0.4); }
  50% { box-shadow: 0 0 0 10px rgba(255,77,79,0); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.patient-info { display: flex; flex-direction: column; }

.patient-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.bed-number {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.vital-data {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.vital-item { text-align: center; }

.vital-label { display: block; font-size: 13px; color: #909399; margin-bottom: 6px; }

.vital-value {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.vital-value.abnormal { color: #ff4d4f; }

.vital-value .unit { font-size: 12px; font-weight: 400; color: #909399; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.update-time { font-size: 12px; color: #909399; }

.chart-container { width: 100%; height: 300px; }
</style>
