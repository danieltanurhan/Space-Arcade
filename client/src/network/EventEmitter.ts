export type Listener<T = any> = (data: T) => void

export class EventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map()

  on<T = any>(event: string, cb: Listener<T>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(cb as Listener)
  }

  off<T = any>(event: string, cb: Listener<T>): void {
    this.listeners.get(event)?.delete(cb as Listener)
  }

  emit<T = any>(event: string, data: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(data))
  }
}