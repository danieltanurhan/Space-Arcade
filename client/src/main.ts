import { initEngine, renderer, world, scene, camera } from './core/engine'
import { createSpaceship, updateSpaceship } from './entities/spaceship'
import { syncAsteroids, syncAsteroidsFromServer } from './entities/asteroid'
import { syncSpaceshipsFromServer } from './entities/spaceship'
import { syncMineralChunksFromServer, syncMineralChunks } from './entities/mineralChunk'
import { syncBulletsFromServer } from './systems/bulletSystem'
import { createSpaceStation } from './entities/spaceStation'
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
    const list = msg.entities as any[]
    syncAsteroidsFromServer(list.filter((e) => (e.type ?? e.Type) === 'asteroid'))
    syncSpaceshipsFromServer(list.filter((e) => (e.type ?? e.Type) === 'spaceship'))
    syncMineralChunksFromServer(list.filter((e) => (e.type ?? e.Type) === 'mineral_chunk'))
    syncBulletsFromServer(list.filter((e) => (e.type ?? e.Type) === 'bullet'))
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