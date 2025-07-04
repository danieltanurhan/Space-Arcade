# 🌐 Network Architecture Design

## Overview

This document outlines the comprehensive network architecture for Space Arcade's multiplayer implementation. The design prioritizes **server authority**, **client prediction**, and **smooth synchronization** for a responsive cooperative experience.

## Architecture Principles

### 1. **Authoritative Server**
- Server maintains the single source of truth for all game state
- All game logic and physics simulation run on server
- Clients are primarily rendering and input devices

### 2. **Client-Side Prediction**
- Clients immediately respond to local input for responsiveness
- Server validates and corrects client predictions
- Smooth interpolation between predicted and authoritative states

### 3. **Lag Compensation**
- Server rewinds state for hit detection
- Client reconciliation handles prediction errors
- Interpolation smooths visual inconsistencies

### 4. **Cooperative Design**
- Low-latency requirements (< 100ms ideal)
- Shared world state for all players
- Synchronized events (asteroid destruction, resource collection)

## Network Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        SPACE ARCADE HUB                         │
│                      (Authoritative Server)                     │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Lobby Alpha   │  │   Lobby Beta    │  │   Lobby Gamma   │ │
│  │   (2 Players)   │  │   (4 Players)   │  │   (2 Players)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                        WebSocket Connections
                                │
    ┌───────────────────────────────────────────────────────────┐
    │                                                           │
    ▼                           ▼                               ▼
┌─────────┐                 ┌─────────┐                   ┌─────────┐
│Client A │                 │Client B │                   │Client C │
│(Shooter)│                 │(Hauler) │                   │(Shooter)│
└─────────┘                 └─────────┘                   └─────────┘
```

## Server Architecture

### Core Components

#### 1. **Game Hub**
```go
type GameHub struct {
    lobbies      map[string]*Lobby
    clients      map[*Client]bool
    register     chan *Client
    unregister   chan *Client
    broadcast    chan []byte
}
```

#### 2. **Lobby Manager**
```go
type Lobby struct {
    id           string
    clients      map[*Client]bool
    world        *World
    physics      *PhysicsWorld
    tickRate     time.Duration  // 60Hz
    broadcastRate time.Duration  // 15Hz
    lastTick     time.Time
}
```

#### 3. **Authoritative World**
```go
type World struct {
    entities     map[uint32]*Entity
    spaceships   map[uint32]*Spaceship
    asteroids    map[uint32]*Asteroid
    bullets      map[uint32]*Bullet
    minerals     map[uint32]*MineralChunk
    station      *SpaceStation
    nextEntityId uint32
}
```

#### 4. **Physics Engine**
```go
type PhysicsWorld struct {
    cannonWorld  *cannon.World
    bodies       map[uint32]*cannon.Body
    contacts     []Contact
    stepSize     float64  // 1/60s
}
```

### Server Game Loop

```
Every 16.67ms (60Hz):
┌─────────────────────────────────────────────────────────────────┐
│ 1. Process Input Messages                                       │
│    - Apply player inputs to ship entities                      │
│    - Validate input constraints and limits                     │
│    - Update input sequence numbers                             │
│                                                                │
│ 2. Run Physics Simulation                                      │
│    - Step physics world forward                                │
│    - Detect collisions and handle responses                    │
│    - Update entity positions and velocities                    │
│                                                                │
│ 3. Process Game Logic                                          │
│    - Handle bullet-asteroid collisions                         │
│    - Process resource collection                               │
│    - Update entity states (health, energy, etc.)              │
│                                                                │
│ 4. Cleanup and Maintenance                                     │
│    - Remove expired entities (bullets, mineral chunks)         │
│    - Update entity interpolation history                       │
│    - Prepare state for broadcasting                            │
└─────────────────────────────────────────────────────────────────┘

