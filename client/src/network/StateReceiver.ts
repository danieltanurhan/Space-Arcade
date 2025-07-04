import { NetworkManager } from './NetworkManager'
import { MessageType } from './MessageTypes'

export class StateReceiver {
  constructor(private network: NetworkManager) {
    this.network.on(MessageType.STATE, (msg) => this.handleState(msg))
    this.network.on(MessageType.STATE_DELTA, (msg) => this.handleDelta(msg))
  }

  private handleState(msg: any) {
    // TODO: apply full state to local world
    console.log('Full state received', msg)
  }

  private handleDelta(msg: any) {
    // TODO: merge delta with local state
    console.log('Delta state received', msg)
  }
}