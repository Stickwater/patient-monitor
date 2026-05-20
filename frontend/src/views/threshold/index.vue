<template>
  <div class="threshold-container">
    <div class="page-header">
      <h2>阈值设置</h2>
    </div>

    <!-- 患者选择 -->
    <div class="filter-card">
      <el-form :inline="true">
        <el-form-item label="选择患者">
          <el-select v-model="selectedPatientId" placeholder="请选择患者" style="width: 300px" @change="loadThreshold">
            <el-option 
              v-for="p in patients" 
              :key="p.patient_id" 
              :label="`${p.name} - ${p.bed_number}`" 
              :value="p.patient_id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="selectedPatientId" class="threshold-form">
      <div class="form-card">
        <div class="card-header">
          <span>阈值配置</span>
          <el-tag v-if="validationResult && !validationResult.isValid" type="danger">
            存在不合理的阈值设置
          </el-tag>
        </div>

        <el-form ref="formRef" :model="form" label-width="120px">
          <el-divider content-position="left">脉搏（次/分钟）</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最小值" required>
                <el-input-number v-model="form.pulseMin" :min="0" :max="200" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大值" required>
                <el-input-number v-model="form.pulseMax" :min="0" :max="200" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="validation-tip" :class="{ error: form.pulseMin >= form.pulseMax }">
            <el-icon v-if="form.pulseMin >= form.pulseMax"><CircleClose /></el-icon>
            <span>{{ getValidationText('pulse') }}</span>
          </div>

          <el-divider content-position="left">体温（°C）</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最小值" required>
                <el-input-number v-model="form.temperatureMin" :precision="1" :step="0.1" :min="30" :max="42" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大值" required>
                <el-input-number v-model="form.temperatureMax" :precision="1" :step="0.1" :min="30" :max="42" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="validation-tip" :class="{ error: form.temperatureMin >= form.temperatureMax }">
            <el-icon v-if="form.temperatureMin >= form.temperatureMax"><CircleClose /></el-icon>
            <span>{{ getValidationText('temperature') }}</span>
          </div>

          <el-divider content-position="left">收缩压（mmHg）</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最小值" required>
                <el-input-number v-model="form.bpSystolicMin" :min="50" :max="250" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大值" required>
                <el-input-number v-model="form.bpSystolicMax" :min="50" :max="250" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="validation-tip" :class="{ error: form.bpSystolicMin >= form.bpSystolicMax }">
            <el-icon v-if="form.bpSystolicMin >= form.bpSystolicMax"><CircleClose /></el-icon>
            <span>{{ getValidationText('bpSystolic') }}</span>
          </div>

          <el-divider content-position="left">舒张压（mmHg）</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最小值" required>
                <el-input-number v-model="form.bpDiastolicMin" :min="30" :max="150" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大值" required>
                <el-input-number v-model="form.bpDiastolicMax" :min="30" :max="150" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="validation-tip" :class="{ error: form.bpDiastolicMin >= form.bpDiastolicMax }">
            <el-icon v-if="form.bpDiastolicMin >= form.bpDiastolicMax"><CircleClose /></el-icon>
            <span>{{ getValidationText('bpDiastolic') }}</span>
          </div>

          <el-divider content-position="left">心电图规则</el-divider>
          <el-form-item label="异常判定规则">
            <el-checkbox-group v-model="form.ecgRules">
              <el-checkbox label="心律不齐">心律不齐</el-checkbox>
              <el-checkbox label="ST段异常">ST段异常</el-checkbox>
              <el-checkbox label="T波倒置">T波倒置</el-checkbox>
              <el-checkbox label="Q波异常">Q波异常</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="submitForm">保存配置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 医学标准参考 -->
      <div class="reference-card">
        <div class="card-header">
          <span>医学标准参考</span>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="脉搏（成人）">60-100 次/分钟</el-descriptions-item>
          <el-descriptions-item label="体温（成人）">36.0-37.3 °C</el-descriptions-item>
          <el-descriptions-item label="收缩压（成人）">90-140 mmHg</el-descriptions-item>
          <el-descriptions-item label="舒张压（成人）">60-90 mmHg</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <el-empty v-else description="请选择患者进行阈值配置" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getPatients } from '@/api/patient'
