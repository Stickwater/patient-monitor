import request from '@/utils/request'

export const getDashboardOverview = () => {
  return request.get('/dashboard/overview')
}
