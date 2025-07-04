export type EventCallback<T = any> = (data: T) => void

export class EventEmitter {
  private listeners: Record<string, EventCallback[]> = {}

  on<T = any>(event: string, callback: EventCallback<T>) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback as EventCallback)
  }

  off<T = any>(event: string, callback: EventCallback<T>) {
    const cbs = this.listeners[event]
    if (!cbs) return
    const idx = cbs.indexOf(callback as EventCallback)
    if (idx !== -1) cbs.splice(idx, 1)
  }

  emit<T = any>(event: string, data: T) {
    const cbs = this.listeners[event]
    if (!cbs) return
    cbs.forEach((cb) => cb(data))
  }
}