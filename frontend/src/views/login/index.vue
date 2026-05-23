<template>
  <div class="login-page">
    <div class="login-wrapper">
      <!-- 左侧品牌区 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="logo-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h1>患者监护系统</h1>
          <p>Patient Monitoring System</p>
          <div class="features">
            <div class="feature">
              <span class="feature-icon">✓</span>
              <span>实时体征监测</span>
            </div>
            <div class="feature">
              <span class="feature-icon">✓</span>
              <span>智能异常预警</span>
            </div>
            <div class="feature">
              <span class="feature-icon">✓</span>
              <span>多角色协同管理</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧登录区 -->
      <div class="login-section">
        <div class="login-card">
          <div class="login-header">
            <h2>欢迎登录</h2>
            <p>请使用您的账号密码登录系统</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                placeholder="用户名"
                size="large"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="密码"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="form.rememberMe">7天内免登录</el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" :loading="loading" class="login-btn" @click="handleLogin">
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <div class="quick-login">
            <div class="quick-label">快速体验</div>
            <div class="quick-btns">
              <el-button size="large" @click="fillAccount('doctor01')">医生</el-button>
              <el-button size="large" @click="fillAccount('nurse01')">护士</el-button>
              <el-button size="large" @click="fillAccount('patient01')">患者</el-button>
            </div>
          </div>

          <div class="login-hint">测试账号：任意角色 + 密码 123456</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const fillAccount = (role) => {
  form.username = role
  form.password = '123456'
}

const handleLogin = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    await userStore.login(form.username, form.password, form.rememberMe)
    ElMessage.success('登录成功')

    const role = userStore.role
    if (role === 'patient') {
      router.push('/vital-input')
    } else {
      router.push('/monitor')
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  padding: var(--space-4);
}

.login-wrapper {
  display: flex;
  width: 100%;
  max-width: 800px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.brand-section {
  width: 320px;
  background-color: var(--color-primary);
  color: #ffffff;
  padding: var(--space-8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-content {
  text-align: center;
}

.logo-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto var(--space-6);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255,255,255,0.15);
  border-radius: 8px;
}

.brand-content h1 {
  font-size: var(--text-xl);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.brand-content > p {
  font-size: var(--text-xs);
  opacity: 0.8;
  margin-bottom: var(--space-8);
}

.features {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;
  padding: 0 var(--space-4);
}

.feature {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  opacity: 0.9;
}

.feature-icon {
  font-size: var(--text-sm);
  color: #a8d5ff;
}

.login-section {
  flex: 1;
  padding: var(--space-8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 320px;
}

.login-header {
  margin-bottom: var(--space-6);
}

.login-header h2 {
  font-size: var(--text-lg);
  font-weight: 600;
  color: #111827;
  margin-bottom: var(--space-2);
}

.login-header p {
  font-size: var(--text-sm);
  color: #6b7280;
}

.login-form {
  margin-bottom: var(--space-6);
}

.login-form :deep(.el-form-item) {
  margin-bottom: var(--space-4);
}

.login-form :deep(.el-input__wrapper) {
  padding: var(--space-3) var(--space-4);
  border-radius: 6px;
  border-color: #d1d5db;
}

.login-form :deep(.el-input__inner) {
  font-size: var(--text-base);
}

.login-form :deep(.el-checkbox__label) {
  font-size: var(--text-sm);
  color: #6b7280;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: var(--text-base);
  font-weight: 500;
  border-radius: 6px;
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.login-btn:hover {
  background-color: #1d6f42;
  border-color: #1d6f42;
}

.quick-login {
  text-align: center;
  padding-top: var(--space-6);
  border-top: 1px solid #e5e7eb;
  margin-bottom: var(--space-4);
}

.quick-label {
  font-size: var(--text-sm);
  color: #6b7280;
  margin-bottom: var(--space-3);
}

.quick-btns {
  display: flex;
  gap: var(--space-3);
}

.quick-btns .el-button {
  flex: 1;
  border-radius: 6px;
  font-size: var(--text-sm);
  border-color: #d1d5db;
  color: #374151;
}

.quick-btns .el-button:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}

.login-hint {
  text-align: center;
  font-size: var(--text-xs);
  color: #9ca3af;
}
</style>
