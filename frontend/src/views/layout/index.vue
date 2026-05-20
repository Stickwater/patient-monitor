<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <el-icon size="24"><Monitor /></el-icon>
        <span>患者监护</span>
      </div>
      
      <el-menu 
        :default-active="$route.path" 
        router 
        class="sidebar-menu"
        background-color="transparent"
        text-color="var(--text-secondary)"
        active-text-color="var(--color-primary)"
      >
        <!-- 护士/医生菜单 -->
        <template v-if="userStore.isNurse || userStore.isDoctor">
          <el-menu-item index="/monitor">
            <el-icon><Monitor /></el-icon>
            <span>实时监护</span>
          </el-menu-item>
          
          <el-menu-item index="/alerts">
            <el-icon><Bell /></el-icon>
            <span>报警管理</span>
            <el-badge v-if="alertStore.unreadCount > 0" :value="alertStore.unreadCount" class="alert-badge" />
          </el-menu-item>
          
          <el-menu-item index="/patients">
            <el-icon><User /></el-icon>
            <span>患者管理</span>
          </el-menu-item>
          
          <el-menu-item index="/reports">
            <el-icon><Document /></el-icon>
            <span>病情报告</span>
          </el-menu-item>
          
          <el-menu-item v-if="userStore.isDoctor" index="/thresholds">
            <el-icon><Setting /></el-icon>
            <span>阈值设置</span>
          </el-menu-item>
        </template>

        <!-- 患者菜单 -->
        <template v-if="userStore.isPatient">
          <el-menu-item index="/vital-input">
            <el-icon><Edit /></el-icon>
            <span>体征录入</span>
          </el-menu-item>
          
          <el-menu-item index="/my-vitals">
            <el-icon><DataLine /></el-icon>
            <span>我的体征</span>
          </el-menu-item>
          
          <el-menu-item index="/my-reports">
            <el-icon><Document /></el-icon>
            <span>我的报告</span>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>
    
    <div class="main-wrapper">
      <header class="header">
        <div class="header-left">
          <span class="role-tag">{{ roleLabel }}</span>
        </div>
        <div class="header-right">
          <div class="ws-status" v-if="userStore.isNurse || userStore.isDoctor">
            <el-tag :type="wsConnected ? 'success' : 'danger'" size="small">
              <el-icon class="el-icon--left"><Connection /></el-icon>
              {{ wsConnected ? '在线' : '离线' }}
            </el-tag>
          </div>
          
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" :icon="'User'" />
              <span class="username">{{ userStore.userInfo?.realName || userStore.userInfo?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { ElMessageBox, ElMessage } from 'element-plus'
import WebSocket from '@/utils/websocket'

const router = useRouter()
const userStore = useUserStore()
const alertStore = useAppStore()

const wsConnected = computed(() => alertStore.wsConnected)

const roleLabel = computed(() => {
  const labels = {
    nurse: '值班护士',
    doctor: '主治医生',
    patient: '患者'
  }
  return labels[userStore.role] || ''
})

let ws = null

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
    })
  }
}

onMounted(async () => {
  await userStore.fetchUserInfo()
  
  // 只有护士和医生需要WebSocket连接
  if (userStore.isNurse || userStore.isDoctor) {
    ws = new WebSocket({
      token: userStore.token,
      onMessage: (data) => {
        if (data.type === 'ALERT') {
          alertStore.addAlert(data.alert)
          ElMessage.warning(`新报警: ${data.alert.patientName} - ${data.alert.alertContent}`)
        }
        if (data.type === 'CONNECTED') {
          alertStore.wsConnected = true
        }
      },
      onClose: () => {
        alertStore.wsConnected = false
      }
    })
  }
})

onUnmounted(() => {
  ws?.close()
})
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background: var(--bg-white);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.logo {
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-primary);
  font-size: var(--text-base);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  padding: var(--space-3) 0;
}

.alert-badge {
  margin-left: var(--space-2);
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-light);
}

.header {
  height: 56px;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
}

.header-left {
  display: flex;
  align-items: center;
}

.role-tag {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-3);
  background: var(--bg-light);
  border-radius: var(--radius-sm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.ws-status :deep(.el-tag) {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.username {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.main-content {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}
</style>