Every 66.67ms (15Hz):
┌─────────────────────────────────────────────────────────────────┐
│ 5. Broadcast State Updates                                      │
│    - Create delta snapshots for each client                    │
│    - Send only changed entities since last broadcast           │
│    - Include sequence numbers for reconciliation               │
└─────────────────────────────────────────────────────────────────┘
```

## Client Architecture

### Core Components

#### 1. **Network Manager**
```typescript
class NetworkManager {
    private socket: WebSocket
    private sequenceNumber: number
    private serverSequence: number
    private inputBuffer: InputMessage[]
    private stateHistory: ServerState[]
    private reconciliation: ReconciliationManager
}
```

#### 2. **Client Prediction**
```typescript
class PredictionSystem {
    private predictedState: LocalState
    private inputSequence: number
    private pendingInputs: InputMessage[]
    private lastServerState: ServerState
}
```

#### 3. **Entity Interpolation**
```typescript
class InterpolationSystem {
    private entities: Map<EntityId, InterpolatedEntity>
    private renderDelay: number  // 100ms
    private snapshots: ServerState[]
}
```

### Client Game Loop

```
Every 16.67ms (60Hz):
┌─────────────────────────────────────────────────────────────────┐
│ 1. Process Input                                                │
│    - Capture player input (WASD, mouse, shoot)                 │
│    - Apply input immediately to predicted state                │
│    - Send input to server with sequence number                 │
│                                                                │
│ 2. Client Prediction                                           │
│    - Simulate physics locally for responsive movement          │
│    - Predict bullet trajectories and collisions               │
│    - Update predicted positions and states                     │
│                                                                │
│ 3. Server Reconciliation                                       │
│    - Compare server state with predicted state                 │
│    - Replay inputs from mismatch point forward                 │
│    - Smooth corrections with interpolation                     │
│                                                                │
│ 4. Entity Interpolation                                        │
│    - Interpolate remote entities between server snapshots      │
│    - Apply lag compensation for visual consistency             │
│    - Update render positions for smooth movement               │
│                                                                │
│ 5. Render Frame                                                │
│    - Render predicted local state                              │
│    - Render interpolated remote entities                       │
│    - Update UI with latest synchronized data                   │
└─────────────────────────────────────────────────────────────────┘
```

## Message Protocol

### Message Categories

#### 1. **Connection Messages**
```json
// Client → Server
{"type": "JOIN", "lobby": "alpha-field-01", "role": "shooter"}
{"type": "LEAVE"}

// Server → Client
{"type": "JOINED", "clientId": 123, "lobbyState": {...}}
{"type": "PLAYER_JOINED", "clientId": 456, "role": "hauler"}
{"type": "PLAYER_LEFT", "clientId": 456}
```

#### 2. **Input Messages**
```json
// Client → Server (15Hz)
{
    "type": "INPUT",
    "seq": 42,
    "timestamp": 1234567890,
    "actions": {
        "movement": {"x": 0.8, "y": 0.2, "z": -0.5},
        "rotation": {"pitch": -0.1, "yaw": 0.3},
        "shoot": true,
        "ability": "tractor_beam"
    }
}
```

#### 3. **State Messages**
```json
// Server → Client (15Hz)
{
    "type": "STATE",
    "seq": 420,
    "timestamp": 1234567890,
    "entities": [
        {
            "id": 1,
            "type": "spaceship",
            "clientId": 123,
            "position": [10.5, 2.3, -15.2],
            "velocity": [0.1, 0.0, -5.0],
            "quaternion": [0.0, 0.707, 0.0, 0.707],
            "health": 100,
            "energy": 85
        }
    ]
}
```

#### 4. **Event Messages**
```json
// Server → Client (as events occur)
{
    "type": "ENTITY_SPAWN",
    "entity": {
        "id": 999,
        "type": "mineral_chunk",
        "position": [5.0, 0.0, -10.0],
        "mineralType": "rare_metals",
        "purity": 0.85
    }
}

{
    "type": "ENTITY_DESTROY",
    "entityId": 150,
    "reason": "collision"
}

