<template>
  <div class="health-advice-container">
    <div class="page-header">
      <h2>健康建议</h2>
      <div class="header-actions">
        <el-select v-model="filterType" placeholder="筛选类型" clearable style="width: 140px" @change="loadAdvices">
          <el-option label="全部" value="" />
          <el-option label="治疗" value="treatment" />
          <el-option label="饮食" value="diet" />
          <el-option label="康复" value="rehabilitation" />
          <el-option label="健康" value="health" />
        </el-select>
        <el-button :icon="Refresh" @click="loadAdvices">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading" class="advice-list">
      <div v-if="advices.length === 0" class="empty-state">
        <el-empty description="暂无健康建议" />
      </div>

      <div v-for="advice in advices" :key="advice.advice_id" class="advice-card">
        <div class="advice-header">
          <div class="advice-title-row">
            <el-tag :type="typeTag(advice.type)" size="small">{{ typeName(advice.type) }}</el-tag>
            <h3>{{ advice.title }}</h3>
          </div>
          <div class="advice-meta">
            <span>录入医生：{{ advice.doctor?.real_name }}</span>
            <span>{{ formatDateTime(advice.create_time) }}</span>
          </div>
        </div>
        <div class="advice-content">
          {{ advice.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyAdvices } from '@/api/advice'
import { ElMessage } from 'element-plus'

const Refresh = 'Refresh'

const loading = ref(false)
const advices = ref([])
const filterType = ref('')

const loadAdvices = async () => {
  loading.value = true
  try {
    const res = await getMyAdvices(filterType.value || undefined)
    advices.value = res.data || []
  } catch (error) {
    ElMessage.error('加载健康建议失败')
  } finally {
    loading.value = false
  }
}

const typeTag = (type) => {
  const map = { treatment: 'danger', diet: 'success', rehabilitation: 'warning', health: 'info' }
  return map[type] || 'info'
}

const typeName = (type) => {
  const map = { treatment: '治疗方案', diet: '饮食指导', rehabilitation: '康复事项', health: '健康建议' }
  return map[type] || type
}

const formatDateTime = (date) => {
  if (!date) return '--'
  return new Date(date).toLocaleString()
}

onMounted(() => {
  loadAdvices()
})
</script>

<style scoped>
.health-advice-container {
  max-width: 900px;
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

.advice-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.advice-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-6);
}

.advice-header {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.advice-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.advice-title-row h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.advice-meta {
  display: flex;
  gap: var(--space-6);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.advice-content {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
