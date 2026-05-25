import request from '@/utils/request'

// 创建诊疗建议
export const createAdvice = (data) => {
  return request.post('/advice', data)
}

// 获取患者诊疗建议
export const getAdvicesByPatient = (patientId, type) => {
  return request.get(`/patient/${patientId}/advices`, { params: { type } })
}

// 获取我的诊疗建议（患者端）
export const getMyAdvices = (type) => {
  return request.get('/my/advices', { params: { type } })
}

// 删除诊疗建议
export const deleteAdvice = (adviceId) => {
  return request.delete(`/advice/${adviceId}`)
}
