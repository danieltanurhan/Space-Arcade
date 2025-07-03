import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Game state
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const world = new CANNON.World()

// Game objects
const spaceships: THREE.Mesh[] = []
const asteroids: { mesh: THREE.Mesh; body: CANNON.Body }[] = []
let crosshair: THREE.LineSegments

// Stats
let score = 0
let asteroidsDestroyed = 0

// --- CONTROL CONSTANTS ---
const shipAcceleration = 10 // units/sec^2
const shipMaxSpeed = 18
const shipDamping = 0.995 // 1 = no friction, <1 = some friction
const angularDamping = 0.96 // for smooth rotation
const mouseSensitivity = 0.002 // tweak for feel

// --- CONTROL STATE ---
let shipVelocity = new THREE.Vector3(0, 0, 0)
let shipRotationX = 0 // Pitch (up/down)
let shipRotationY = 0 // Yaw (left/right)
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false
let moveUp = false, moveDown = false
let isPointerLocked = false

let bullets: { mesh: THREE.Mesh, velocity: THREE.Vector3, spawnTime: number }[] = []
const bulletSpeed = 30
const bulletLifetime = 5 // seconds
let lastShotTime = 0
const shootCooldown = 0.2 // seconds

function init() {
  // Setup renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000011)
  document.getElementById('app')?.appendChild(renderer.domElement)
  renderer.domElement.style.cursor = 'none'

  // Setup physics world
  world.gravity.set(0, 0, 0) // Space physics
  world.broadphase = new CANNON.NaiveBroadphase()

  // Setup camera
  camera.position.set(0, 10, 20)

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

  // Create crosshair
  createCrosshair()

  // Setup event listeners
  setupEventListeners()

  console.log('🚀 Space Arcade initialized!')
}

function createSpaceship() {
  const loader = new GLTFLoader();
  console.log('Loading ship model from /models/spaceship/ship1.glb...');
  
  loader.load(
    '/models/spaceship/ship1.glb', // path relative to public/
    (gltf) => {
      console.log('Ship model loaded successfully:', gltf);
      const ship = gltf.scene;
      ship.position.set(0, 0, 0);
      ship.scale.set(5, 5, 5); // Make it bigger
      ship.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(ship);
      spaceships.push(ship as any); // 'as any' to match spaceships type
      console.log('Ship added to scene and spaceships array');
    },
    (progress) => {
      console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading ship model:', error);
      // Fallback to cube if model fails to load
      console.log('Creating fallback cube ship...');
      const geometry = new THREE.BoxGeometry(2, 1, 4);
      const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      const spaceship = new THREE.Mesh(geometry, material);
      spaceship.position.set(0, 0, 0);
      spaceship.castShadow = true;
      scene.add(spaceship);
      spaceships.push(spaceship);
    }
  );
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

function createCrosshair() {
  const crosshairGeometry = new THREE.BufferGeometry();
  const crosshairMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  
  // Create a simple crosshair shape
  const points = [
    // Horizontal line
    new THREE.Vector3(-0.5, 0, 0),
    new THREE.Vector3(0.5, 0, 0),
    // Vertical line
    new THREE.Vector3(0, -0.5, 0),
    new THREE.Vector3(0, 0.5, 0),
  ];
  
  crosshairGeometry.setFromPoints(points);
  crosshair = new THREE.LineSegments(crosshairGeometry, crosshairMaterial);
  scene.add(crosshair);
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  // Pointer lock events
  document.addEventListener('pointerlockchange', onPointerLockChange)
  document.addEventListener('pointerlockerror', onPointerLockError)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onMouseDown(event: MouseEvent) {
  if (event.button === 0) {
    // Try to lock pointer on first click
    if (!isPointerLocked) {
      renderer.domElement.requestPointerLock()
      return
    }
    shootBullet()
  }
}

function onMouseMove(event: MouseEvent) {
  // Only handle mouse movement when pointer is locked
  if (!isPointerLocked) return
  
  const dx = event.movementX || 0
  const dy = event.movementY || 0
  // Update rotation angles (infinite rotation)
  shipRotationY -= dx * mouseSensitivity
  shipRotationX -= dy * mouseSensitivity
}

function onKeyDown(event: KeyboardEvent) {
  switch (event.code) {
    case 'KeyW': moveForward = true; break
    case 'KeyS': moveBackward = true; break
    case 'KeyA': moveLeft = true; break
    case 'KeyD': moveRight = true; break
    case 'Space': moveUp = true; break
    case 'ControlLeft':
    case 'ControlRight': moveDown = true; break
    case 'Escape':
      // Unlock pointer on Escape
      if (isPointerLocked) {
        document.exitPointerLock()
      }
      break
  }
}

function onKeyUp(event: KeyboardEvent) {
  switch (event.code) {
    case 'KeyW': moveForward = false; break
    case 'KeyS': moveBackward = false; break
    case 'KeyA': moveLeft = false; break
    case 'KeyD': moveRight = false; break
    case 'Space': moveUp = false; break
    case 'ControlLeft':
    case 'ControlRight': moveDown = false; break
  }
}

function shootBullet() {
  const now = performance.now() / 1000
  if (now - lastShotTime < shootCooldown) return
  lastShotTime = now
  const ship = spaceships[0]
  const dir = new THREE.Vector3(0, 0, -1)
  dir.applyQuaternion(ship.quaternion)
  // Create laser beam geometry (thin cylinder)
  const bulletGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8)
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const bullet = new THREE.Mesh(bulletGeo, bulletMat)
  
  // Position bullet at ship's position
  bullet.position.copy(ship.position)
  
  // Orient bullet to point in direction of travel
  const bulletDirection = dir.clone().normalize()
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bulletDirection)
  
  scene.add(bullet)
  // Bullet velocity = base + ship's current velocity
  const bulletVel = dir.clone().multiplyScalar(bulletSpeed).add(shipVelocity.clone())
  bullets.push({ mesh: bullet, velocity: bulletVel, spawnTime: now })
}

