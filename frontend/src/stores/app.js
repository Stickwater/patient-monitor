import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const alerts = ref([])
  const unreadCount = ref(0)
  const wsConnected = ref(false)

  const addAlert = (alert) => {
    alerts.value.unshift(alert)
    unreadCount.value++
  }

  const markAllRead = () => {
    unreadCount.value = 0
  }

  const updateAlertStatus = (alertId, status) => {
    const alert = alerts.value.find(a => a.alertId === alertId)
    if (alert) {
      alert.status = status
    }
  }

  return {
    alerts,
    unreadCount,
    wsConnected,
    addAlert,
    markAllRead,
    updateAlertStatus
  }
})
