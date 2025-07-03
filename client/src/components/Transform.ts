import * as THREE from 'three'

export interface Transform {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
}

export function createTransform(
  position = new THREE.Vector3(),
  rotation = new THREE.Euler(),
  scale = new THREE.Vector3(1, 1, 1)
): Transform {
  return { position, rotation, scale }
}