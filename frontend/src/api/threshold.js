import request from '@/utils/request'

export const getThreshold = (patientId) => {
  return request.get(`/thresholds/${patientId}`)
}

export const setThreshold = (patientId, data) => {
  return request.post(`/thresholds/${patientId}`, data)
}

export const getThresholdHistory = (patientId) => {
  return request.get(`/thresholds/${patientId}/history`)
}
