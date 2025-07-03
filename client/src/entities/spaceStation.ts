import * as THREE from 'three'
import { scene } from '../core/engine'

export interface SpaceStationModule {
  mesh: THREE.Mesh
  type: 'core' | 'arm' | 'docking_bay' | 'solar_panel' | 'communication' | 'utility'
}

export const spaceStationModules: SpaceStationModule[] = []

export function createSpaceStation() {
  const stationGroup = new THREE.Group()
  
  // Central core - main sphere
  const coreGeometry = new THREE.SphereGeometry(8, 16, 12)
  const coreMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x888888,
    shininess: 30
  })
  const core = new THREE.Mesh(coreGeometry, coreMaterial)
  core.castShadow = true
  core.receiveShadow = true
  stationGroup.add(core)
  spaceStationModules.push({ mesh: core, type: 'core' })
  
  // Create 6 arms extending outward
  const armConfigs = [
    { direction: new THREE.Vector3(1, 0, 0), hasModule: 'docking_bay' },
    { direction: new THREE.Vector3(-1, 0, 0), hasModule: 'docking_bay' },
    { direction: new THREE.Vector3(0, 1, 0), hasModule: 'solar_panel' },
    { direction: new THREE.Vector3(0, -1, 0), hasModule: 'solar_panel' },
    { direction: new THREE.Vector3(0, 0, 1), hasModule: 'communication' },
    { direction: new THREE.Vector3(0, 0, -1), hasModule: 'utility' }
  ]
  
  armConfigs.forEach(config => {
    // Create connecting arm
    const armGeometry = new THREE.CylinderGeometry(1.5, 1.5, 12, 8)
    const armMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x666666,
      shininess: 20
    })
    const arm = new THREE.Mesh(armGeometry, armMaterial)
    
    // Position and orient the arm
    const armPosition = config.direction.clone().multiplyScalar(15)
    arm.position.copy(armPosition)
    
    // Rotate arm to point outward
    if (config.direction.x !== 0) {
      arm.rotation.z = Math.PI / 2
    } else if (config.direction.z !== 0) {
      arm.rotation.x = Math.PI / 2
    }
    
    arm.castShadow = true
    arm.receiveShadow = true
    stationGroup.add(arm)
    spaceStationModules.push({ mesh: arm, type: 'arm' })
    
    // Create end module based on config
    const endPosition = config.direction.clone().multiplyScalar(25)
    
    switch (config.hasModule) {
      case 'docking_bay':
        createDockingBay(stationGroup, endPosition)
        break
      case 'solar_panel':
        createSolarPanel(stationGroup, endPosition, config.direction)
        break
      case 'communication':
        createCommunicationDish(stationGroup, endPosition)
        break
      case 'utility':
        createUtilityModule(stationGroup, endPosition)
        break
    }
  })
  
  // Add some detail lights
  addStationLights(stationGroup)
  
  // Position the entire station at origin
  stationGroup.position.set(0, 0, 0)
  scene.add(stationGroup)
  
  console.log('🏢 Space Station constructed at origin (0,0,0)')
}

function createDockingBay(parent: THREE.Group, position: THREE.Vector3) {
  const bayGeometry = new THREE.BoxGeometry(8, 8, 6)
  const bayMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x444444,
    shininess: 40
  })
  const bay = new THREE.Mesh(bayGeometry, bayMaterial)
  bay.position.copy(position)
  bay.castShadow = true
  bay.receiveShadow = true
  parent.add(bay)
  spaceStationModules.push({ mesh: bay, type: 'docking_bay' })
  
  // Add docking lights
  const lightGeometry = new THREE.SphereGeometry(0.3, 8, 6)
  const lightMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00
  })
  
  for (let i = 0; i < 4; i++) {
    const light = new THREE.Mesh(lightGeometry, lightMaterial)
    const angle = (i / 4) * Math.PI * 2
    light.position.copy(position).add(new THREE.Vector3(
      Math.cos(angle) * 4.5,
      Math.sin(angle) * 4.5,
      3.5
    ))
    parent.add(light)
  }
}

