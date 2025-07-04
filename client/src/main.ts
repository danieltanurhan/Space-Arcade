import { initEngine, renderer, world, scene, camera } from './core/engine'
import { createSpaceship, updateSpaceship } from './entities/spaceship'
import { syncAsteroids, syncAsteroidsFromServer } from './entities/asteroid'
import { createSpaceStation } from './entities/spaceStation'
import { syncMineralChunks } from './entities/mineralChunk'
import { createCrosshair, updateCamera } from './systems/cameraSystem'
import { shootBullet, updateBullets } from './systems/bulletSystem'
import { setupInput } from './controls/input'
import { updateUI } from './ui/hud'
import { fixedTimeStep } from './config/constants'

// Networking
import { NetworkManager } from './network/NetworkManager'

const network = new NetworkManager()

network.on('connected', () => {
  console.log('🔌 Connected to Space Arcade server')
  network.joinLobby('alpha')
})

network.on('state', (msg: any) => {
  if (msg && msg.entities) {
    syncAsteroidsFromServer(
      (msg.entities as any[]).filter((e) => e.type === 'asteroid' || e.Type === 'asteroid')
    )
  }
})

// Establish connection (default local dev URL)
network.connect('ws://localhost:8080/ws')

console.log('🎮 Space Arcade loading...')

initEngine()
createSpaceStation()
createSpaceship()
// Asteroids will be spawned from server state
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