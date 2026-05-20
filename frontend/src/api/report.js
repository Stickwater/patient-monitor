import request from '@/utils/request'

// 生成报告
export const generateReport = (data) => {
  return request.post('/reports/generate', data)
}

// 获取报告列表
export const getReports = (params) => {
  return request.get('/reports', { params })
}

// 获取报告详情
export const getReportById = (reportId) => {
  return request.get(`/reports/${reportId}`)
}

// 更新报告
export const updateReport = (reportId, data) => {
  return request.put(`/reports/${reportId}`, data)
}

// 获取打印报告
export const getPrintReport = (reportId) => {
  return request.get(`/reports/${reportId}/print`)
}

// 获取我的报告（患者端）
export const getMyReports = (params) => {
  return request.get('/reports/my', { params })
}

// 获取我的报告详情（患者端）
export const getReportDetail = (reportId) => {
  return request.get(`/reports/my/${reportId}`)
}