function createSolarPanel(parent: THREE.Group, position: THREE.Vector3, direction: THREE.Vector3) {
  // Main panel structure
  const panelGeometry = new THREE.BoxGeometry(12, 12, 0.5)
  const panelMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x002244,
    shininess: 100,
    specular: 0x446688
  })
  const panel = new THREE.Mesh(panelGeometry, panelMaterial)
  panel.position.copy(position)
  
  // Orient panel perpendicular to arm direction
  if (direction.y > 0) {
    panel.rotation.x = Math.PI / 2
  } else if (direction.y < 0) {
    panel.rotation.x = -Math.PI / 2
  }
  
  panel.castShadow = true
  panel.receiveShadow = true
  parent.add(panel)
  spaceStationModules.push({ mesh: panel, type: 'solar_panel' })
  
  // Add grid pattern for detail
  const gridMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x004488,
    transparent: true,
    opacity: 0.8
  })
  
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      const cellGeometry = new THREE.BoxGeometry(2, 2, 0.1)
      const cell = new THREE.Mesh(cellGeometry, gridMaterial)
      cell.position.copy(panel.position)
      cell.position.add(new THREE.Vector3(x * 2.5, y * 2.5, 0.3))
      cell.rotation.copy(panel.rotation)
      parent.add(cell)
    }
  }
}

function createCommunicationDish(parent: THREE.Group, position: THREE.Vector3) {
  // Dish base
  const baseGeometry = new THREE.CylinderGeometry(2, 3, 4, 8)
  const baseMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x555555,
    shininess: 20
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.copy(position)
  base.castShadow = true
  base.receiveShadow = true
  parent.add(base)
  
  // Dish itself
  const dishGeometry = new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  const dishMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xaaaaaa,
    shininess: 60,
    side: THREE.DoubleSide
  })
  const dish = new THREE.Mesh(dishGeometry, dishMaterial)
  dish.position.copy(position).add(new THREE.Vector3(0, 0, 6))
  dish.rotation.x = Math.PI // Face upward
  dish.castShadow = true
  dish.receiveShadow = true
  parent.add(dish)
  spaceStationModules.push({ mesh: dish, type: 'communication' })
  
  // Central receiver
  const receiverGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8)
  const receiverMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffff00
  })
  const receiver = new THREE.Mesh(receiverGeometry, receiverMaterial)
  receiver.position.copy(position).add(new THREE.Vector3(0, 0, 3))
  parent.add(receiver)
}

function createUtilityModule(parent: THREE.Group, position: THREE.Vector3) {
  const moduleGeometry = new THREE.BoxGeometry(6, 6, 6)
  const moduleMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x666666,
    shininess: 30
  })
  const module = new THREE.Mesh(moduleGeometry, moduleMaterial)
  module.position.copy(position)
  module.castShadow = true
  module.receiveShadow = true
  parent.add(module)
  spaceStationModules.push({ mesh: module, type: 'utility' })
  
  // Add some utility details (pipes, vents)
  const pipeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 6)
  const pipeMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 })
  
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial)
    pipe.position.copy(position).add(new THREE.Vector3(
      (i - 1) * 2,
      0,
      4
    ))
    pipe.rotation.x = Math.PI / 2
    parent.add(pipe)
  }
}

function addStationLights(parent: THREE.Group) {
  // Add ambient lighting around the station
  const lightPositions = [
    new THREE.Vector3(10, 10, 10),
    new THREE.Vector3(-10, 10, 10),
    new THREE.Vector3(10, -10, 10),
    new THREE.Vector3(-10, -10, 10)
  ]
  
  lightPositions.forEach(pos => {
    const pointLight = new THREE.PointLight(0xffffff, 0.3, 50)
    pointLight.position.copy(pos)
    pointLight.castShadow = true
    parent.add(pointLight)
    
    // Add visible light source
    const lightGeometry = new THREE.SphereGeometry(0.5, 8, 6)
    const lightMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffdd
    })
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial)
    lightMesh.position.copy(pos)
    parent.add(lightMesh)
  })
}

export function isNearSpaceStation(position: THREE.Vector3, threshold: number = 40): boolean {
  return position.distanceTo(new THREE.Vector3(0, 0, 0)) < threshold
}