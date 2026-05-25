import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        // 登录页面的401是账号或密码错误，不要跳转
        if (router.currentRoute.value.path === '/login') {
          ElMessage.error(error.response.data?.message || '账号或密码错误')
        } else {
          ElMessage.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          if (router.currentRoute.value.path !== '/login') {
            router.push('/login')
          }
        }
      } else {
        ElMessage.error(error.response.data?.message || '请求失败')
      }
    }
    return Promise.reject(error)
  }
)

export default request
