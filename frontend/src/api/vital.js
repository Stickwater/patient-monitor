import request from '@/utils/request'

export const getRealtimeData = (patientId) => {
  return request.get(`/vitals/realtime/${patientId}`)
}

export const getHistoryData = (patientId, params) => {
  return request.get(`/vitals/history/${patientId}`, { params })
}

export const getTrendData = (patientId, params) => {
  return request.get(`/vitals/trend/${patientId}`, { params })
}
