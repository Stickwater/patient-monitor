import request from '@/utils/request'

// 获取实时数据
export const getRealtimeData = (patientId) => {
  return request.get(`/vitals/realtime/${patientId}`)
}

// 获取历史数据
export const getHistoryData = (patientId, params) => {
  return request.get(`/vitals/history/${patientId}`, { params })
}

// 获取趋势数据
export const getTrendData = (patientId, params) => {
  return request.get(`/vitals/trend/${patientId}`, { params })
}

// 上传生理信号（患者端）
export const uploadVital = (data) => {
  return request.post('/vitals/upload', data)
}

// 获取我的体征数据（患者端）
export const getMyVitals = (params) => {
  return request.get('/vitals/my', { params })
}

// 按患者获取报警
export const getAlertsByPatient = (patientId) => {
  return request.get('/alerts', { params: { patientId } })
}
