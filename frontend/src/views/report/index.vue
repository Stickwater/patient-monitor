<template>
  <div class="report-container">
    <div class="page-header">
      <h2>病情报告</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showGenerateDialog">生成报告</el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="患者">
          <el-select v-model="filterForm.patientId" placeholder="请选择" clearable style="width: 200px">
            <el-option 
              v-for="p in patients" 
              :key="p.patient_id" 
              :label="`${p.name} - ${p.bed_number}`" 
              :value="p.patient_id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadReports">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 报告列表 -->
    <div class="table-card">
      <el-table :data="reports" stripe>
        <el-table-column prop="report_id" label="报告ID" width="150" />
        <el-table-column prop="patient.name" label="患者姓名" width="120" />
        <el-table-column prop="bed_number" label="床位号" width="120">
          <template #default="{ row }">
            {{ row.patient?.bed_number }}
          </template>
        </el-table-column>
        <el-table-column prop="title" label="报告标题" min-width="200" />
        <el-table-column prop="start_time" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column prop="create_time" label="生成时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewReport(row)">查看</el-button>
            <el-button type="primary" link size="small" @click="printReport(row)">打印</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: var(--space-5)"
        @size-change="loadReports"
        @current-change="loadReports"
      />
    </div>

    <!-- 生成报告弹窗 -->
    <el-dialog v-model="generateVisible" title="生成病情报告" width="500px">
      <el-form ref="generateFormRef" :model="generateForm" :rules="generateRules" label-width="100px">
        <el-form-item label="患者" prop="patientId">
          <el-select v-model="generateForm.patientId" placeholder="请选择患者" style="width: 100%">
            <el-option 
              v-for="p in patients" 
              :key="p.patient_id" 
              :label="`${p.name} - ${p.bed_number}`" 
              :value="p.patient_id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围" prop="dateRange">
          <el-date-picker
            v-model="generateForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="报告标题" prop="title">
          <el-input v-model="generateForm.title" placeholder="请输入报告标题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="submitGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 报告详情弹窗 -->
    <el-dialog v-model="detailVisible" title="报告详情" width="900px">
      <div v-if="currentReport" class="report-detail">
        <el-descriptions :column="2" border style="margin-bottom: var(--space-5)">
          <el-descriptions-item label="报告标题" :span="2">{{ currentReport.title }}</el-descriptions-item>
          <el-descriptions-item label="患者姓名">{{ currentReport.patientName }}</el-descriptions-item>
          <el-descriptions-item label="床位号">{{ currentReport.bedNumber }}</el-descriptions-item>
          <el-descriptions-item label="报告时间">
            {{ formatDateTime(currentReport.startTime) }} 至 {{ formatDateTime(currentReport.endTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">{{ currentReport.version }}</el-descriptions-item>
        </el-descriptions>

        <h4>体征趋势图</h4>
        <div ref="chartRef" class="chart-container"></div>

        <h4 style="margin-top: var(--space-5)">异常事件</h4>
        <el-table v-if="currentReport.abnormalEvents?.length" :data="currentReport.abnormalEvents" stripe>
          <el-table-column prop="time" label="时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.time) }}
            </template>
          </el-table-column>
          <el-table-column prop="indicator" label="指标" width="120" />
          <el-table-column prop="level" label="等级" width="100">
            <template #default="{ row }">
              <el-tag :type="row.level === '危急' ? 'danger' : row.level === '严重' ? 'warning' : 'info'" size="small">
                {{ row.level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="actualValue" label="实际值" width="120" />
          <el-table-column prop="thresholdValue" label="阈值" width="120" />
          <el-table-column prop="status" label="状态" />
        </el-table>
        <el-empty v-else description="无异常事件" />

        <h4 style="margin-top: var(--space-5)">报告内容</h4>
        <pre class="report-content">{{ currentReport.content }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { getReports, generateReport, getReportById } from '@/api/report'
import { getPatients } from '@/api/patient'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const patients = ref([])
const reports = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)

const filterForm = reactive({
  patientId: '',
  dateRange: []
})

const generateVisible = ref(false)
const generating = ref(false)
const generateFormRef = ref()
const generateForm = reactive({
  patientId: '',
  dateRange: [],
  title: ''
})

const generateRules = {
  patientId: [{ required: true, message: '请选择患者', trigger: 'change' }],
  dateRange: [{ required: true, message: '请选择时间范围', trigger: 'change' }]
}

const detailVisible = ref(false)
const currentReport = ref(null)
const chartRef = ref(null)
let chart = null

const loadPatients = async () => {
  try {
    const res = await getPatients({ status: 'admitted', size: 100 })
    patients.value = res.data.list || []
  } catch (error) {
    console.error('加载患者列表失败:', error)
  }
}

const loadReports = async () => {
  try {
    const res = await getReports({
      page: page.value,
      size: size.value,
      patientId: filterForm.patientId || undefined,
      startTime: filterForm.dateRange?.[0] || undefined,
      endTime: filterForm.dateRange?.[1] || undefined
    })
    reports.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('加载报告列表失败')
  }
}

const resetFilter = () => {
  filterForm.patientId = ''
  filterForm.dateRange = []
  loadReports()
}

const showGenerateDialog = () => {
  generateForm.patientId = ''
  generateForm.dateRange = []
  generateForm.title = ''
  generateVisible.value = true
}

const submitGenerate = async () => {
  try {
    await generateFormRef.value.validate()
    generating.value = true
    
    await generateReport({
      patientId: generateForm.patientId,
      startTime: generateForm.dateRange[0],
      endTime: generateForm.dateRange[1],
      title: generateForm.title
    })
    
    ElMessage.success('报告生成成功')
    generateVisible.value = false
    loadReports()
  } catch (error) {
    ElMessage.error('生成失败')
  } finally {
    generating.value = false
  }
}

const viewReport = async (row) => {
  try {
    const res = await getReportById(row.report_id)
    currentReport.value = res.data
    detailVisible.value = true
    
    await nextTick()
    renderChart(res.data.trendData)
  } catch (error) {
    ElMessage.error('加载报告详情失败')
  }
}

const renderChart = (trendData) => {
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['脉搏', '体温'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: trendData?.timestamps?.map(t => new Date(t).toLocaleTimeString()) || [] 
    },
    yAxis: [
      { type: 'value', name: '脉搏' },
      { type: 'value', name: '体温', min: 35, max: 40 }
    ],
    series: [
      { name: '脉搏', type: 'line', data: trendData?.pulse || [] },
      { name: '体温', type: 'line', yAxisIndex: 1, data: trendData?.temperature || [] }
    ]
  })
}

const printReport = (row) => {
  ElMessage.info('打印功能开发中')
}

const formatDateTime = (datetime) => {
  if (!datetime) return '--'
  return new Date(datetime).toLocaleString()
}

onMounted(() => {
  loadPatients()
  loadReports()
})
</script>

<style scoped>
.report-container { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.page-header h2 { margin: 0; font-size: var(--text-xl); font-weight: 600; }

.filter-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.table-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.chart-container { width: 100%; height: 300px; }

.report-content {
  background: var(--bg-light);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  font-size: var(--text-sm);
  line-height: 1.8;
}

.report-detail h4 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-3) 0;
}
</style>
