import { EventEmitter } from './EventEmitter'
import { ConnectionState } from './ConnectionState'
import { MessageTypes } from './MessageTypes'

export interface OutgoingMessage {
  type: string
  [key: string]: any
}

export interface IncomingMessage {
  type: string
  [key: string]: any
}

export class NetworkManager {
  private socket: WebSocket | null = null
  private readonly eventEmitter = new EventEmitter()
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private seq = 0

  get connectionState() {
    return this.state
  }

  on(event: string, cb: (data: any) => void) {
    this.eventEmitter.on(event, cb)
  }

  off(event: string, cb: (data: any) => void) {
    this.eventEmitter.off(event, cb)
  }

  async connect(serverUrl: string) {
    if (this.socket && this.state === ConnectionState.CONNECTED) return

    this.state = ConnectionState.CONNECTING
    this.socket = new WebSocket(serverUrl)

    this.socket.binaryType = 'arraybuffer'

    this.socket.onopen = () => {
      this.state = ConnectionState.CONNECTED
      this.eventEmitter.emit('connected', undefined)
    }

    this.socket.onmessage = (ev) => {
      try {
        const msg: IncomingMessage = JSON.parse(ev.data as string)
        this.eventEmitter.emit('message', msg)
        if (msg.type) {
          this.eventEmitter.emit(msg.type.toLowerCase(), msg)
        }
      } catch (err) {
        console.error('Failed to parse incoming message', err)
      }
    }

    this.socket.onclose = () => {
      this.state = ConnectionState.DISCONNECTED
      this.eventEmitter.emit('disconnected', undefined)
    }

    this.socket.onerror = (ev) => {
      console.error('WebSocket error', ev)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.state = ConnectionState.DISCONNECTED
    }
  }

  sendMessage(msg: OutgoingMessage) {
    if (!this.socket || this.state !== ConnectionState.CONNECTED) {
      console.warn('Not connected, cannot send message')
      return
    }

    const enriched = { ...msg, seq: ++this.seq }
    this.socket.send(JSON.stringify(enriched))
  }

  // Convenience helpers -----------------------------------------------------

  joinLobby(lobby: string) {
    this.sendMessage({ type: MessageTypes.JOIN, lobby })
  }

  sendInput(input: any) {
    this.sendMessage({ type: MessageTypes.INPUT, ...input })
  }
}