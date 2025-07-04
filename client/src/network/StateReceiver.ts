import { NetworkManager } from './NetworkManager'
import { MessageType } from './MessageTypes'
import { RemoteEntityManager } from '../entities/RemoteEntityManager'

export class StateReceiver {
  private manager = new RemoteEntityManager()
  constructor(private network: NetworkManager) {
    this.network.on(MessageType.STATE, (msg) => this.manager.applyFullState(msg))
    this.network.on(MessageType.STATE_DELTA, (msg) => this.manager.applyDelta(msg))
    this.network.on(MessageType.ENTITY_SPAWN, (msg) => this.manager.applyDelta({ data: { added: [msg.data.entity] } }))
    this.network.on(MessageType.ENTITY_DESTROY, (msg) => this.manager.applyDelta({ data: { removed: [msg.data.entityId] } }))
  }
}