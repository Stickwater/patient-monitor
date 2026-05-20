<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon size="48"><Monitor /></el-icon>
        </div>
        <h1>患者监护系统</h1>
        <p>Patient Monitoring System</p>
      </div>
      
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
        <el-form-item prop="username">
          <el-input 
            v-model="form.username" 
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="form.rememberMe">记住我（7天内免登录）</el-checkbox>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            :loading="loading" 
            class="login-btn"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p class="test-accounts">测试账号</p>
        <div class="account-list">
          <div class="account-item">
            <span class="role">医生</span>
            <span class="info">doctor001 / 123456</span>
          </div>
          <div class="account-item">
            <span class="role">护士</span>
            <span class="info">nurse001 / 123456</span>
          </div>
          <div class="account-item">
            <span class="role">患者</span>
            <span class="info">patient001 / 123456</span>
          </div>
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

const handleLogin = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    
    await userStore.login(form.username, form.password, form.rememberMe)
    ElMessage.success('登录成功')
    
    // 根据角色跳转到不同页面
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
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-light);
}

.login-box {
  width: 400px;
  padding: var(--space-10);
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.logo-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-light);
  border-radius: var(--radius-lg);
  color: var(--color-primary);
}

.login-header h1 {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.login-header p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.login-form {
  margin-top: var(--space-6);
}

.login-form :deep(.el-input__wrapper) {
  padding: var(--space-3) var(--space-4);
}

.login-btn {
  width: 100%;
}

.login-footer {
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.test-accounts {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.account-item {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-xs);
}

.account-item .role {
  padding: var(--space-1) var(--space-2);
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  min-width: 40px;
}

.account-item .info {
  color: var(--text-primary);
}
</style>
