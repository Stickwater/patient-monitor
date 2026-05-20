import request from '@/utils/request'

// 获取阈值
export const getThreshold = (patientId) => {
  return request.get(`/thresholds/${patientId}`)
}

// 设置阈值
export const setThreshold = (patientId, data) => {
  return request.post(`/thresholds/${patientId}`, data)
}

// 获取阈值历史
export const getThresholdHistory = (patientId) => {
  return request.get(`/thresholds/${patientId}/history`)
}

// 获取我的阈值（患者端）
export const getMyThreshold = () => {
  return request.get('/thresholds/my')
}
