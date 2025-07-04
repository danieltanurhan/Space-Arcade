import { inputState } from '../controls/input'
import { NetworkManager } from './NetworkManager'

export class InputSender {
  private timer: any
  constructor(private network: NetworkManager, private rateHz = 15) {
    this.network.on('INPUT_ACK', () => {
      // received ack; could update prediction buffer here
    })
  }

  start() {
    const interval = 1000 / this.rateHz
    this.timer = setInterval(() => this.tick(), interval)
  }

  stop() {
    clearInterval(this.timer)
  }

  private tick() {
    // Build movement vector
    const mv = { x: 0, y: 0, z: 0 }
    if (inputState.moveForward) mv.z -= 1
    if (inputState.moveBackward) mv.z += 1
    if (inputState.moveLeft) mv.x -= 1
    if (inputState.moveRight) mv.x += 1
    if (inputState.moveUp) mv.y += 1
    if (inputState.moveDown) mv.y -= 1

    const rot = {
      pitch: inputState.shipRotationX,
      yaw: inputState.shipRotationY,
    }

    const msgData = {
      movement: mv,
      rotation: rot,
      actions: {
        shoot: false, // shoot handled separately
      },
    }
    this.network.sendInput(msgData)
    // Assume seq increments inside NetworkManager before send, but we don't have direct value. We'll not track seq here (complex). Remove pending tracking feature.
  }
}