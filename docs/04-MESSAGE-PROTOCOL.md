# 📡 Message Protocol Specification

## Overview

This document defines the complete message protocol for Space Arcade's client-server communication. The protocol supports authoritative multiplayer gameplay with client prediction and server reconciliation.

## Protocol Fundamentals

### Message Format
All messages are JSON-encoded with the following base structure:

```json
{
    "type": "MESSAGE_TYPE",
    "timestamp": 1234567890,
    "seq": 42,
    "data": { ... }
}
```

### Message Categories
- **Connection**: Join/leave lobby, authentication
- **Input**: Player actions and commands
- **State**: World state synchronization
- **Events**: Game events and notifications
- **System**: Error handling and diagnostics

### Sequence Numbers
- **Client → Server**: Monotonically increasing per client
- **Server → Client**: Monotonically increasing per lobby
- Used for message ordering and reconciliation

### Timestamps
- Unix timestamp in milliseconds
- Used for lag compensation and timing validation
- Server timestamp is authoritative

## Connection Messages

### JOIN (Client → Server)
Join a lobby with specified role.

```json
{
    "type": "JOIN",
    "timestamp": 1234567890,
    "seq": 1,
    "data": {
        "lobby": "alpha-field-01",
        "role": "shooter",
        "playerName": "Player1",
        "version": "1.0.0"
    }
}
```

**Fields:**
- `lobby`: Lobby identifier (string)
- `role`: Player role ("shooter" or "hauler")
- `playerName`: Display name (string, max 20 chars)
- `version`: Client version for compatibility

### JOINED (Server → Client)
Confirm successful lobby join.

```json
{
    "type": "JOINED",
    "timestamp": 1234567890,
    "seq": 1,
    "data": {
        "clientId": 123,
        "lobby": "alpha-field-01",
        "role": "shooter",
        "spawnPosition": [0, 0, 0],
        "worldState": {
            "entities": [...],
            "station": {...}
        }
    }
}
```

**Fields:**
- `clientId`: Unique client identifier (uint32)
- `lobby`: Confirmed lobby name
- `role`: Assigned role
- `spawnPosition`: Initial spawn location [x, y, z]
- `worldState`: Complete initial world state

### PLAYER_JOINED (Server → Client)
Notify existing players of new player.

```json
{
    "type": "PLAYER_JOINED",
    "timestamp": 1234567890,
    "seq": 2,
    "data": {
        "clientId": 456,
        "playerName": "Player2",
        "role": "hauler",
        "spawnPosition": [5, 0, 5]
    }
}
```

### PLAYER_LEFT (Server → Client)
Notify players that someone left.

```json
{
    "type": "PLAYER_LEFT",
    "timestamp": 1234567890,
    "seq": 3,
    "data": {
        "clientId": 456,
        "reason": "disconnect"
    }
}
```

**Reasons:**
- `disconnect`: Network disconnection
- `quit`: Voluntary leave
- `timeout`: Connection timeout
- `kicked`: Removed by server

### LEAVE (Client → Server)
Request to leave lobby.

```json
{
    "type": "LEAVE",
    "timestamp": 1234567890,
    "seq": 10,
    "data": {}
}
```

## Input Messages

### INPUT (Client → Server)
Send player input to server.

```json
{
    "type": "INPUT",
    "timestamp": 1234567890,
    "seq": 42,
    "data": {
        "movement": {
            "x": 0.8,
            "y": 0.2,
            "z": -0.5
        },
        "rotation": {
            "pitch": -0.1,
            "yaw": 0.3
        },
        "actions": {
            "shoot": true,
            "ability": "tractor_beam",
            "interact": false
        }
    }
}
```

**Fields:**
- `movement`: Normalized movement vector [-1 to 1]
- `rotation`: Rotation input in radians
- `actions`: Boolean flags for actions

### INPUT_ACK (Server → Client)
Acknowledge processed input.

```json
{
    "type": "INPUT_ACK",
    "timestamp": 1234567890,
    "seq": 15,
    "data": {
        "inputSeq": 42,
        "processed": true,
        "serverTime": 1234567891
    }
}
```

## State Messages

### STATE (Server → Client)
Broadcast world state to clients.

```json
{
    "type": "STATE",
    "timestamp": 1234567890,
    "seq": 420,
    "data": {
        "entities": [
            {
                "id": 1,
                "type": "spaceship",
                "clientId": 123,
                "position": [10.5, 2.3, -15.2],
                "velocity": [0.1, 0.0, -5.0],
                "quaternion": [0.0, 0.707, 0.0, 0.707],
                "health": 100,
                "energy": 85,
                "role": "shooter"
            },
            {
                "id": 2,
                "type": "asteroid",
                "position": [20.0, 0.0, -30.0],
                "quaternion": [0.0, 0.0, 0.0, 1.0],
                "health": 50,
                "size": 2.5,
                "zoneType": "dense_field"
            }
        ],
        "lobbyStats": {
            "asteroidsRemaining": 25,
            "totalScore": 1500
        }
    }
}
```

