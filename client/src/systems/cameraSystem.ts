import * as THREE from 'three'
import { camera, scene } from '../core/engine'
import { spaceships } from '../entities/spaceship'
import { cameraDistance, cameraHeight, aimDistance } from '../config/constants'

let crosshair: THREE.LineSegments | undefined

export function createCrosshair() {
  const geometry = new THREE.BufferGeometry()
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 })
  const points = [
    new THREE.Vector3(-0.5, 0, 0),
    new THREE.Vector3(0.5, 0, 0),
    new THREE.Vector3(0, -0.5, 0),
    new THREE.Vector3(0, 0.5, 0),
  ]
  geometry.setFromPoints(points)
  crosshair = new THREE.LineSegments(geometry, material)
  scene.add(crosshair)
}

export function updateCamera() {
  if (spaceships.length === 0) return
  const ship = spaceships[0]

  const shipEuler = new THREE.Euler().setFromQuaternion(ship.quaternion, 'YXZ')
  const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraDistance)
  const cameraRotation = new THREE.Euler(shipEuler.x, shipEuler.y, 0, 'YXZ')
  cameraOffset.applyEuler(cameraRotation)

  camera.position.copy(ship.position.clone().add(cameraOffset))
  camera.lookAt(ship.position)

  if (crosshair) {
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion)
    crosshair.position.copy(ship.position.clone().add(direction.multiplyScalar(aimDistance)))
    crosshair.lookAt(camera.position)
  }
}