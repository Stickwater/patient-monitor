<template>
  <div class="layout-container">
    <aside class="sidebar">
      <div class="logo">
        <el-icon size="32" color="#fff"><Monitor /></el-icon>
        <span>患者监护</span>
      </div>
      
      <el-menu 
        :default-active="$route.path" 
        router 
        class="sidebar-menu"
        background-color="#1a1a2e"
        text-color="#a0a0a0"
        active-text-color="#fff"
      >
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
        
        <el-menu-item index="/thresholds" v-if="userStore.isDoctor">
          <el-icon><Setting /></el-icon>
          <span>阈值设置</span>
        </el-menu-item>
      </el-menu>
    </aside>
    
    <div class="main-wrapper">
      <header class="header">
        <div class="header-right">
          <div class="ws-status">
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
  width: 220px;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.sidebar-menu {
  flex: 1;
  border-right: none;
}

.alert-badge {
  margin-left: 8px;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ws-status :deep(.el-tag) {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  font-size: 14px;
  color: #333;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f0f2f5;
}
</style>