{
    "type": "WORLD_EVENT",
    "event": "asteroid_destroyed",
    "data": {
        "asteroidId": 150,
        "destroyerId": 123,
        "spawnedChunks": [999, 1000, 1001]
    }
}
```

## Entity Synchronization Strategy

### 1. **Spaceships (Critical)**
- **Frequency**: Every state update (15Hz)
- **Prediction**: Full client prediction with server reconciliation
- **Interpolation**: Smooth interpolation for remote players
- **Data**: Position, velocity, quaternion, health, energy, role-specific states

### 2. **Bullets (High Priority)**
- **Frequency**: Spawn/destroy events + periodic updates
- **Prediction**: Client-side trajectory prediction
- **Interpolation**: Linear interpolation between snapshots
- **Data**: Position, velocity, owner, damage, spawn time

### 3. **Asteroids (Medium Priority)**
- **Frequency**: Initial spawn + destruction events
- **Prediction**: No client prediction (server authority)
- **Interpolation**: Smooth rotation interpolation
- **Data**: Position, quaternion, size, health, mineral composition

### 4. **Mineral Chunks (Medium Priority)**
- **Frequency**: Spawn/destroy events + physics updates
- **Prediction**: No client prediction (server authority)
- **Interpolation**: Physics-based interpolation
- **Data**: Position, velocity, type, purity, mass

### 5. **Space Station (Low Priority)**
- **Frequency**: Once on join (static)
- **Prediction**: Not applicable
- **Interpolation**: Not applicable
- **Data**: Position, modules, services, availability

## Performance Optimization

### 1. **Delta Compression**
- Only send changed entity data
- Compress common fields (position deltas)
- Use bit flags for boolean states

### 2. **Interest Management**
- Spatial partitioning for entity visibility
- Distance-based update frequency
- Culling for out-of-range entities

### 3. **Bandwidth Management**
- **Critical entities**: 15Hz updates
- **Important entities**: 10Hz updates
- **Background entities**: 5Hz updates
- **Static entities**: Event-based only

### 4. **Message Batching**
- Combine multiple small messages
- Reduce WebSocket frame overhead
- Maintain low latency for input

## Lag Compensation

### 1. **Server-Side Rewind**
- Maintain entity history for last 200ms
- Rewind to client's view when processing hits
- Validate hits against rewound state

### 2. **Client-Side Prediction**
- Predict movement and physics locally
- Store input sequence numbers
- Replay inputs when server corrections arrive

### 3. **Interpolation Smoothing**
- Buffer server states for smooth playback
- Interpolate between snapshots
- Extrapolate for very recent data

## Error Handling

### 1. **Connection Issues**
- Automatic reconnection with exponential backoff
- State synchronization on reconnect
- Graceful degradation for poor connections

### 2. **Desynchronization**
- Detect prediction errors beyond threshold
- Force state reconciliation
- Smooth visual corrections

### 3. **Message Loss**
- Sequence number validation
- Request retransmission for critical messages
- Graceful handling of missing data

## Security Considerations

### 1. **Input Validation**
- Validate all client inputs on server
- Check movement bounds and physics constraints
- Rate limit message frequency

### 2. **Anti-Cheat**
- Server-side collision detection
- Movement speed validation
- Shooting cooldown enforcement

### 3. **Resource Management**
- Limit concurrent connections per IP
- Monitor message rates per client
- Automatic cleanup of abandoned sessions

## Implementation Phases

### Phase 1: Core Infrastructure
1. Server world state management
2. Basic entity synchronization
3. Simple input processing
4. Full state broadcasting

### Phase 2: Prediction & Reconciliation
1. Client-side prediction system
2. Server reconciliation logic
3. Input replay mechanism
4. Smooth error correction

### Phase 3: Optimization
1. Delta compression
2. Interest management
3. Performance monitoring
4. Bandwidth optimization

This architecture provides a solid foundation for Space Arcade's multiplayer implementation, balancing responsiveness with consistency while maintaining the cooperative gameplay experience. 