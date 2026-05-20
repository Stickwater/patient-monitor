<template>
  <div class="my-reports-container">
    <div class="page-header">
      <h2>我的病情报告</h2>
      <el-button :icon="Refresh" @click="loadReports">刷新</el-button>
    </div>

    <el-table :data="reports" stripe v-loading="loading">
      <el-table-column prop="title" label="报告标题" min-width="200" />
      <el-table-column prop="create_time" label="生成时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.create_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="version" label="版本" width="80" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="viewReport(row)">
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top: var(--space-6)"
      @size-change="loadReports"
      @current-change="loadReports"
    />

    <!-- 报告详情弹窗 -->
    <el-dialog v-model="detailVisible" title="报告详情" width="700px">
      <div v-if="currentReport" class="report-detail">
        <div class="report-header">
          <h3>{{ currentReport.title }}</h3>
          <div class="report-meta">
            <span>版本: {{ currentReport.version }}</span>
            <span>生成时间: {{ formatDateTime(currentReport.create_time) }}</span>
          </div>
        </div>
        
        <div class="report-content">
          <p v-html="currentReport.content"></p>
        </div>

        <div class="report-note">
          <el-icon><InfoFilled /></el-icon>
          <span>以上报告数据已脱敏处理，仅供您参考。如有疑问，请咨询您的主治医生。</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyReports, getReportDetail } from '@/api/report'
import { ElMessage } from 'element-plus'

const Refresh = 'Refresh'
const InfoFilled = 'InfoFilled'

const loading = ref(false)
const reports = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const detailVisible = ref(false)
const currentReport = ref(null)

const loadReports = async () => {
  loading.value = true
  try {
    const res = await getMyReports({ page: page.value, size: size.value })
    reports.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('加载报告失败')
  } finally {
    loading.value = false
  }
}

const viewReport = async (report) => {
  try {
    const res = await getReportDetail(report.report_id)
    currentReport.value = res.data
    detailVisible.value = true
  } catch (error) {
    ElMessage.error('加载报告详情失败')
  }
}

const formatDateTime = (time) => {
  if (!time) return '--'
  return new Date(time).toLocaleString()
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.my-reports-container {
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

.report-detail {
  padding: var(--space-2) 0;
}

.report-header {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.report-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2) 0;
}

.report-meta {
  display: flex;
  gap: var(--space-6);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.report-content {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.8;
  margin-bottom: var(--space-6);
}

.report-content p {
  margin-bottom: var(--space-3);
}

.report-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.report-note .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
