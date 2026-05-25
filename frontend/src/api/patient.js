import request from '@/utils/request'

export const getPatients = (params) => {
  return request.get('/patients', { params })
}

export const getPatientById = (patientId) => {
  return request.get(`/patients/${patientId}`)
}

export const createPatient = (data) => {
  return request.post('/patients', data)
}

export const updatePatient = (patientId, data) => {
  return request.put(`/patients/${patientId}`, data)
}

export const getLatestVital = (patientId) => {
  return request.get(`/patients/${patientId}/latest-vital`)
}

export const getDoctors = () => {
  return request.get('/auth/doctors')
}

export const getMyInfo = () => {
  return request.get('/patients/me')
}
