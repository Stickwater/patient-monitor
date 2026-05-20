<template>
  <div class="vital-input-container">
    <div class="page-header">
      <h2>体征数据录入</h2>
    </div>

    <div class="vital-form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="脉搏">
          <el-input-number 
            v-model="form.pulse" 
            :min="0" 
            :max="300" 
            placeholder="次/分钟"
            style="width: 200px"
          />
          <span class="unit">次/分钟</span>
        </el-form-item>

        <el-form-item label="体温">
          <el-input-number 
            v-model="form.temperature" 
            :precision="1"
            :step="0.1"
            :min="30" 
            :max="45" 
            placeholder="摄氏度"
            style="width: 200px"
          />
          <span class="unit">°C</span>
        </el-form-item>

        <el-form-item label="血压">
          <div class="bp-input">
            <el-input-number 
              v-model="form.systolic" 
              :min="0" 
              :max="300" 
              placeholder="收缩压"
            />
            <span class="bp-separator">/</span>
            <el-input-number 
              v-model="form.diastolic" 
              :min="0" 
              :max="200" 
              placeholder="舒张压"
            />
            <span class="unit">mmHg</span>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            提交体征数据
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="threshold-info" v-if="threshold">
      <h4>您的安全阈值范围</h4>
      <div class="threshold-grid">
        <div class="threshold-item">
          <span class="label">脉搏</span>
          <span class="value">{{ threshold.pulse_min }} - {{ threshold.pulse_max }} 次/分</span>
        </div>
        <div class="threshold-item">
          <span class="label">体温</span>
          <span class="value">{{ threshold.temperature_min }} - {{ threshold.temperature_max }} °C</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { uploadVital } from '@/api/vital'
import { getMyThreshold } from '@/api/threshold'
import { ElMessage } from 'element-plus'

const formRef = ref()
const submitting = ref(false)
const threshold = ref(null)

const form = reactive({
  pulse: null,
  temperature: null,
  systolic: null,
  diastolic: null
})

const rules = {
  pulse: [{ required: true, message: '请输入脉搏', trigger: 'blur' }],
  temperature: [{ required: true, message: '请输入体温', trigger: 'blur' }],
  systolic: [{ required: true, message: '请输入收缩压', trigger: 'blur' }],
  diastolic: [{ required: true, message: '请输入舒张压', trigger: 'blur' }]
}

const submitForm = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true
    
    const data = {
      pulse: form.pulse,
      temperature: form.temperature,
      bloodPressure: `${form.systolic}/${form.diastolic}`
    }
    
    await uploadVital(data)
    ElMessage.success('体征数据提交成功')
    
    // 重置表单
    form.pulse = null
    form.temperature = null
    form.systolic = null
    form.diastolic = null
  } catch (error) {
    if (error !== false) {
      ElMessage.error('提交失败，请重试')
    }
  } finally {
    submitting.value = false
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

onMounted(() => {
  loadThreshold()
})
</script>

<style scoped>
.vital-input-container {
  max-width: 600px;
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.vital-form-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-8);
}

.unit {
  margin-left: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.bp-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bp-separator {
  font-size: var(--text-lg);
  color: var(--text-secondary);
}

.threshold-info {
  margin-top: var(--space-6);
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-6);
}

.threshold-info h4 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-4) 0;
}

.threshold-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.threshold-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.threshold-item .label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.threshold-item .value {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
}
</style>
