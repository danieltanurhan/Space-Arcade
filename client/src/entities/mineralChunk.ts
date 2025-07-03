import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { scene, world } from '../core/engine'
import * as gameState from '../state/gameState'
import { updateUI } from '../ui/hud'

export type MineralType = 'iron' | 'copper' | 'rare_metals' | 'crystals'

export interface MineralChunk {
  mesh: THREE.Mesh
  body: CANNON.Body
  type: MineralType
  purity: number // 0.1 - 1.0
  mass: number
  spawnTime: number
}

export const mineralChunks: MineralChunk[] = []

// Mineral properties for different types
const mineralProperties = {
  iron: { color: 0x8B4513, value: 1, rarity: 0.4 },
  copper: { color: 0xB87333, value: 2, rarity: 0.3 },
  rare_metals: { color: 0xC0C0C0, value: 10, rarity: 0.2 },
  crystals: { color: 0x9932CC, value: 25, rarity: 0.1 }
}

export function createMineralChunk(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  type: MineralType,
  size: number = 0.5
): MineralChunk {
  const purity = 0.3 + Math.random() * 0.7 // 0.3 to 1.0
  const mass = size * purity
  
  // Create visual representation
  const geometry = new THREE.OctahedronGeometry(size, 0)
  
  // Add some randomness to shape
  const positionAttr = geometry.attributes.position as THREE.BufferAttribute
  const vertexArray = positionAttr.array as Float32Array
  for (let i = 0; i < vertexArray.length; i += 3) {
    vertexArray[i] += (Math.random() - 0.5) * 0.1
    vertexArray[i + 1] += (Math.random() - 0.5) * 0.1
    vertexArray[i + 2] += (Math.random() - 0.5) * 0.1
  }
  positionAttr.needsUpdate = true
  geometry.computeVertexNormals()
  
  const material = new THREE.MeshPhongMaterial({
    color: mineralProperties[type].color,
    shininess: type === 'crystals' ? 100 : 30,
    transparent: type === 'crystals',
    opacity: type === 'crystals' ? 0.8 : 1.0
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  
  // Create physics body
  const shape = new CANNON.Sphere(size * 0.8)
  const body = new CANNON.Body({ mass: mass * 5 })
  body.addShape(shape)
  body.position.copy(position as any)
  body.velocity.copy(velocity as any)
  
  // Add some angular velocity for spinning
  body.angularVelocity.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4
  )
  
  world.addBody(body)
  
  const chunk: MineralChunk = {
    mesh,
    body,
    type,
    purity,
    mass,
    spawnTime: performance.now() / 1000
  }
  
  mineralChunks.push(chunk)
  return chunk
}

export function collectMineralChunk(chunk: MineralChunk) {
  const index = mineralChunks.findIndex(c => c === chunk)
  if (index === -1) return
  
  // Remove from scene and physics world
  scene.remove(chunk.mesh)
  world.removeBody(chunk.body)
  mineralChunks.splice(index, 1)
  
  // Add to player inventory
  const baseValue = mineralProperties[chunk.type].value
  const value = Math.floor(baseValue * chunk.purity * chunk.mass)
  
  gameState.stats.score += value
  gameState.stats.mineralsCollected = (gameState.stats.mineralsCollected || 0) + 1
  
  updateUI()
  
  // Visual feedback
  console.log(`💎 Collected ${chunk.type} chunk! Value: ${value} (purity: ${(chunk.purity * 100).toFixed(1)}%)`)
}

export function syncMineralChunks() {
  const currentTime = performance.now() / 1000
  
  for (let i = mineralChunks.length - 1; i >= 0; i--) {
    const chunk = mineralChunks[i]
    
    // Remove chunks after 30 seconds to prevent clutter
    if (currentTime - chunk.spawnTime > 30) {
      scene.remove(chunk.mesh)
      world.removeBody(chunk.body)
      mineralChunks.splice(i, 1)
      continue
    }
    
    // Sync physics to visual
    chunk.mesh.position.copy(chunk.body.position as any)
    chunk.mesh.quaternion.copy(chunk.body.quaternion as any)
  }
}