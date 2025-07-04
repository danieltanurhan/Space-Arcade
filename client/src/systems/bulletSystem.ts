import * as THREE from 'three'
import { scene } from '../core/engine'
import {
  bulletSpeed,
  bulletLifetime,
  shootCooldown,
} from '../config/constants'
import { spaceships, shipVelocity } from '../entities/spaceship'
import { asteroids, destroyAsteroid } from '../entities/asteroid'
import { mineralChunks, collectMineralChunk } from '../entities/mineralChunk'

export interface Bullet {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spawnTime: number
  id?: number
}

const bullets: Bullet[] = []

export const bulletById: Map<number, Bullet> = new Map()

export interface ServerBulletEntity {
  id: number
  x: number
  y: number
  z: number
  vx?: number
  vy?: number
  vz?: number
}

export function syncBulletsFromServer(serverBullets: ServerBulletEntity[]) {
  const seen = new Set<number>()

  serverBullets.forEach((b) => {
    let bullet = bulletById.get(b.id)
    if (!bullet) {
      // Create new bullet mesh
      const bulletGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8)
      const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
      const mesh = new THREE.Mesh(bulletGeo, bulletMat)
      mesh.castShadow = true
      scene.add(mesh)
      bullet = { mesh, velocity: new THREE.Vector3(), spawnTime: performance.now() / 1000, id: b.id }
      bullets.push(bullet)
      bulletById.set(b.id, bullet)
    }

    // Update transform
    bullet.mesh.position.set(b.x, b.y, b.z)
    bullet.velocity.set(b.vx ?? 0, b.vy ?? 0, b.vz ?? 0)
    seen.add(b.id)
  })

  // Remove bullets not in list
  for (const [id, bullet] of [...bulletById.entries()]) {
    if (!seen.has(id)) {
      scene.remove(bullet.mesh)
      bulletById.delete(id)
      const idx = bullets.indexOf(bullet)
      if (idx !== -1) bullets.splice(idx, 1)
    }
  }
}

let lastShotTime = 0

export function shootBullet() {
  if (spaceships.length === 0) return
  const now = performance.now() / 1000
  if (now - lastShotTime < shootCooldown) return
  lastShotTime = now

  const ship = spaceships[0]
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion)

  const bulletGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8)
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const bullet = new THREE.Mesh(bulletGeo, bulletMat)
  bullet.position.copy(ship.position)

  const bulletDirection = dir.clone().normalize()
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bulletDirection)

  scene.add(bullet)
  const bulletVel = dir.clone().multiplyScalar(bulletSpeed).add(shipVelocity.clone())
  bullets.push({ mesh: bullet, velocity: bulletVel, spawnTime: now })
}

export function updateBullets(dt: number) {
  const now = performance.now() / 1000
  
  // Update spaceship mineral collection
  if (spaceships.length > 0) {
    const ship = spaceships[0]
    const collectionRange = 3.0
    
    for (let i = mineralChunks.length - 1; i >= 0; i--) {
      const chunk = mineralChunks[i]
      const distance = ship.position.distanceTo(chunk.mesh.position)
      
      if (distance < collectionRange) {
        collectMineralChunk(chunk)
      }
    }
  }
  
  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.mesh.position.add(b.velocity.clone().multiplyScalar(dt))

    if (now - b.spawnTime > bulletLifetime) {
      scene.remove(b.mesh)
      bullets.splice(i, 1)
      continue
    }

    // Check collision with asteroids
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const a = asteroids[j]
      if (b.mesh.position.distanceTo(a.mesh.position) < 2.0) {
        destroyAsteroid(a.mesh)
        scene.remove(b.mesh)
        bullets.splice(i, 1)
        break
      }
    }
  }
}