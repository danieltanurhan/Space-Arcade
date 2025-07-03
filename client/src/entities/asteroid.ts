import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { scene, world } from '../core/engine'
import * as gameState from '../state/gameState'
import { updateUI } from '../ui/hud'

export interface Asteroid {
  mesh: THREE.Mesh
  body: CANNON.Body
}

export const asteroids: Asteroid[] = []

export function createAsteroidField(count = 20) {
  for (let i = 0; i < count; i++) {
    const size = Math.random() * 2 + 1
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

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.1, 0.5, 0.3),
    })
    const asteroid = new THREE.Mesh(geometry, material)

    asteroid.position.set(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 100
    )

    asteroid.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )

    asteroid.castShadow = true
    asteroid.receiveShadow = true
    scene.add(asteroid)

    const shape = new CANNON.Sphere(size)
    const body = new CANNON.Body({ mass: size * 10 })
    body.addShape(shape)
    body.position.copy(asteroid.position as any)
    world.addBody(body)

    asteroids.push({ mesh: asteroid, body })
  }
}

export function destroyAsteroid(asteroidMesh: THREE.Mesh) {
  const index = asteroids.findIndex((a) => a.mesh === asteroidMesh)
  if (index === -1) return
  const asteroid = asteroids[index]
  scene.remove(asteroid.mesh)
  world.removeBody(asteroid.body)
  asteroids.splice(index, 1)

  gameState.stats.asteroidsDestroyed++
  gameState.stats.score += 10
  updateUI()

  console.log(`💥 Asteroid destroyed! Score: ${gameState.stats.score}`)
}

export function syncAsteroids() {
  asteroids.forEach((a) => {
    a.mesh.position.copy(a.body.position as any)
    a.mesh.quaternion.copy(a.body.quaternion as any)
  })
}