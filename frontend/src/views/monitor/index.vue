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
        <div class="stat-icon stat-icon-primary">
          <el-icon size="24"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ patients.length }}</div>
          <div class="stat-label">在院患者</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-danger">
          <el-icon size="24"><Bell /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value text-danger">{{ alertStats.pendingCount || 0 }}</div>
          <div class="stat-label">待处理报警</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-success">
          <el-icon size="24"><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value text-success">{{ normalCount }}</div>
          <div class="stat-label">状态正常</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-warning">
          <el-icon size="24"><Warning /></el-icon>
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

        <h4 style="margin: var(--space-5) 0 var(--space-3)">体征趋势图（24小时）</h4>
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
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
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
  setInterval(loadPatients, 30000)
})
</script>

<style scoped>
.monitor-container { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.page-header h2 { margin: 0; font-size: var(--text-xl); font-weight: 600; }

.header-actions { display: flex; gap: var(--space-3); }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.stat-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-primary { background: var(--bg-light); color: var(--color-primary); }
.stat-icon-danger { background: #fef2f2; color: var(--color-error); }
.stat-icon-success { background: #f0fdf4; color: var(--color-success); }
.stat-icon-warning { background: #fef3c7; color: var(--color-warning); }

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
}

.text-danger { color: var(--color-error); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }

.stat-label { color: var(--text-secondary); font-size: var(--text-sm); margin-top: var(--space-1); }

.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-5);
}

.patient-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: box-shadow 0.2s;
}

.patient-card:hover {
  box-shadow: var(--shadow-md);
}

.patient-card.has-alert {
  border-color: var(--color-error);
  animation: alertPulse 2s infinite;
}

@keyframes alertPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.patient-info { display: flex; flex-direction: column; }

.patient-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.bed-number {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.vital-data {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.vital-item { text-align: center; }

.vital-label { display: block; font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }

.vital-value {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
}

.vital-value.abnormal { color: var(--color-error); }

.vital-value .unit { font-size: var(--text-xs); font-weight: 400; color: var(--text-secondary); }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
}

.update-time { font-size: var(--text-xs); color: var(--text-secondary); }

.chart-container { width: 100%; height: 300px; }
</style>
