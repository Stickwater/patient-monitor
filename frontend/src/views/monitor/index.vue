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
        :class="{ 'card-alert': patient.hasAlert }"
      >
        <div class="card-status-bar" :class="patient.hasAlert ? 'bar-danger' : 'bar-success'"></div>

        <div class="card-header">
          <div class="patient-info">
            <span class="patient-name">{{ patient.name }}</span>
            <span class="bed-number">{{ patient.bed_number }}</span>
          </div>
          <el-tag
            :type="patient.hasAlert ? 'danger' : 'success'"
            size="small"
            effect="dark"
            round
          >
            {{ patient.hasAlert ? '⚠ 异常' : '✓ 正常' }}
          </el-tag>
        </div>

        <div class="vital-grid">
          <div class="vital-cell" :class="{ 'cell-abnormal': patient.pulseAbnormal }">
            <span class="vital-label">脉搏</span>
            <span class="vital-value">
              {{ patient.latestVital?.pulse ?? '--' }}
            </span>
            <span class="vital-unit">次/分</span>
            <span v-if="patient.pulseAbnormal && patient.thresholdInfo" class="vital-alert-tip">
              {{ patient.latestVital?.pulse < patient.thresholdInfo.pulse_min ? '↓偏低' : '↑偏高' }}
            </span>
          </div>
          <div class="vital-cell" :class="{ 'cell-abnormal': patient.tempAbnormal }">
            <span class="vital-label">体温</span>
            <span class="vital-value">
              {{ patient.latestVital?.temperature ?? '--' }}
            </span>
            <span class="vital-unit">°C</span>
            <span v-if="patient.tempAbnormal && patient.thresholdInfo" class="vital-alert-tip">
              {{ patient.latestVital?.temperature < patient.thresholdInfo.temperature_min ? '↓偏低' : '↑偏高' }}
            </span>
          </div>
          <div class="vital-cell" :class="{ 'cell-abnormal': patient.bpAbnormal }">
            <span class="vital-label">血压</span>
            <span class="vital-value">
              {{ patient.latestVital?.blood_pressure ?? '--' }}
            </span>
            <span class="vital-unit">mmHg</span>
          </div>
          <div class="vital-cell" :class="{ 'cell-abnormal': patient.ecgAbnormal }">
            <span class="vital-label">心电图</span>
            <span class="vital-value">
              {{ patient.latestVital?.ecg ?? '--' }}
            </span>
          </div>
        </div>

        <div class="mini-chart">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none">
            <polyline
              v-if="patient.pulseTrend && patient.pulseTrend.length > 1"
              :points="getSparklinePoints(patient.pulseTrend)"
              fill="none"
              :stroke="patient.hasAlert ? '#ef4444' : '#3b82f6'"
              stroke-width="2"
              stroke-linecap="round"
            />
            <text v-else x="50" y="18" text-anchor="middle" font-size="8" fill="#9ca3af">暂无数据</text>
          </svg>
        </div>

        <!-- 异常原因汇总 -->
        <div v-if="patient.hasAlert && patient.thresholdInfo" class="alert-reason-box">
          <span v-if="patient.pulseAbnormal">脉搏{{ patient.latestVital?.pulse }}次/分（阈值{{ patient.thresholdInfo.pulse_min }}{{ patient.thresholdInfo.pulse_max ? '-'+patient.thresholdInfo.pulse_max : '' }}）</span>
          <span v-if="patient.tempAbnormal"> 体温{{ patient.latestVital?.temperature }}°C（阈值{{ patient.thresholdInfo.temperature_min }}{{ patient.thresholdInfo.temperature_max ? '-'+patient.thresholdInfo.temperature_max : '' }}）</span>
          <span v-if="patient.bpAbnormal"> 血压{{ patient.latestVital?.blood_pressure }}mmHg</span>
          <span v-if="patient.ecgAbnormal"> 心电图{{ patient.latestVital?.ecg }}</span>
        </div>

        <div class="card-footer">
          <span class="update-time">
            {{ formatTime(patient.latestVital?.collect_time) }}
          </span>
          <el-button type="primary" link size="small" @click="showDetail(patient)">
            查看趋势
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-if="patients.length === 0" description="暂无患者数据" />

    <!-- 患者详情弹窗 -->
    <el-dialog v-model="detailVisible" title="患者详情" width="800px" @opened="onDialogOpened">
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getDashboardOverview } from '@/api/dashboard'
import { getAlertStats } from '@/api/alert'
import { getTrendData } from '@/api/vital'
import { useUserStore } from '@/stores/user'
import WebSocketClient from '@/utils/websocket'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const Refresh = 'Refresh'

