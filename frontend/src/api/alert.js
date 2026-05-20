import request from '@/utils/request'

export const getAlerts = (params) => {
  return request.get('/alerts', { params })
}

export const getAlertStats = () => {
  return request.get('/alerts/stats')
}

export const getAlertById = (alertId) => {
  return request.get(`/alerts/${alertId}`)
}

export const confirmAlert = (alertId, data) => {
  return request.post(`/alerts/${alertId}/confirm`, data)
}

export const resolveAlert = (alertId, data) => {
  return request.post(`/alerts/${alertId}/resolve`, data)
}

export const escalateAlert = (alertId) => {
  return request.post(`/alerts/${alertId}/escalate`)
}
