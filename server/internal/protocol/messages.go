package protocol

import (
    "encoding/json"
    "time"
)

// MessageType defines all supported message category identifiers.
// These values follow the specification in docs/04-MESSAGE-PROTOCOL.md.
type MessageType string

// Connection / Lobby management
const (
    MsgJoin         MessageType = "JOIN"          // Client → Server
    MsgJoined       MessageType = "JOINED"        // Server → Client
    MsgLeave        MessageType = "LEAVE"         // Client → Server
    MsgPlayerJoined MessageType = "PLAYER_JOINED" // Server → Client
    MsgPlayerLeft   MessageType = "PLAYER_LEFT"   // Server → Client

    // Input
    MsgInput    MessageType = "INPUT"     // Client → Server
    MsgInputAck MessageType = "INPUT_ACK" // Server → Client

    // State synchronisation
    MsgState      MessageType = "STATE"       // Server → Client – full state snapshot
    MsgStateDelta MessageType = "STATE_DELTA" // Server → Client – delta snapshot

    // Entity / World events
    MsgEntitySpawn   MessageType = "ENTITY_SPAWN"
    MsgEntityDestroy MessageType = "ENTITY_DESTROY"
    MsgWorldEvent    MessageType = "WORLD_EVENT"

    // System / diagnostics
    MsgError        MessageType = "ERROR"
    MsgPing         MessageType = "PING"
    MsgPong         MessageType = "PONG"
    MsgSyncRequest  MessageType = "SYNC_REQUEST"
    MsgSyncResponse MessageType = "SYNC_RESPONSE"
)

// BaseMessage represents the common envelope that wraps every concrete
// payload travelling between server and client.
//
//     {
//         "type": "STATE",
//         "timestamp": 1234567890,
//         "seq": 42,
//         "data": { ... }
//     }
//
// The Data field contains the inner payload and is intentionally kept as
// json.RawMessage to allow deferred decoding based on the Type field.
// Concrete helpers are provided to wrap arbitrary Go structs into this
// envelope.

type BaseMessage struct {
    Type      MessageType     `json:"type"`
    Timestamp int64           `json:"timestamp"`
    Seq       uint32          `json:"seq"`
    Data      json.RawMessage `json:"data,omitempty"`
}

// Wrap encodes an arbitrary payload into a BaseMessage envelope and returns
// the final JSON representation ready to be sent over the wire.
func Wrap(msgType MessageType, seq uint32, payload interface{}) ([]byte, error) {
    raw, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }
    msg := BaseMessage{
        Type:      msgType,
        Timestamp: time.Now().UnixMilli(),
        Seq:       seq,
        Data:      raw,
    }
    return json.Marshal(msg)
}