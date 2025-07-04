import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { scene } from '../core/engine'
import { shipAcceleration, shipMaxSpeed, shipDamping } from '../config/constants'
import { inputState } from '../controls/input'

export const spaceships: THREE.Object3D[] = []
export const spaceshipById: Map<number, THREE.Object3D> = new Map()
export let shipVelocity = new THREE.Vector3()

export interface ServerSpaceshipEntity {
  id: number
  clientId?: number
  x: number
  y: number
  z: number
  qx?: number
  qy?: number
  qz?: number
  qw?: number
}

/**
 * Sync (add/update/remove) spaceship meshes so they match the authoritative
 * list from the server. Local player ship (index 0) is excluded from removal
 * but its position is corrected.
 */
export function syncSpaceshipsFromServer(serverShips: ServerSpaceshipEntity[]) {
  const seen = new Set<number>()

  serverShips.forEach((s) => {
    const existing = spaceshipById.get(s.id)
    let mesh: THREE.Object3D

    if (!existing) {
      // Create a simple placeholder mesh (box) for remote ship
      const geometry = new THREE.BoxGeometry(2, 1, 4)
      const material = new THREE.MeshPhongMaterial({ color: 0x3399ff })
      mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      spaceships.push(mesh)
      spaceshipById.set(s.id, mesh)
    } else {
      mesh = existing
    }

    // Update transform
    mesh.position.set(s.x, s.y, s.z)
    if (s.qx !== undefined) {
      mesh.quaternion.set(s.qx, s.qy ?? 0, s.qz ?? 0, s.qw ?? 1)
    }

    seen.add(s.id)
  })

  // Remove ships that disappeared (excluding index 0 which we assume is local)
  for (const [id, mesh] of [...spaceshipById.entries()]) {
    if (!seen.has(id)) {
      scene.remove(mesh)
      spaceshipById.delete(id)
      const idx = spaceships.indexOf(mesh)
      if (idx !== -1 && idx !== 0) spaceships.splice(idx, 1)
    }
  }
}

export function createSpaceship() {
  const loader = new GLTFLoader()
  loader.load(
    '/models/spaceship/ship1.glb',
    (gltf) => {
      const ship = gltf.scene
      ship.position.set(0, 0, 0)
      ship.scale.set(5, 5, 5)
      ship.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      scene.add(ship)
      spaceships.push(ship)
    },
    undefined,
    (error) => {
      console.error('Error loading ship model:', error)
      const geometry = new THREE.BoxGeometry(2, 1, 4)
      const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
      const fallback = new THREE.Mesh(geometry, material)
      fallback.position.set(0, 0, 0)
      fallback.castShadow = true
      scene.add(fallback)
      spaceships.push(fallback)
    }
  )
}

export function updateSpaceship(dt: number) {
  if (spaceships.length === 0) return
  const ship = spaceships[0]

  // Rotation
  const rotationQuat = new THREE.Quaternion()
  rotationQuat.setFromEuler(
    new THREE.Euler(inputState.shipRotationX, inputState.shipRotationY, 0, 'YXZ')
  )
  ship.quaternion.copy(rotationQuat)

  // Translation
  const accel = new THREE.Vector3()
  if (inputState.moveForward) accel.z -= 1
  if (inputState.moveBackward) accel.z += 1
  if (inputState.moveLeft) accel.x -= 1
  if (inputState.moveRight) accel.x += 1
  if (inputState.moveUp) accel.y += 1
  if (inputState.moveDown) accel.y -= 1

  if (accel.lengthSq() > 0) {
    accel.normalize()
    accel.applyQuaternion(ship.quaternion)
    accel.multiplyScalar(shipAcceleration * dt)
    shipVelocity.add(accel)
  }

  if (shipVelocity.length() > shipMaxSpeed) shipVelocity.setLength(shipMaxSpeed)
  shipVelocity.multiplyScalar(shipDamping)
  ship.position.add(shipVelocity.clone().multiplyScalar(dt))
}