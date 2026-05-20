import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCurrentUser, login as apiLogin } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => userInfo.value?.role || '')
  const isNurse = computed(() => role.value === 'nurse')
  const isDoctor = computed(() => role.value === 'doctor')
  const isPatient = computed(() => role.value === 'patient')

  // 登录
  const login = async (username, password, rememberMe) => {
    const res = await apiLogin(username, password, rememberMe)
    token.value = res.data.token
    userInfo.value = res.data.user
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userInfo', JSON.stringify(res.data.user))
    return res
  }

  // 获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return null
    try {
      const res = await getCurrentUser()
      userInfo.value = res.data
      return res.data
    } catch (error) {
      logout()
      return null
    }
  }

  // 登出
  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    role,
    isNurse,
    isDoctor,
    isPatient,
    login,
    fetchUserInfo,
    logout
  }
})
