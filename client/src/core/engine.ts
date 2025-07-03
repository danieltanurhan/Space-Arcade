import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const scene = new THREE.Scene()

export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

export const renderer = new THREE.WebGLRenderer({ antialias: true })

export const world = new CANNON.World()

export function initEngine(containerId: string = 'app') {
  // Renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000011)
  document.getElementById(containerId)?.appendChild(renderer.domElement)
  renderer.domElement.style.cursor = 'none'

  // Physics world
  world.gravity.set(0, 0, 0) // Space physics
  world.broadphase = new CANNON.NaiveBroadphase()

  // Camera
  camera.position.set(0, 10, 20)
  scene.add(camera)

  // Basic lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Resize handler
  window.addEventListener('resize', handleResize)
}

export function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}