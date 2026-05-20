import request from '@/utils/request'

export const generateReport = (data) => {
  return request.post('/reports/generate', data)
}

export const getReports = (params) => {
  return request.get('/reports', { params })
}

export const getReportById = (reportId) => {
  return request.get(`/reports/${reportId}`)
}

export const updateReport = (reportId, data) => {
  return request.put(`/reports/${reportId}`, data)
}

export const getPrintReport = (reportId) => {
  return request.get(`/reports/${reportId}/print`)
}
