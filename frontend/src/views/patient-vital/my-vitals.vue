<template>
  <div class="my-vitals-container">
    <div class="page-header">
      <h2>我的体征数据</h2>
      <div class="header-actions">
        <el-select v-model="timeRange" style="width: 140px" @change="loadVitals">
          <el-option label="近24小时" value="24h" />
          <el-option label="近7天" value="7d" />
          <el-option label="近30天" value="30d" />
        </el-select>
        <el-button :icon="Refresh" @click="loadVitals">刷新</el-button>
      </div>
    </div>

    <!-- 最新体征卡片 -->
    <div class="latest-card" v-if="latestVital">
      <div class="card-header">
        <h3>最新数据</h3>
        <span class="update-time">{{ formatTime(latestVital.collect_time) }}</span>
      </div>
      <div class="vitals-grid">
        <div class="vital-item">
          <span class="vital-label">脉搏</span>
          <span class="vital-value" :class="{ abnormal: isAbnormal('pulse', latestVital.pulse) }">
            {{ latestVital.pulse }}
          </span>
          <span class="unit">次/分</span>
        </div>
        <div class="vital-item">
          <span class="vital-label">体温</span>
          <span class="vital-value" :class="{ abnormal: isAbnormal('temperature', latestVital.temperature) }">
            {{ latestVital.temperature }}
          </span>
          <span class="unit">°C</span>
        </div>
        <div class="vital-item">
          <span class="vital-label">血压</span>
          <span class="vital-value" :class="{ abnormal: isAbnormal('bp', latestVital.blood_pressure) }">
            {{ latestVital.blood_pressure }}
          </span>
          <span class="unit">mmHg</span>
        </div>
      </div>
    </div>

    <!-- 趋势图 -->
    <div class="chart-card" v-if="vitals.length > 0">
      <h3>体征趋势</h3>
      <div ref="chartRef" class="chart-container"></div>
    </div>

    <el-empty v-if="!latestVital && !loading" description="暂无体征数据" />

    <!-- 历史记录 -->
    <div class="history-card" v-if="vitals.length > 0">
      <h3>历史记录</h3>
      <el-table :data="vitals" stripe>
        <el-table-column prop="collect_time" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.collect_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="pulse" label="脉搏" width="100">
          <template #default="{ row }">
            <span :class="{ abnormal: isAbnormal('pulse', row.pulse) }">
              {{ row.pulse }} 次/分
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="temperature" label="体温" width="100">
          <template #default="{ row }">
            <span :class="{ abnormal: isAbnormal('temperature', row.temperature) }">
              {{ row.temperature }} °C
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="blood_pressure" label="血压" width="120">
          <template #default="{ row }">
            <span :class="{ abnormal: isAbnormal('bp', row.blood_pressure) }">
              {{ row.blood_pressure }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { getMyVitals } from '@/api/vital'
import { getMyThreshold } from '@/api/threshold'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const Refresh = 'Refresh'

const loading = ref(false)
const timeRange = ref('24h')
const vitals = ref([])
const latestVital = ref(null)
const threshold = ref(null)
const chartRef = ref(null)
let chart = null

const isAbnormal = (type, value) => {
  if (!threshold.value || !value) return false
  
  if (type === 'pulse') {
    return value < threshold.value.pulse_min || value > threshold.value.pulse_max
  }
  if (type === 'temperature') {
    return value < threshold.value.temperature_min || value > threshold.value.temperature_max
  }
  return false
}

const loadVitals = async () => {
  loading.value = true
  try {
    const hours = timeRange.value === '24h' ? 24 : timeRange.value === '7d' ? 168 : 720
    const res = await getMyVitals({ hours })
    vitals.value = res.data.list || []
    
    if (vitals.value.length > 0) {
      latestVital.value = vitals.value[0]
      await nextTick()
      renderChart()
    }
  } catch (error) {
    ElMessage.error('加载体征数据失败')
  } finally {
    loading.value = false
  }
}

const loadThreshold = async () => {
  try {
    const res = await getMyThreshold()
    threshold.value = res.data
  } catch (error) {
    console.error('获取阈值失败:', error)
  }
}

const renderChart = () => {
  if (!chartRef.value || vitals.value.length === 0) return
  
  if (chart) {
    chart.dispose()
  }
  
  chart = echarts.init(chartRef.value)
  
  const data = [...vitals.value].reverse()
  const timestamps = data.map(v => new Date(v.collect_time).toLocaleTimeString())
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['脉搏', '体温'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: timestamps,
      boundaryGap: false
    },
    yAxis: [
      { type: 'value', name: '脉搏', position: 'left' },
      { type: 'value', name: '体温', position: 'right', min: 35, max: 40 }
    ],
    series: [
      { 
        name: '脉搏', 
        type: 'line', 
        data: data.map(v => v.pulse),
        smooth: true
      },
      { 
        name: '体温', 
        type: 'line', 
        yAxisIndex: 1, 
        data: data.map(v => v.temperature),
        smooth: true
      }
    ]
  })
}

const formatTime = (time) => {
  if (!time) return '--'
  return new Date(time).toLocaleString()
}

const formatDateTime = (time) => {
  if (!time) return '--'
  return new Date(time).toLocaleString()
}

onMounted(() => {
  loadVitals()
  loadThreshold()
})
</script>

<style scoped>
.my-vitals-container {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
}

.latest-card,
.chart-card,
.history-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.latest-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.latest-card h3,
.chart-card h3,
.history-card h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.update-time {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

.vital-item {
  text-align: center;
}

.vital-label {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.vital-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
}

.vital-value.abnormal {
  color: var(--color-error);
}

.unit {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-left: var(--space-1);
}

.chart-container {
  width: 100%;
  height: 300px;
  margin-top: var(--space-4);
}
</style>