### STATE_DELTA (Server → Client)
Delta-compressed state update.

```json
{
    "type": "STATE_DELTA",
    "timestamp": 1234567890,
    "seq": 421,
    "data": {
        "baseSeq": 420,
        "changes": [
            {
                "id": 1,
                "position": [10.6, 2.3, -15.7],
                "velocity": [0.2, 0.0, -5.2]
            }
        ],
        "removed": [150],
        "added": [
            {
                "id": 999,
                "type": "mineral_chunk",
                "position": [15.0, 0.0, -25.0],
                "velocity": [1.0, 0.5, -2.0],
                "mineralType": "rare_metals",
                "purity": 0.85
            }
        ]
    }
}
```

## Event Messages

### ENTITY_SPAWN (Server → Client)
Notify clients of new entities.

```json
{
    "type": "ENTITY_SPAWN",
    "timestamp": 1234567890,
    "seq": 50,
    "data": {
        "entity": {
            "id": 999,
            "type": "bullet",
            "position": [10.0, 2.0, -15.0],
            "velocity": [0.0, 0.0, -30.0],
            "ownerId": 123,
            "damage": 25,
            "lifespan": 5.0
        }
    }
}
```

### ENTITY_DESTROY (Server → Client)
Notify clients of entity destruction.

```json
{
    "type": "ENTITY_DESTROY",
    "timestamp": 1234567890,
    "seq": 51,
    "data": {
        "entityId": 150,
        "reason": "collision",
        "destroyerId": 123,
        "effects": [
            {
                "type": "explosion",
                "position": [20.0, 0.0, -30.0],
                "scale": 2.5
            }
        ]
    }
}
```

**Destroy Reasons:**
- `collision`: Hit by bullet/ship
- `timeout`: Expired lifespan
- `collected`: Picked up by player
- `despawn`: Removed by server

### WORLD_EVENT (Server → Client)
Notify clients of significant world events.

```json
{
    "type": "WORLD_EVENT",
    "timestamp": 1234567890,
    "seq": 52,
    "data": {
        "event": "asteroid_destroyed",
        "data": {
            "asteroidId": 150,
            "destroyerId": 123,
            "spawnedChunks": [999, 1000, 1001],
            "scoreAwarded": 50
        }
    }
}
```

**Event Types:**
- `asteroid_destroyed`: Asteroid broken into chunks
- `resource_collected`: Player collected mineral
- `player_damaged`: Player took damage
- `ability_used`: Special ability activated
- `objective_completed`: Mission objective achieved

### ABILITY_USE (Client → Server)
Activate special ability.

```json
{
    "type": "ABILITY_USE",
    "timestamp": 1234567890,
    "seq": 25,
    "data": {
        "ability": "tractor_beam",
        "target": {
            "entityId": 500,
            "position": [15.0, 0.0, -20.0]
        },
        "parameters": {
            "strength": 0.8,
            "duration": 3.0
        }
    }
}
```

### ABILITY_RESULT (Server → Client)
Confirm ability use and effects.

```json
{
    "type": "ABILITY_RESULT",
    "timestamp": 1234567890,
    "seq": 53,
    "data": {
        "clientId": 456,
        "ability": "tractor_beam",
        "success": true,
        "effects": [
            {
                "type": "force_applied",
                "entityId": 500,
                "force": [0.0, 0.0, 5.0]
            }
        ],
        "energyCost": 10
    }
}
```

## System Messages

### ERROR (Server → Client)
Report errors to client.

```json
{
    "type": "ERROR",
    "timestamp": 1234567890,
    "seq": 100,
    "data": {
        "code": "INVALID_INPUT",
        "message": "Movement input exceeds maximum speed",
        "details": {
            "inputSeq": 42,
            "maxSpeed": 1.0,
            "receivedSpeed": 1.5
        }
    }
}
```

**Error Codes:**
- `INVALID_INPUT`: Input validation failed
- `RATE_LIMIT`: Too many messages
- `UNAUTHORIZED`: Invalid permissions
- `LOBBY_FULL`: Cannot join full lobby
- `VERSION_MISMATCH`: Client version incompatible

### PING (Client ↔ Server)
Measure connection latency.

