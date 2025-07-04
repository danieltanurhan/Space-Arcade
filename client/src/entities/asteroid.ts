import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { scene, world } from '../core/engine'
import * as gameState from '../state/gameState'
import { updateUI } from '../ui/hud'
import { createMineralChunk, MineralType } from './mineralChunk'

export interface Asteroid {
  mesh: THREE.Mesh
  body: CANNON.Body
  size: number
  mineralComposition: MineralType[]
}

export const asteroids: Asteroid[] = []

// Different zone types affect asteroid generation
export enum ZoneType {
  DENSE_FIELD = 'dense_field',
  CRYSTAL_NEBULA = 'crystal_nebula', 
  DEBRIS_FIELD = 'debris_field',
  SPARSE_OUTER = 'sparse_outer',
  COMET_TRAIL = 'comet_trail'
}

interface ZoneProperties {
  density: number
  sizeMultiplier: number
  mineralDistribution: { [key in MineralType]: number }
  colorTint: THREE.Color
}

const zoneProperties: { [key in ZoneType]: ZoneProperties } = {
  [ZoneType.DENSE_FIELD]: {
    density: 1.5,
    sizeMultiplier: 0.8,
    mineralDistribution: { iron: 0.5, copper: 0.3, rare_metals: 0.15, crystals: 0.05 },
    colorTint: new THREE.Color(0.8, 0.6, 0.4)
  },
  [ZoneType.CRYSTAL_NEBULA]: {
    density: 0.7,
    sizeMultiplier: 1.2,
    mineralDistribution: { iron: 0.2, copper: 0.2, rare_metals: 0.3, crystals: 0.3 },
    colorTint: new THREE.Color(0.6, 0.8, 1.0)
  },
  [ZoneType.DEBRIS_FIELD]: {
    density: 1.0,
    sizeMultiplier: 0.9,
    mineralDistribution: { iron: 0.4, copper: 0.4, rare_metals: 0.2, crystals: 0.0 },
    colorTint: new THREE.Color(0.7, 0.7, 0.8)
  },
  [ZoneType.SPARSE_OUTER]: {
    density: 0.3,
    sizeMultiplier: 1.5,
    mineralDistribution: { iron: 0.6, copper: 0.25, rare_metals: 0.1, crystals: 0.05 },
    colorTint: new THREE.Color(0.5, 0.5, 0.6)
  },
  [ZoneType.COMET_TRAIL]: {
    density: 0.8,
    sizeMultiplier: 0.6,
    mineralDistribution: { iron: 0.3, copper: 0.2, rare_metals: 0.2, crystals: 0.3 },
    colorTint: new THREE.Color(0.9, 0.9, 1.0)
  }
}

function generateZoneType(x: number, y: number, z: number): ZoneType {
  // Simple noise-based zone generation
  const noiseValue = Math.sin(x * 0.01) * Math.cos(y * 0.01) + Math.sin(z * 0.01)
  
  if (noiseValue > 0.5) return ZoneType.CRYSTAL_NEBULA
  if (noiseValue > 0.2) return ZoneType.DENSE_FIELD
  if (noiseValue > -0.2) return ZoneType.DEBRIS_FIELD
  if (noiseValue > -0.5) return ZoneType.COMET_TRAIL
  return ZoneType.SPARSE_OUTER
}

function selectMineralType(distribution: { [key in MineralType]: number }): MineralType {
  const rand = Math.random()
  let cumulative = 0
  
  for (const [mineral, probability] of Object.entries(distribution)) {
    cumulative += probability
    if (rand <= cumulative) {
      return mineral as MineralType
    }
  }
  
  return 'iron' // fallback
}

export function createAsteroidField(count = 30) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 200
    const y = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 200
    
    // Skip area around origin for space station
    if (Math.sqrt(x*x + y*y + z*z) < 30) continue
    
    const zoneType = generateZoneType(x, y, z)
    const zoneProps = zoneProperties[zoneType]
    
    const baseSize = Math.random() * 2 + 1
    const size = baseSize * zoneProps.sizeMultiplier
    
    createAsteroid(new THREE.Vector3(x, y, z), size, zoneType)
  }
}

