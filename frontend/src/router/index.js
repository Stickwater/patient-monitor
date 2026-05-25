import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

// 护士/医生路由
const staffRoutes = [
  {
    path: '/monitor',
    name: 'Monitor',
    component: () => import('@/views/monitor/index.vue'),
    meta: { title: '实时监护', icon: 'Monitor', roles: ['nurse', 'doctor'] }
  },
  {
    path: '/alerts',
    name: 'Alerts',
    component: () => import('@/views/alert/index.vue'),
    meta: { title: '报警管理', icon: 'Bell', roles: ['nurse', 'doctor'] }
  },
  {
    path: '/patients',
    name: 'Patients',
    component: () => import('@/views/patient/index.vue'),
    meta: { title: '患者管理', icon: 'User', roles: ['nurse', 'doctor'] }
  },
  {
    path: '/patient/:id',
    name: 'PatientDetail',
    component: () => import('@/views/patient/detail.vue'),
    meta: { title: '患者详情', roles: ['nurse', 'doctor'] }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/report/index.vue'),
    meta: { title: '病情报告', icon: 'Document', roles: ['nurse', 'doctor'] }
  },
  {
    path: '/thresholds',
    name: 'Thresholds',
    component: () => import('@/views/threshold/index.vue'),
    meta: { title: '阈值设置', icon: 'Setting', roles: ['doctor'] }
  }
]

// 患者路由
const patientRoutes = [
  {
    path: '/vital-input',
    name: 'VitalInput',
    component: () => import('@/views/patient-vital/index.vue'),
    meta: { title: '体征录入', icon: 'Edit', roles: ['patient'] }
  },
  {
    path: '/my-vitals',
    name: 'MyVitals',
    component: () => import('@/views/patient-vital/my-vitals.vue'),
    meta: { title: '我的体征', icon: 'DataLine', roles: ['patient'] }
  },
  {
    path: '/my-reports',
    name: 'MyReports',
    component: () => import('@/views/patient-vital/my-reports.vue'),
    meta: { title: '我的报告', icon: 'Document', roles: ['patient'] }
  },
  {
    path: '/health-advice',
    name: 'HealthAdvice',
    component: () => import('@/views/patient-vital/health-advice.vue'),
    meta: { title: '健康建议', icon: 'Notebook', roles: ['patient'] }
  }
]

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    redirect: to => {
      const token = localStorage.getItem('token')
      if (!token) return '/login'
      
      // 从 localStorage 恢复用户信息
      const userInfoStr = localStorage.getItem('userInfo')
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr)
          if (userInfo.role === 'patient') {
            return '/vital-input'
          }
        } catch (e) {
          // ignore
        }
      }
      return '/monitor'
    },
    component: () => import('@/views/layout/index.vue'),
    children: [
      ...staffRoutes,
      ...patientRoutes
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 患者监护系统` : '患者监护系统'
  
  const userStore = useUserStore()
  const token = localStorage.getItem('token')
  
  // 登录页直接放行
  if (to.path === '/login') {
    next()
    return
  }
  
  // 未登录则跳转登录
  if (!token) {
    next('/login')
    return
  }
  
  // 确保用户信息已加载
  if (!userStore.userInfo) {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      try {
        userStore.userInfo = JSON.parse(userInfoStr)
      } catch (e) {
        // 解析失败，尝试获取
        await userStore.fetchUserInfo()
      }
    } else {
      await userStore.fetchUserInfo()
    }
  }
  
  const userRole = userStore.role
  const allowedRoles = to.meta.roles
  
  // 检查角色权限
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    ElMessage.warning('您没有权限访问该页面')
    if (userRole === 'patient') {
      next('/vital-input')
    } else {
      next('/monitor')
    }
    return
  }
  
  next()
})

export default router