```json
{
    "type": "PING",
    "timestamp": 1234567890,
    "seq": 1000,
    "data": {
        "id": "ping_123"
    }
}
```

### PONG (Server ↔ Client)
Respond to ping.

```json
{
    "type": "PONG",
    "timestamp": 1234567891,
    "seq": 1001,
    "data": {
        "id": "ping_123",
        "serverTime": 1234567891
    }
}
```

### SYNC_REQUEST (Client → Server)
Request full state synchronization.

```json
{
    "type": "SYNC_REQUEST",
    "timestamp": 1234567890,
    "seq": 200,
    "data": {
        "reason": "desync_detected",
        "lastValidSeq": 400
    }
}
```

### SYNC_RESPONSE (Server → Client)
Provide full state synchronization.

```json
{
    "type": "SYNC_RESPONSE",
    "timestamp": 1234567890,
    "seq": 201,
    "data": {
        "fullState": {
            "entities": [...],
            "worldState": {...}
        },
        "serverTime": 1234567890
    }
}
```

## Entity Data Structures

### Spaceship Entity
```json
{
    "id": 1,
    "type": "spaceship",
    "clientId": 123,
    "position": [10.5, 2.3, -15.2],
    "velocity": [0.1, 0.0, -5.0],
    "quaternion": [0.0, 0.707, 0.0, 0.707],
    "health": 100,
    "maxHealth": 100,
    "energy": 85,
    "maxEnergy": 100,
    "role": "shooter",
    "upgrades": {
        "weaponLevel": 1,
        "shieldLevel": 1,
        "engineLevel": 1
    }
}
```

### Asteroid Entity
```json
{
    "id": 2,
    "type": "asteroid",
    "position": [20.0, 0.0, -30.0],
    "velocity": [0.0, 0.0, 0.0],
    "quaternion": [0.0, 0.0, 0.0, 1.0],
    "health": 50,
    "maxHealth": 50,
    "size": 2.5,
    "zoneType": "dense_field",
    "mineralComposition": [
        "iron", "iron", "copper", "rare_metals"
    ]
}
```

### Bullet Entity
```json
{
    "id": 3,
    "type": "bullet",
    "position": [10.0, 2.0, -15.0],
    "velocity": [0.0, 0.0, -30.0],
    "ownerId": 123,
    "damage": 25,
    "spawnTime": 1234567890,
    "lifespan": 5.0
}
```

### Mineral Chunk Entity
```json
{
    "id": 4,
    "type": "mineral_chunk",
    "position": [15.0, 0.0, -25.0],
    "velocity": [1.0, 0.5, -2.0],
    "quaternion": [0.0, 0.0, 0.0, 1.0],
    "mineralType": "rare_metals",
    "purity": 0.85,
    "mass": 1.2,
    "spawnTime": 1234567890
}
```

### Space Station Entity
```json
{
    "id": 5,
    "type": "space_station",
    "position": [0.0, 0.0, 0.0],
    "quaternion": [0.0, 0.0, 0.0, 1.0],
    "modules": [
        {
            "type": "docking_bay",
            "position": [25.0, 0.0, 0.0],
            "available": true
        },
        {
            "type": "trading_post",
            "position": [0.0, 0.0, 25.0],
            "available": true
        }
    ]
}
```

## Message Validation

### Size Limits
- Maximum message size: 64KB
- Maximum entities per STATE message: 100
- Maximum string length: 1024 characters

### Rate Limits
- INPUT messages: 60 per second
- ABILITY_USE messages: 10 per second
- PING messages: 1 per second
- Other messages: 30 per second

### Validation Rules
- All positions must be within world bounds
- All velocities must be within physics limits
- All rotations must be valid quaternions
- All timestamps must be within reasonable time window

## Protocol Versioning

### Version Format
- Semantic versioning: `MAJOR.MINOR.PATCH`
- Example: `1.0.0`

### Compatibility
- **Major**: Breaking changes, incompatible
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, fully compatible

### Version Negotiation
- Client sends version in JOIN message
- Server responds with compatible version
- Connection rejected if incompatible

## Error Handling

### Message Parsing Errors
- Invalid JSON: Drop message, log error
- Missing required fields: Send ERROR message
- Invalid data types: Send ERROR message

### Sequence Number Errors
- Out of order: Buffer and reorder
- Duplicate: Drop duplicate message
- Gap detected: Request retransmission

### Timeout Handling
- Input timeout: 5 seconds
- Connection timeout: 30 seconds
- Ping timeout: 10 seconds

This protocol specification provides a comprehensive foundation for Space Arcade's multiplayer networking, ensuring reliable and efficient communication between clients and server. 