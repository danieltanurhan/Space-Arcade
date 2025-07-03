import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Game state
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const world = new CANNON.World()

// Controls
let controls: OrbitControls

// Game objects
const spaceships: THREE.Mesh[] = []
const asteroids: { mesh: THREE.Mesh; body: CANNON.Body }[] = []

// Stats
let score = 0
let asteroidsDestroyed = 0

function init() {
  // Setup renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000011)
  document.getElementById('app')?.appendChild(renderer.domElement)

  // Setup physics world
  world.gravity.set(0, 0, 0) // Space physics
  world.broadphase = new CANNON.NaiveBroadphase()

  // Setup camera
  camera.position.set(0, 10, 20)
  
  // Setup controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Create placeholder cube spaceship (Milestone 0 requirement)
  createSpaceship()

  // Create asteroid field
  createAsteroidField()

  // Setup event listeners
  setupEventListeners()

  console.log('🚀 Space Arcade initialized!')
}

function createSpaceship() {
  // Placeholder cube spaceship as per Milestone 0
  const geometry = new THREE.BoxGeometry(2, 1, 4)
  const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
  const spaceship = new THREE.Mesh(geometry, material)
  spaceship.position.set(0, 0, 0)
  spaceship.castShadow = true
  scene.add(spaceship)
  spaceships.push(spaceship)
}

function createAsteroidField() {
  // Create 20 procedural asteroids as mentioned in Milestone 1
  for (let i = 0; i < 20; i++) {
    const size = Math.random() * 2 + 1
    const geometry = new THREE.IcosahedronGeometry(size, 1)
    
    // Randomize vertices for irregular shape
    const vertices = geometry.attributes.position.array
    for (let j = 0; j < vertices.length; j += 3) {
      vertices[j] += (Math.random() - 0.5) * 0.5
      vertices[j + 1] += (Math.random() - 0.5) * 0.5
      vertices[j + 2] += (Math.random() - 0.5) * 0.5
    }
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()

    const material = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color().setHSL(0.1, 0.5, 0.3) 
    })
    const asteroid = new THREE.Mesh(geometry, material)
    
    // Random position in space
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

    // Physics body
    const shape = new CANNON.Sphere(size)
    const body = new CANNON.Body({ mass: size * 10 })
    body.addShape(shape)
    body.position.copy(asteroid.position as any)
    world.addBody(body)

    asteroids.push({ mesh: asteroid, body })
  }
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('click', onMouseClick)
  
  // Keyboard controls (to be expanded in Milestone 1)
  window.addEventListener('keydown', onKeyDown)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onMouseClick(event: MouseEvent) {
  // Basic raycast shooting (to be expanded in Milestone 1)
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  
  const asteroidMeshes = asteroids.map(a => a.mesh)
  const intersects = raycaster.intersectObjects(asteroidMeshes)
  
  if (intersects.length > 0) {
    const hit = intersects[0]
    destroyAsteroid(hit.object as THREE.Mesh)
  }
}

function onKeyDown(event: KeyboardEvent) {
  // Placeholder for WASD controls (Milestone 1)
  switch (event.code) {
    case 'KeyW':
      console.log('Forward thrust')
      break
    case 'KeyS':
      console.log('Reverse thrust')
      break
    case 'KeyA':
      console.log('Turn left')
      break
    case 'KeyD':
      console.log('Turn right')
      break
  }
}

function destroyAsteroid(asteroidMesh: THREE.Mesh) {
  const asteroidIndex = asteroids.findIndex(a => a.mesh === asteroidMesh)
  if (asteroidIndex !== -1) {
    const asteroid = asteroids[asteroidIndex]
    
    // Remove from scene and physics world
    scene.remove(asteroid.mesh)
    world.removeBody(asteroid.body)
    asteroids.splice(asteroidIndex, 1)
    
    // Update score
    asteroidsDestroyed++
    score += 10
    updateUI()
    
    console.log(`💥 Asteroid destroyed! Score: ${score}`)
  }
}

function updateUI() {
  const statsElement = document.getElementById('stats')
  if (statsElement) {
    statsElement.innerHTML = `
      Score: ${score}<br>
      Asteroids Destroyed: ${asteroidsDestroyed}<br>
      Asteroids Remaining: ${asteroids.length}
    `
  }
}

function animate() {
  requestAnimationFrame(animate)
  
  // Update physics
  world.step(1/60)
  
  // Sync physics bodies with meshes
  asteroids.forEach(asteroid => {
    asteroid.mesh.position.copy(asteroid.body.position as any)
    asteroid.mesh.quaternion.copy(asteroid.body.quaternion as any)
  })
  
  // Update controls
  controls.update()
  
  // Render
  renderer.render(scene, camera)
}

// Initialize and start the game
init()
animate()
updateUI()

console.log('🎮 Space Arcade loading...')