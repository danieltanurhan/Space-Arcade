import { ConnectionState } from './ConnectionState'

export let latency = 0
export let connectionState: ConnectionState | string = ConnectionState.DISCONNECTED

export function updateLatency(ms: number) {
  latency = ms
}

export function updateConnectionState(state: ConnectionState) {
  connectionState = state
}