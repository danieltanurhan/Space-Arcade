import * as THREE from 'three'
import { scene } from '../core/engine'

interface NetEntity {
  id: number
  type: string
  mesh: THREE.Object3D
}

export class RemoteEntityManager {
  private entities: Map<number, NetEntity> = new Map()

  applyFullState(state: any) {
    const ids = new Set<number>()
    state.data.entities.forEach((e: any) => {
      ids.add(e.id)
      if (this.entities.has(e.id)) {
        this.updateEntity(e)
      } else {
        this.addEntity(e)
      }
    })
    // Remove entities not present
    for (const id of this.entities.keys()) {
      if (!ids.has(id)) {
        this.removeEntity(id)
      }
    }
  }

  applyDelta(delta: any) {
    delta.data.removed?.forEach((id: number) => this.removeEntity(id))
    delta.data.added?.forEach((e: any) => this.addEntity(e))
    delta.data.changes?.forEach((c: any) => this.patchEntity(c))
  }

  private addEntity(e: any) {
    const mesh = this.createMesh(e)
    mesh.position.set(e.position?.[0] ?? e.x, e.position?.[1] ?? e.y, e.position?.[2] ?? e.z)
    scene.add(mesh)
    this.entities.set(e.id, { id: e.id, type: e.type, mesh })
  }

  private updateEntity(e: any) {
    const ent = this.entities.get(e.id)
    if (!ent) return
    ent.mesh.position.set(e.position?.[0] ?? e.x, e.position?.[1] ?? e.y, e.position?.[2] ?? e.z)
  }

  private patchEntity(change: any) {
    const ent = this.entities.get(change.id)
    if (!ent) return
    if (change.position) {
      ent.mesh.position.set(change.position[0], change.position[1], change.position[2])
    }
  }

  private removeEntity(id: number) {
    const ent = this.entities.get(id)
    if (!ent) return
    scene.remove(ent.mesh)
    this.entities.delete(id)
  }

  private createMesh(e: any): THREE.Object3D {
    switch (e.type) {
      case 'asteroid': {
        const geom = new THREE.IcosahedronGeometry(1)
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })
        const mesh = new THREE.Mesh(geom, mat)
        const size = e.size ?? 1
        mesh.scale.setScalar(size)
        return mesh
      }
      case 'spaceship': {
        const geom = new THREE.ConeGeometry(0.5, 1.5, 8)
        const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff })
        return new THREE.Mesh(geom, mat)
      }
      case 'mineral_chunk': {
        const geom = new THREE.BoxGeometry(0.3, 0.3, 0.3)
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00 })
        return new THREE.Mesh(geom, mat)
      }
      default: {
        const geom = new THREE.SphereGeometry(0.5)
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff })
        return new THREE.Mesh(geom, mat)
      }
    }
  }
}