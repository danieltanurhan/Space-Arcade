import { EventEmitter } from './EventEmitter'
import { MessageType } from './MessageTypes'
import { ConnectionState } from './ConnectionState'

export interface NetworkManagerConfig {
  serverUrl: string
  lobby: string
  reconnectAttempts?: number
  reconnectDelay?: number // ms
  heartbeatInterval?: number // ms
}

export interface OutgoingMessage {
  type: MessageType
  timestamp: number
  seq?: number
  data?: any
}

export class NetworkManager {
  private socket: WebSocket | null = null
  private seq: number = 1
  // track last server sequence if needed in future
  private config: Required<Omit<NetworkManagerConfig, 'serverUrl' | 'lobby'>>
  // private connectUrl!: string
  private lobby!: string

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private emitter: EventEmitter = new EventEmitter()

  private heartbeatTimer: any
  private lastPingId: string | null = null
  private latency: number = 0

  constructor() {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 2000,
      heartbeatInterval: 3000,
    }
  }

  async connect(url: string, lobby: string) {
    this.lobby = lobby
    this.connectionState = ConnectionState.CONNECTING
    this.socket = new WebSocket(url)
    this.socket.onopen = () => {
      this.connectionState = ConnectionState.CONNECTED
      this.emitter.emit('state', this.connectionState)
      this.sendJoin()
      this.startHeartbeat()
    }
    this.socket.onmessage = (ev) => this.handleMessage(ev)
    this.socket.onerror = () => {
      this.emitter.emit('error', 'socket_error')
    }
    this.socket.onclose = () => {
      this.stopHeartbeat()
      this.connectionState = ConnectionState.DISCONNECTED
      this.emitter.emit('state', this.connectionState)
      // todo reconnection
    }
  }

  private sendJoin() {
    const msg = {
      type: MessageType.JOIN,
      timestamp: Date.now(),
      seq: this.seq++,
      data: {
        lobby: this.lobby,
      },
    }
    this.sendRaw(msg)
  }

  sendRaw(obj: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(obj))
    }
  }

  sendInput(data: any) {
    const msg = {
      type: MessageType.INPUT,
      timestamp: Date.now(),
      seq: this.seq++,
      data,
    }
    this.sendRaw(msg)
  }

  private handleMessage(ev: MessageEvent) {
    let msg: any
    try {
      msg = JSON.parse(ev.data)
    } catch (err) {
      console.error('Invalid JSON', err)
      return
    }
    const { type } = msg as { type: MessageType }
    this.emitter.emit(type, msg)

    switch (type) {
      case MessageType.PONG: {
        if (msg.data?.id === this.lastPingId) {
          const rtt = Date.now() - Number(this.lastPingId?.split('_')[1])
          this.latency = rtt / 2
          this.emitter.emit('latency', this.latency)
        }
        break
      }
      case MessageType.STATE:
        // this.serverSeq = msg.seq
        break
      case MessageType.STATE_DELTA:
        // this.serverSeq = msg.seq
        break
      case MessageType.ERROR:
        console.error('Server error', msg)
        this.emitter.emit('errorMessage', msg.data)
        break
      case MessageType.INPUT_ACK:
        this.emitter.emit('INPUT_ACK', msg)
        break
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState !== ConnectionState.CONNECTED) return
      this.lastPingId = `ping_${Date.now()}`
      const ping = {
        type: MessageType.PING,
        timestamp: Date.now(),
        seq: this.seq++,
        data: { id: this.lastPingId },
      }
      this.sendRaw(ping)
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat() {
    clearInterval(this.heartbeatTimer)
  }

  on(event: string, cb: (data: any) => void) {
    this.emitter.on(event, cb)
  }

  getLatency() {
    return this.latency
  }
}