const userStore = useUserStore()
let ws = null
let refreshTimer = null

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

// 组装前端需要的字段（映射 dashboard API 返回的字段名到模板使用的字段名）
const mapDashboardCard = (card) => ({
  patient_id: card.patientId,
  name: card.name,
  bed_number: card.bedNumber,
  age: card.age,
  gender: card.gender,
  admission_date: card.admissionDate,
  attending_doctor_id: card.attendingDoctorId,
  latestVital: card.latestVital,
  pulseTrend: (card.trendData?.pulse || []).slice(-20),
  thresholdInfo: card.thresholdInfo,
  hasAlert: card.hasAlert,
  hasActiveAlertRecord: card.hasActiveAlertRecord,
  pulseAbnormal: card.abnormalIndicators?.pulseAbnormal || false,
  tempAbnormal: card.abnormalIndicators?.tempAbnormal || false,
  bpAbnormal: card.abnormalIndicators?.bpAbnormal || false,
  ecgAbnormal: card.abnormalIndicators?.ecgAbnormal || false
})

const loadPatients = async () => {
  try {
    const res = await getDashboardOverview()
    const cards = res.data.patients || []
    patients.value = cards.map(mapDashboardCard)
  } catch (error) {
    ElMessage.error('加载监护面板失败')
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

const showDetail = (patient) => {
  currentPatient.value = patient
  detailVisible.value = true
}

const onDialogOpened = async () => {
  await nextTick()
  if (currentPatient.value) {
    setTimeout(() => {
      loadTrendChart(currentPatient.value.patient_id)
    }, 200)
  }
}

const loadTrendChart = async (patientId) => {
  try {
    const res = await getTrendData(patientId, { hours: 24 })
    const { pulse, temperature, bloodPressure, timestamps } = res.data.trendData || {}

    if (!chartRef.value) return

    if (chart) {
      chart.dispose()
      chart = null
    }

    chart = echarts.init(chartRef.value)

    const timeLabels = (timestamps && timestamps.length) ? timestamps.map(t => {
      const d = new Date(t)
      return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0')
    }) : []

    const systolicData = []
    const diastolicData = []
    if (bloodPressure && bloodPressure.length) {
      bloodPressure.forEach(bp => {
        if (!bp) { systolicData.push(null); diastolicData.push(null); return }
        const parts = String(bp).split('/')
        systolicData.push(parts[0] ? parseInt(parts[0]) : null)
        diastolicData.push(parts[1] ? parseInt(parts[1]) : null)
      })
    }

    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['脉搏', '体温', '收缩压', '舒张压'], top: 0 },
      grid: [
        { left: '14%', right: '6%', top: '10%', height: '22%' },
        { left: '14%', right: '6%', top: '40%', height: '22%' },
        { left: '14%', right: '6%', top: '70%', height: '22%' }
      ],
      xAxis: [
        { type: 'category', data: timeLabels, gridIndex: 0, axisLabel: { show: false }, boundaryGap: false },
        { type: 'category', data: timeLabels, gridIndex: 1, axisLabel: { show: false }, boundaryGap: false },
        { type: 'category', data: timeLabels, gridIndex: 2, axisLabel: { fontSize: 10, interval: Math.max(0, Math.floor(timeLabels.length / 6) - 1) }, boundaryGap: false }
      ],
      yAxis: [
        { type: 'value', name: '脉搏', gridIndex: 0, min: 40, max: 130, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
        { type: 'value', name: '体温', gridIndex: 1, min: 35, max: 42, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
        { type: 'value', name: '血压', gridIndex: 2, min: 40, max: 180, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } }
      ],
      series: [
        { name: '脉搏', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: pulse || [], smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#3b82f6' }, itemStyle: { color: '#3b82f6' } },
        { name: '体温', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: temperature || [], smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#22c55e' }, itemStyle: { color: '#22c55e' } },
        { name: '收缩压', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: systolicData, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#f59e0b', type: 'dashed' }, itemStyle: { color: '#f59e0b' } },
        { name: '舒张压', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: diastolicData, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ef4444', type: 'dashed' }, itemStyle: { color: '#ef4444' } }
      ]
    })
  } catch (error) {
    console.error('加载趋势图失败:', error)
  }
}

const getSparklinePoints = (data) => {
  if (!data || data.length < 2) return ''
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 30 - ((v - min) / range) * 26 - 2
    return `${x},${y}`
  }).join(' ')
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
  refreshTimer = setInterval(loadPatients, 30000)

  if (userStore.isNurse || userStore.isDoctor) {
    ws = new WebSocketClient({
      token: userStore.token,
      onMessage: (data) => {
        if (data.type === 'VITAL_UPDATE') {
          const patient = patients.value.find(p => p.patient_id === data.patientId)
          if (patient && data.vital) {
            patient.latestVital = data.vital
          }
        }
        if (data.type === 'ALERT') {
          loadPatients()
          loadAlertStats()
        }
      }
    })
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  ws?.close()
})
</script>

<style scoped>
.monitor-container { padding: 0; max-width: 1400px; margin: 0 auto; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; font-size: 22px; font-weight: 700; color: #1e293b; }
.header-actions { display: flex; gap: 10px; align-items: center; }

/* 统计行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.stat-icon-primary { background: #eff6ff; color: #3b82f6; }
.stat-icon-danger { background: #fef2f2; color: #ef4444; }
.stat-icon-success { background: #f0fdf4; color: #22c55e; }
.stat-icon-warning { background: #fefce8; color: #f59e0b; }
.stat-value { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1.1; }
.text-danger { color: #ef4444; }
.text-success { color: #22c55e; }
.text-warning { color: #f59e0b; }
.stat-label { color: #64748b; font-size: 13px; margin-top: 2px; }

/* 卡片网格 */
.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 16px;
}

/* ========== 患者卡片 ========== */
.patient-card {
  position: relative;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  transition: box-shadow .2s, transform .15s;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.patient-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  transform: translateY(-1px);
}

/* 左侧状态竖条 */
.card-status-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  border-radius: 12px 0 0 12px;
}
.bar-success { background: #22c55e; }
.bar-danger { background: #ef4444; }

/* 异常卡片额外样式 */
.patient-card.card-alert {
  border-color: #fecaca;
  background: linear-gradient(135deg, #fff5f5 0%, #fff 30%);
}

/* 卡片内容区 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 18px 0 22px;
}
.patient-info { display: flex; flex-direction: column; }
.patient-name { font-size: 17px; font-weight: 700; color: #0f172a; }
.bed-number { font-size: 12px; color: #94a3b8; margin-top: 2px; }

/* 体征四宫格 */
.vital-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 14px 8px;
  margin: 8px 12px 0;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
}
.vital-cell {
  text-align: center;
  padding: 6px 2px;
  border-radius: 8px;
  position: relative;
  transition: background .15s;
}
.vital-cell.cell-abnormal {
  background: #fef2f2;
}
.vital-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.vital-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  display: block;
  line-height: 1.1;
}
.cell-abnormal .vital-value { color: #ef4444; }
.vital-unit {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 400;
  display: block;
  margin-top: 1px;
}
.vital-alert-tip {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #ef4444;
  margin-top: 1px;
}

/* 迷你趋势图 */
.mini-chart {
  height: 38px;
  margin: 10px 18px 0;
  border-radius: 6px;
  background: #f8fafc;
  overflow: hidden;
}
.mini-chart svg { width: 100%; height: 100%; display: block; }

/* 异常原因汇总 */
.alert-reason-box {
  margin: 8px 18px 0;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  font-size: 11px;
  color: #dc2626;
  line-height: 1.6;
  border-left: 3px solid #ef4444;
}

/* 底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px 14px 22px;
}
.update-time {
  font-size: 11px;
  color: #94a3b8;
}

/* 弹窗图表 */
.chart-container { width: 100%; height: 420px; }
</style>