export function createAsteroidRemote(position: THREE.Vector3, size: number, zoneType: ZoneType) {
  return createAsteroid(position, size, zoneType, true)
}

function createAsteroid(position: THREE.Vector3, size: number, zoneType: ZoneType, noPhysics = false) {
  const zoneProps = zoneProperties[zoneType]
  const geometry = new THREE.IcosahedronGeometry(size, 1)

  // Roughen surface
  const positionAttr = geometry.attributes.position as THREE.BufferAttribute
  const vertexArray = positionAttr.array as Float32Array
  for (let j = 0; j < vertexArray.length; j += 3) {
    vertexArray[j] += (Math.random() - 0.5) * 0.5
    vertexArray[j + 1] += (Math.random() - 0.5) * 0.5
    vertexArray[j + 2] += (Math.random() - 0.5) * 0.5
  }
  positionAttr.needsUpdate = true
  geometry.computeVertexNormals()

  // Apply zone-based coloring
  const baseColor = new THREE.Color().setHSL(0.1, 0.5, 0.3)
  baseColor.multiply(zoneProps.colorTint)
  
  const material = new THREE.MeshPhongMaterial({
    color: baseColor,
  })
  const asteroid = new THREE.Mesh(geometry, material)

  asteroid.position.copy(position)
  asteroid.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  )

  asteroid.castShadow = true
  asteroid.receiveShadow = true
  scene.add(asteroid)

  let body: CANNON.Body | null = null
  if (!noPhysics) {
    const shape = new CANNON.Sphere(size)
    body = new CANNON.Body({ mass: size * 10 })
    body.addShape(shape)
    body.position.copy(asteroid.position as any)
    world.addBody(body)
  }

  // Generate mineral composition based on zone
  const mineralComposition: MineralType[] = []
  const chunkCount = Math.floor(size) + 2 // 2-4 chunks typically
  
  for (let i = 0; i < chunkCount; i++) {
    mineralComposition.push(selectMineralType(zoneProps.mineralDistribution))
  }

  if (!noPhysics) {
    asteroids.push({ 
      mesh: asteroid, 
      body: body!, 
      size,
      mineralComposition
    })
  }
  return { mesh: asteroid }
}

export function destroyAsteroid(asteroidMesh: THREE.Mesh) {
  const index = asteroids.findIndex((a) => a.mesh === asteroidMesh)
  if (index === -1) return
  
  const asteroid = asteroids[index]
  const explosionCenter = asteroid.mesh.position.clone()
  
  // Create mineral chunks from the asteroid
  asteroid.mineralComposition.forEach((mineralType, i) => {
    // Spread chunks in different directions
    const angle = (i / asteroid.mineralComposition.length) * Math.PI * 2
    const explosionForce = 2 + Math.random() * 3
    
    const chunkVelocity = new THREE.Vector3(
      Math.cos(angle) * explosionForce,
      (Math.random() - 0.5) * explosionForce,
      Math.sin(angle) * explosionForce
    )
    
    const chunkPosition = explosionCenter.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * asteroid.size,
        (Math.random() - 0.5) * asteroid.size,
        (Math.random() - 0.5) * asteroid.size
      )
    )
    
    const chunkSize = 0.3 + Math.random() * 0.4
    createMineralChunk(chunkPosition, chunkVelocity, mineralType, chunkSize)
  })
  
  // Remove original asteroid
  scene.remove(asteroid.mesh)
  world.removeBody(asteroid.body)
  asteroids.splice(index, 1)

  gameState.stats.asteroidsDestroyed++
  gameState.stats.score += 10
  updateUI()

  console.log(`💥 Asteroid destroyed! Released ${asteroid.mineralComposition.length} mineral chunks`)
}

export function syncAsteroids() {
  asteroids.forEach((a) => {
    a.mesh.position.copy(a.body.position as any)
    a.mesh.quaternion.copy(a.body.quaternion as any)
  })
}