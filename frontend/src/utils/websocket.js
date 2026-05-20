class WebSocketClient {
  constructor(options) {
    this.options = options
    this.ws = null
    this.reconnectInterval = 5000
    this.reconnectTimer = null
    this.heartbeatTimer = null
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/vitals?token=${this.options.token}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('WebSocket连接成功')
        this.startHeartbeat()
        if (this.options.onConnect) this.options.onConnect()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'HEARTBEAT_ACK') return
          if (this.options.onMessage) this.options.onMessage(data)
        } catch (e) {
          console.error('消息解析失败:', e)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket连接关闭')
        this.stopHeartbeat()
        if (this.options.onClose) this.options.onClose()
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error)
      }
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      this.reconnect()
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'HEARTBEAT' })
    }, 30000)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  reconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      console.log('尝试重新连接...')
      this.connect()
      this.reconnectTimer = null
    }, this.reconnectInterval)
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  subscribePatient(patientId) {
    this.send({ type: 'SUBSCRIBE_PATIENT', patientId })
  }

  unsubscribePatient(patientId) {
    this.send({ type: 'UNSUBSCRIBE_PATIENT', patientId })
  }

  close() {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export default WebSocketClient
