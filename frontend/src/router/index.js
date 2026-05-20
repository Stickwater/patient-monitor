import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

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
      {
        path: 'monitor',
        name: 'Monitor',
        component: () => import('@/views/monitor/index.vue'),
        meta: { title: '实时监护', icon: 'Monitor' }
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('@/views/alert/index.vue'),
        meta: { title: '报警管理', icon: 'Bell' }
      },
      {
        path: 'patients',
        name: 'Patients',
        component: () => import('@/views/patient/index.vue'),
        meta: { title: '患者管理', icon: 'User' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/report/index.vue'),
        meta: { title: '病情报告', icon: 'Document' }
      },
      {
        path: 'thresholds',
        name: 'Thresholds',
        component: () => import('@/views/threshold/index.vue'),
        meta: { title: '阈值设置', icon: 'Setting' }
      }
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
    next()
  }
})

export default router
