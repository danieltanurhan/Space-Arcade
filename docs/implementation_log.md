# 📜 Implementation Decision Log

This file captures key decisions made during the multiplayer-protocol integration work. Entries are appended in reverse-chronological order so the latest context is always at the top.

---

## 2025-07-04 – Initial Protocol Integration (Phase 1 kick-off)

1. **Shared Protocol Package (Go)**
   • Introduced `server/internal/protocol/messages.go` to define a single source of truth for message identifiers (`MessageType`) and the common `BaseMessage` envelope.
   • Implemented `protocol.Wrap` helper to simplify wrapping typed payloads into the envelope with timestamp & sequence values.

2. **Server Refactor (`spacehub/main.go`)**
   • Switched to re-exported message constants from the new protocol package, eliminating scattered string literals.
   • Updated `JoinMessage`, `InputMessage`, and `StateMessage` structures to follow the `{type,timestamp,seq,data}` envelope format.
   • Implemented minimal `JOINED` response message, sent immediately when a client joins a lobby.
   • Refactored periodic state broadcasting to emit `STATE` messages that comply with the new protocol.

3. **Logging Adjustments**
   • Updated human-readable logs to reference the new nested input fields (movement, rotation, actions).

These changes lay the groundwork for an authoritative server that speaks the documented protocol without altering existing gameplay behaviour.

---