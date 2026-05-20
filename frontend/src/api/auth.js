import request from '@/utils/request'

export const login = (username, password, rememberMe) => {
  return request.post('/auth/login', { username, password, rememberMe })
}

export const getCurrentUser = () => {
  return request.get('/auth/current')
}

export const changePassword = (oldPassword, newPassword, confirmPassword) => {
  return request.post('/auth/change-password', { oldPassword, newPassword, confirmPassword })
}

export const forgotPassword = (phone, verifyCode, newPassword, confirmPassword) => {
  return request.post('/auth/forgot-password', { phone, verifyCode, newPassword, confirmPassword })
}
