// Entity Component System - Entity definition
export type EntityID = number

export interface Entity {
  id: EntityID
  components: Set<string>
}

export class EntityManager {
  private entities = new Map<EntityID, Entity>()
  private nextId = 1

  createEntity(): Entity {
    const entity: Entity = {
      id: this.nextId++,
      components: new Set(),
    }
    this.entities.set(entity.id, entity)
    return entity
  }

  destroyEntity(id: EntityID): void {
    this.entities.delete(id)
  }

  getEntity(id: EntityID): Entity | undefined {
    return this.entities.get(id)
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }
}