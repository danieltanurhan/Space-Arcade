package protocol

// Entity represents the minimal state shared with clients used for network
// synchronisation. Additional gameplay-specific fields can be appended later
// without breaking backwards compatibility as long as they are tagged with
// json omitempty.
//
// NOTE: We keep this structure intentionally lightweight; the authoritative
// server may hold richer entities internally and convert them before sending
// over the wire.

type Entity struct {
    ID   int     `json:"id"`
    Type string  `json:"type,omitempty"`

    // Position
    X float64 `json:"x"`
    Y float64 `json:"y"`
    Z float64 `json:"z"`

    // Velocity
    VX float64 `json:"vx"`
    VY float64 `json:"vy"`
    VZ float64 `json:"vz"`

    // Health (optional for non-damageable entities)
    HP int `json:"hp,omitempty"`
}