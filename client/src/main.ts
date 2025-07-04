import { initEngine, renderer, world, scene, camera } from './core/engine'
import { createSpaceship, updateSpaceship } from './entities/spaceship'
import { createAsteroidField, syncAsteroids } from './entities/asteroid'
import { createSpaceStation } from './entities/spaceStation'
import { syncMineralChunks } from './entities/mineralChunk'
import { createCrosshair, updateCamera } from './systems/cameraSystem'
import { shootBullet, updateBullets } from './systems/bulletSystem'
import { setupInput } from './controls/input'
import { updateUI } from './ui/hud'
import { fixedTimeStep } from './config/constants'
import { NetworkManager } from './network/NetworkManager'
import { InputSender } from './network/InputSender'
import { StateReceiver } from './network/StateReceiver'
import { updateLatency, updateConnectionState } from './network/networkStats'
import { MessageType } from './network/MessageTypes'
import { showError } from './ui/notifications'

console.log('🎮 Space Arcade loading...')

const network = new NetworkManager()
// connect to local dev server; adjust URL as needed
network.connect('ws://localhost:8080/ws', 'alpha-field-01')
const inputSender = new InputSender(network)
inputSender.start()

// example log latency
network.on('latency', (ms) => {
  updateLatency(ms)
})

network.on('state', (state) => {
  updateConnectionState(state)
})

network.on(MessageType.ERROR, (msg) => {
  showError(msg.data?.message || 'Server error')
})

new StateReceiver(network)

initEngine()
createSpaceStation()
createSpaceship()
createAsteroidField()
createCrosshair()
setupInput(shootBullet)
updateUI()

function animate() {
  requestAnimationFrame(animate)
  world.step(fixedTimeStep)
  syncAsteroids()
  syncMineralChunks()
  updateSpaceship(fixedTimeStep)
  updateBullets(fixedTimeStep)
  updateCamera()
  renderer.render(scene, camera)
}

animate()