function updateSpaceship(dt: number) {
  const ship = spaceships[0]
  // --- ROTATION (camera-relative, no flipping) ---
  // Create rotation quaternion from accumulated angles
  const rotationQuat = new THREE.Quaternion()
  rotationQuat.setFromEuler(new THREE.Euler(shipRotationX, shipRotationY, 0, 'YXZ'))
  ship.quaternion.copy(rotationQuat)

  // --- TRANSLATION (WASD/Space/Ctrl) ---
  const accel = new THREE.Vector3()
  if (moveForward) accel.z -= 1
  if (moveBackward) accel.z += 1
  if (moveLeft) accel.x -= 1
  if (moveRight) accel.x += 1
  if (moveUp) accel.y += 1
  if (moveDown) accel.y -= 1
  if (accel.lengthSq() > 0) {
    accel.normalize()
    accel.applyQuaternion(ship.quaternion)
    accel.multiplyScalar(shipAcceleration * dt)
    shipVelocity.add(accel)
  }
  // Clamp speed
  if (shipVelocity.length() > shipMaxSpeed) {
    shipVelocity.setLength(shipMaxSpeed)
  }
  // Apply damping
  shipVelocity.multiplyScalar(shipDamping)
  // Update position
  ship.position.add(shipVelocity.clone().multiplyScalar(dt))
}

function updateBullets(dt: number) {
  const now = performance.now() / 1000
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.mesh.position.add(b.velocity.clone().multiplyScalar(dt))
    // Lifetime
    if (now - b.spawnTime > bulletLifetime) {
      scene.remove(b.mesh)
      bullets.splice(i, 1)
      continue
    }
    // Collision with asteroids
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const a = asteroids[j]
      // Increase hitbox radius for easier hits
      if (b.mesh.position.distanceTo(a.mesh.position) < 2.0) {
        destroyAsteroid(a.mesh)
        scene.remove(b.mesh)
        bullets.splice(i, 1)
        break
      }
    }
  }
}

function updateCamera() {
  const ship = spaceships[0]
  // Get ship's forward direction (where it's aiming)
  const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion)
  
  // Calculate camera position behind and above the ship
  const cameraDistance = 14
  const cameraHeight = 6
  const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraDistance)
  
  // Apply ship's pitch and yaw to camera offset, but keep it upright
  const shipEuler = new THREE.Euler().setFromQuaternion(ship.quaternion, 'YXZ')
  const cameraRotation = new THREE.Euler(shipEuler.x, shipEuler.y, 0, 'YXZ')
  cameraOffset.applyEuler(cameraRotation)
  
  camera.position.copy(ship.position.clone().add(cameraOffset))
  
  // Look at ship
  camera.lookAt(ship.position)
  
  // Update crosshair position to show where ship is aiming
  if (crosshair) {
    const aimDistance = 20; // Distance in front of ship
    const aimDirection = new THREE.Vector3(0, 0, -1);
    aimDirection.applyQuaternion(ship.quaternion);
    crosshair.position.copy(ship.position.clone().add(aimDirection.multiplyScalar(aimDistance)));
    crosshair.lookAt(camera.position); // Make crosshair face camera
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
  const dt = 1/60
  world.step(dt)
  asteroids.forEach(asteroid => {
    asteroid.mesh.position.copy(asteroid.body.position as any)
    asteroid.mesh.quaternion.copy(asteroid.body.quaternion as any)
  })
  updateSpaceship(dt)
  updateBullets(dt)
  updateCamera()
  renderer.render(scene, camera)
}

// Initialize and start the game
init()
animate()
updateUI()

console.log('🎮 Space Arcade loading...')

function onPointerLockChange() {
  isPointerLocked = document.pointerLockElement === renderer.domElement
  console.log('Pointer lock:', isPointerLocked ? 'locked' : 'unlocked')
}

function onPointerLockError() {
  console.error('Pointer lock failed')
}