import { getThreshold, setThreshold } from '@/api/threshold'
import { ElMessage } from 'element-plus'

const CircleClose = 'CircleClose'

const patients = ref([])
const selectedPatientId = ref('')
const saving = ref(false)
const formRef = ref()

const form = reactive({
  pulseMin: 60,
  pulseMax: 100,
  temperatureMin: 36.0,
  temperatureMax: 37.3,
  bpSystolicMin: 90,
  bpSystolicMax: 140,
  bpDiastolicMin: 60,
  bpDiastolicMax: 90,
  ecgRules: []
})

const validationResult = computed(() => {
  const errors = []
  if (form.pulseMin >= form.pulseMax) errors.push('pulse')
  if (form.temperatureMin >= form.temperatureMax) errors.push('temperature')
  if (form.bpSystolicMin >= form.bpSystolicMax) errors.push('bpSystolic')
  if (form.bpDiastolicMin >= form.bpDiastolicMax) errors.push('bpDiastolic')
  return { isValid: errors.length === 0, errors }
})

const getValidationText = (field) => {
  const texts = {
    pulse: form.pulseMin < form.pulseMax ? '✓ 脉搏范围设置正确' : '✗ 上限必须大于下限',
    temperature: form.temperatureMin < form.temperatureMax ? '✓ 体温范围设置正确' : '✗ 上限必须大于下限',
    bpSystolic: form.bpSystolicMin < form.bpSystolicMax ? '✓ 收缩压范围设置正确' : '✗ 上限必须大于下限',
    bpDiastolic: form.bpDiastolicMin < form.bpDiastolicMax ? '✓ 舒张压范围设置正确' : '✗ 上限必须大于下限'
  }
  return texts[field]
}

const loadPatients = async () => {
  try {
    const res = await getPatients({ status: 'admitted', size: 100 })
    patients.value = res.data.list || []
  } catch (error) {
    ElMessage.error('加载患者列表失败')
  }
}

const loadThreshold = async () => {
  if (!selectedPatientId.value) return
  
  try {
    const res = await getThreshold(selectedPatientId.value)
    const data = res.data
    
    if (data) {
      Object.assign(form, {
        pulseMin: data.pulse_min,
        pulseMax: data.pulse_max,
        temperatureMin: parseFloat(data.temperature_min),
        temperatureMax: parseFloat(data.temperature_max),
        bpSystolicMin: data.bp_systolic_min,
        bpSystolicMax: data.bp_systolic_max,
        bpDiastolicMin: data.bp_diastolic_min,
        bpDiastolicMax: data.bp_diastolic_max,
        ecgRules: data.ecg_rules || []
      })
    }
  } catch (error) {
    form.pulseMin = 60
    form.pulseMax = 100
    form.temperatureMin = 36.0
    form.temperatureMax = 37.3
    form.bpSystolicMin = 90
    form.bpSystolicMax = 140
    form.bpDiastolicMin = 60
    form.bpDiastolicMax = 90
    form.ecgRules = []
  }
}

const submitForm = async () => {
  if (!validationResult.value.isValid) {
    ElMessage.warning('请修正不合理的阈值设置')
    return
  }

  try {
    saving.value = true
    await setThreshold(selectedPatientId.value, {
      pulseMin: form.pulseMin,
      pulseMax: form.pulseMax,
      temperatureMin: form.temperatureMin,
      temperatureMax: form.temperatureMax,
      bpSystolicMin: form.bpSystolicMin,
      bpSystolicMax: form.bpSystolicMax,
      bpDiastolicMin: form.bpDiastolicMin,
      bpDiastolicMax: form.bpDiastolicMax,
      ecgRules: form.ecgRules,
      effectiveTime: new Date().toISOString()
    })
    ElMessage.success('阈值配置成功')
  } catch (error) {
    ElMessage.error('配置失败: ' + (error.message || '请检查阈值设置'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPatients()
})
</script>

<style scoped>
.threshold-container { padding: 0; }

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

.threshold-form {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-5);
}

.form-card,
.reference-card {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.reference-card {
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.validation-tip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: calc(var(--space-2) * -1) 0 var(--space-5) 120px;
  font-size: var(--text-sm);
  color: var(--color-success);
}

.validation-tip.error {
  color: var(--color-error);
}
</style>
