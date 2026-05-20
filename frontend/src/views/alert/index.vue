<template>
  <div class="alert-container">
    <div class="page-header">
      <h2>报警管理</h2>
      <div class="header-actions">
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="待处理" value="待处理" />
          <el-option label="已确认" value="已确认" />
          <el-option label="已解除" value="已解除" />
          <el-option label="已升级" value="已升级" />
        </el-select>
        <el-button :icon="Refresh" @click="loadAlerts">刷新</el-button>
      </div>
    </div>

    <!-- 报警统计卡片 -->
    <div class="stats-row">
      <div v-for="stat in statsList" :key="stat.status" class="stat-card">
        <span class="stat-value">{{ stat.count }}</span>
        <span class="stat-label">{{ stat.status }}</span>
      </div>
    </div>

    <!-- 报警列表 -->
    <div class="table-card">
      <el-table :data="alerts" stripe>
        <el-table-column prop="patientName" label="患者姓名" width="120" />
        <el-table-column prop="bedNumber" label="床位号" width="120" />
        <el-table-column prop="alertLevel" label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.alertLevel)" size="small">
              {{ row.alertLevel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alertContent" label="报警内容" min-width="300" />
        <el-table-column prop="timestamp" label="报警时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === '待处理'" 
              type="primary" 
              size="small"
              @click="handleConfirm(row)"
            >
              确认
            </el-button>
            <el-button 
              v-if="row.status === '已确认'" 
              type="success" 
              size="small"
              @click="handleResolve(row)"
            >
              解除
            </el-button>
            <el-button 
              type="info" 
              size="small"
              @click="showDetail(row)"
            >
              详情
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
        style="margin-top: var(--space-5)"
        @size-change="loadAlerts"
        @current-change="loadAlerts"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="报警详情" width="600px">
      <el-descriptions v-if="currentAlert" :column="1" border>
        <el-descriptions-item label="患者姓名">{{ currentAlert.patientName }}</el-descriptions-item>
        <el-descriptions-item label="床位号">{{ currentAlert.bedNumber }}</el-descriptions-item>
        <el-descriptions-item label="报警等级">
          <el-tag :type="getLevelType(currentAlert.alertLevel)">{{ currentAlert.alertLevel }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="报警内容">{{ currentAlert.alertContent }}</el-descriptions-item>
        <el-descriptions-item label="实际值">{{ currentAlert.actualValue }}</el-descriptions-item>
        <el-descriptions-item label="阈值范围">{{ currentAlert.thresholdValue }}</el-descriptions-item>
        <el-descriptions-item label="报警时间">{{ formatDateTime(currentAlert.timestamp) }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">
          <el-tag :type="getStatusType(currentAlert.status)">{{ currentAlert.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentAlert.handledBy" label="处理人">
          {{ currentAlert.handledBy }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentAlert.handledTime" label="处理时间">
          {{ formatDateTime(currentAlert.handledTime) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 确认弹窗 -->
    <el-dialog v-model="confirmVisible" title="确认报警" width="400px">
      <el-form :model="confirmForm" label-width="80px">
        <el-form-item label="处理动作">
          <el-input v-model="confirmForm.action" placeholder="请输入处理动作" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="primary" @click="submitConfirm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 解除弹窗 -->
    <el-dialog v-model="resolveVisible" title="解除报警" width="400px">
      <el-form :model="resolveForm" label-width="80px">
        <el-form-item label="处理结果">
          <el-input v-model="resolveForm.resolution" type="textarea" rows="3" placeholder="请输入处理结果" />
        </el-form-item>
        <el-form-item label="体征恢复">
          <el-switch v-model="resolveForm.vitalRestored" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="success" @click="submitResolve">解除报警</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAlerts, getAlertStats, confirmAlert, resolveAlert } from '@/api/alert'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const Refresh = 'Refresh'

const userStore = useUserStore()

const alerts = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const filterStatus = ref('')
const alertStats = ref({})

const detailVisible = ref(false)
const currentAlert = ref(null)

const confirmVisible = ref(false)
const confirmForm = ref({ action: '' })
const currentAlertId = ref(null)

const resolveVisible = ref(false)
const resolveForm = ref({ resolution: '', vitalRestored: true })

const statsList = computed(() => {
  const stats = alertStats.value.byStatus || []
  return [
    { status: '待处理', count: stats.find(s => s.status === '待处理')?.count || 0 },
    { status: '已确认', count: stats.find(s => s.status === '已确认')?.count || 0 },
    { status: '已解除', count: stats.find(s => s.status === '已解除')?.count || 0 },
    { status: '已升级', count: stats.find(s => s.status === '已升级')?.count || 0 }
  ]
})

const loadAlerts = async () => {
  try {
    const res = await getAlerts({
      page: page.value,
      size: size.value,
      status: filterStatus.value || undefined
    })
    alerts.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('加载报警列表失败')
  }
}

const loadStats = async () => {
  try {
    const res = await getAlertStats()
    alertStats.value = res.data
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const showDetail = (row) => {
  currentAlert.value = row
  detailVisible.value = true
}

const handleConfirm = (row) => {
  currentAlertId.value = row.alertId
  confirmForm.value.action = ''
  confirmVisible.value = true
}

const submitConfirm = async () => {
  try {
    await confirmAlert(currentAlertId.value, {
      nurseId: userStore.userInfo?.userId,
      action: confirmForm.value.action || '已确认'
    })
    ElMessage.success('确认成功')
    confirmVisible.value = false
    loadAlerts()
    loadStats()
  } catch (error) {
    ElMessage.error('确认失败')
  }
}

const handleResolve = (row) => {
  currentAlertId.value = row.alertId
  resolveForm.value = { resolution: '', vitalRestored: true }
  resolveVisible.value = true
}

const submitResolve = async () => {
  try {
    await resolveAlert(currentAlertId.value, {
      nurseId: userStore.userInfo?.userId,
      resolution: resolveForm.value.resolution,
      vitalRestored: resolveForm.value.vitalRestored
    })
    ElMessage.success('报警已解除')
    resolveVisible.value = false
    loadAlerts()
    loadStats()
  } catch (error) {
    ElMessage.error('解除失败')
  }
}

const getLevelType = (level) => {
  const types = { '一般': 'warning', '严重': 'danger', '危急': 'danger' }
  return types[level] || 'info'
}

const getStatusType = (status) => {
  const types = { '待处理': 'danger', '已确认': 'primary', '已解除': 'success', '已升级': 'warning' }
  return types[status] || 'info'
}

const formatDateTime = (datetime) => {
  if (!datetime) return '--'
  return new Date(datetime).toLocaleString()
}

onMounted(() => {
  loadAlerts()
  loadStats()
})
</script>

<style scoped>
.alert-container { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.page-header h2 { margin: 0; font-size: var(--text-xl); font-weight: 600; }

.header-actions { display: flex; gap: var(--space-3); }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.stat-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.table-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
</style>
