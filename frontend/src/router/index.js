import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

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
    component: () => import('@/views/layout/index.vue'),
    redirect: '/monitor',
    children: [
      ...staffRoutes,
      ...patientRoutes
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 患者监护系统` : '患者监护系统'
  
  const userStore = useUserStore()
  const token = localStorage.getItem('token')
  
  if (to.path === '/login') {
    next()
  } else if (!token) {
    next('/login')
  } else {
    // 检查用户角色是否有权限访问该路由
    const userRole = userStore.role
    const allowedRoles = to.meta.roles
    
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      // 角色无权访问，重定向到该角色的默认页面
      if (userRole === 'patient') {
        next('/vital-input')
      } else {
        next('/monitor')
      }
    } else {
      next()
    }
  }
})

export default router
