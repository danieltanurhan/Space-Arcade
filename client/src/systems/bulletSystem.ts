import * as THREE from 'three'
import { scene } from '../core/engine'
import {
  bulletSpeed,
  bulletLifetime,
  shootCooldown,
} from '../config/constants'
import { spaceships, shipVelocity } from '../entities/spaceship'
import { asteroids, destroyAsteroid } from '../entities/asteroid'

export interface Bullet {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spawnTime: number
}

const bullets: Bullet[] = []
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
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.mesh.position.add(b.velocity.clone().multiplyScalar(dt))

    if (now - b.spawnTime > bulletLifetime) {
      scene.remove(b.mesh)
      bullets.splice(i, 1)
      continue
    }

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