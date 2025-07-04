package broadcast

import "space-arcade-server/internal/protocol"

// EntityDelta represents a subset of Entity fields that have changed.
// For simplicity, we use a generic map rather than defining a fully typed struct,
// allowing us to omit unchanged fields entirely to minimise payload size.
//
// Example JSON emitted:
//   {"id": 1, "position": [x,y,z], "velocity": [vx,vy,vz]}
//
type EntityDelta map[string]interface{}

type DeltaSnapshot struct {
    BaseSeq  uint32         `json:"baseSeq"`
    Changes  []EntityDelta  `json:"changes,omitempty"`
    Removed  []int          `json:"removed,omitempty"`
    Added    []protocol.Entity `json:"added,omitempty"`
}

// ComputeDelta produces lists compatible with the STATE_DELTA message between two entity slices.
// prevMap and currMap are maps of id -> Entity for quick lookup.
func ComputeDelta(prev, curr []protocol.Entity) (changed []EntityDelta, removed []int, added []protocol.Entity) {
    prevMap := make(map[int]protocol.Entity, len(prev))
    for _, e := range prev {
        prevMap[e.ID] = e
    }
    currMap := make(map[int]protocol.Entity, len(curr))
    for _, e := range curr {
        currMap[e.ID] = e
    }

    // Detect removed and changed
    for id, prevEnt := range prevMap {
        currEnt, exists := currMap[id]
        if !exists {
            removed = append(removed, id)
            continue
        }
        // Compare key fields; if any difference, produce delta
        delta := EntityDelta{"id": id}
        if prevEnt.X != currEnt.X || prevEnt.Y != currEnt.Y || prevEnt.Z != currEnt.Z {
            delta["position"] = [3]float64{currEnt.X, currEnt.Y, currEnt.Z}
        }
        if prevEnt.VX != currEnt.VX || prevEnt.VY != currEnt.VY || prevEnt.VZ != currEnt.VZ {
            delta["velocity"] = [3]float64{currEnt.VX, currEnt.VY, currEnt.VZ}
        }
        if prevEnt.HP != currEnt.HP {
            delta["health"] = currEnt.HP
        }
        if len(delta) > 1 { // id always present
            changed = append(changed, delta)
        }
    }

    // Detect added
    for id, currEnt := range currMap {
        if _, exists := prevMap[id]; !exists {
            added = append(added, currEnt)
        }
    }
    return
}