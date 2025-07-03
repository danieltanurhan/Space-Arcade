# 🚀 Space Arcade –– Project Blueprint

A cooperative, 3‑D arcade shooter/hauler set in a bustling asteroid belt. Two complementary ships team up: **Shooter** blasts rocks into ore while **Hauler** tractors the loot to stations for profit and upgrades.

---

## 1 · Gameplay Snapshot

| Phase        | Shooter                                  | Hauler                          | Purpose                   |
| ------------ | ---------------------------------------- | ------------------------------- | ------------------------- |
| **Explore**  | Scout dense asteroid pockets             | Shadow shooter path             | Teach navigation & camera |
| **Act**      | Laser/railgun asteroids → break into ore | Tractor‑beam chunks → cargo bay | Physics & teamwork        |
| **Bank**     | Earn credits per chunk mass              | Sell cargo at orbital station   | Introduce upgrade economy |
| **Progress** | Buy weapons, shields, engines            | Expand hold, range, thrust      | Build long‑term loop      |

### Roles at a Glance

* **Shooter Ship**   `role: DPS`

  * Fast, agile; armed with lasers/railguns
  * Upgrades: weapons, shields, maneuver thrusters

* **Hauler Ship**   `role: Support`

  * Bulkier; equipped with tractor beam & large cargo bay
  * Upgrades: cargo capacity, tractor range, defensive turrets

---

## 2 · Tech Stack

| Layer             | Choice                                        | Notes                                       |
| ----------------- | --------------------------------------------- | ------------------------------------------- |
| **Client**        | **Three.js r164** + TypeScript + Vite         | Hot‑reload, modern ESM                      |
| **Physics**       | **cannon‑es**                                 | Maintained, tree‑shakable fork of Cannon.js |
| **State Mgmt**    | Lightweight ECS (BiteCS or DIY)               | Decouples render/physics/logic              |
| **Net Transport** | WebSocket (Gorilla WS in Go)                  | Real‑time, cross‑browser                    |
| **Backend**       | Go 1.22 + Chi/Fiber                           | Simple REST + WS hub                        |
| **DB**            | Postgres (players, upgrades), Redis (pub/sub) | Persistence & horizontal scaling            |
| **Assets**        | glTF + KTX2 + Draco                           | Stream‑friendly compression                 |

---

## 3 · Architecture Diagram (MVP)

```text
┌──────────────────────────────┐           ┌──────────────────────────┐
│  Browser Client (Three.js)   │  WS JSON  │   Go Hub (authoritative) │
│                              │──────────▶│                          │
│  • Render loop               │           │  • ECS tick @ 60 Hz      │
│  • Client‑side prediction    │           │  • Input buffer          │
│  • Reconciliation            │◀──────────│  • Snapshot diff @ 15 Hz │
└──────────────────────────────┘           └──────────────────────────┘
                                                      │
                                                      │REST
                                          ┌──────────▼─────────┐
                                          │ Postgres + Redis   │
                                          └────────────────────┘
```

---

## 4 · Project Structure (proposed)

```text
space-arcade/
├─ client/
│  ├─ public/         # static assets (models, textures)
│  ├─ src/
│  │  ├─ ecs/
│  │  ├─ systems/
│  │  ├─ components/
│  │  ├─ net/
│  │  └─ main.ts
│  └─ vite.config.ts
├─ server/
│  ├─ cmd/spacehub/main.go
│  ├─ internal/
│  │  ├─ hub/
│  │  ├─ game/
│  │  └─ db/
│  └─ go.mod
├─ shared/            # Flatbuffers / schemas
└─ README.md (this file)
```

---

## 5 · Getting Started

### Prerequisites

* **Node ≥ 20**
* **Go ≥ 1.22**
* **PostgreSQL 15** (optional until Milestone 5)

### Bootstrap Commands

```bash
# 1. Clone & install client deps
$ git clone https://github.com/your‑org/space‑arcade.git
$ cd space‑arcade/client && npm i

# 2. Run dev server
$ npm run dev    # http://localhost:5173

# 3. Start Go hub (no DB yet)
$ cd ../server && go run ./cmd/spacehub
```

Open two browser tabs → each acts as a different ship once Milestone 3 is complete.

---

## 6 · Message Schema (JSON MVP)

```jsonc
// Client → Server
{ "type": "JOIN",  "lobby": "alpha-field-01" }
{ "type": "INPUT", "seq": 42, "throttle": 0.8, "pitch": -0.1, "fire": true }

// Server → Client
{ "type": "STATE", "seq": 420, "entities": [
  { "id": 1, "x": 3.2, "y": 0.4, "z": -12.6, "vx": 0.1, "vy": 0, "vz": -5.0 },
  { "id": 99, "type": "asteroid", "hp": 45, ... }
]}
```

*Switch to Flatbuffers after Milestone 4 for smaller, faster packets.*

---

## 7 · Development Road‑map

> Tick off as you go – Cursor’s ✅ will keep you honest.

### Milestone 0 – Project Skeleton (Week 0–1)

* [ ] Initialize Vite + Three.js TypeScript project (`npm create vite@latest my-space-arcade -- --template vanilla-ts`)
* [ ] Integrate Three.js r164 and OrbitControls
* [ ] Add cannon‑es physics engine
* [ ] Render a placeholder cube spaceship
* [ ] Set up ESLint, Prettier, and Git repository

### Milestone 1 – Flight & Shooting (Week 2)

* [ ] Import low‑poly shooter ship (glTF)
* [ ] Implement WASD + Mouse flight controls
* [ ] Spawn 20 procedural asteroids
* [ ] Detect collisions and apply physics responses
* [ ] Implement laser ray‑cast to destroy asteroids
* [ ] Break asteroids into mineral chunks

### Milestone 2 – Hauling & Upgrades (Week 3)

* [ ] Add hauler ship prefab with tractor‑beam collider
* [ ] Implement debris collection and cargo hold logic
* [ ] Create temporary in‑game shop UI (credits & inventory)
* [ ] Implement upgrade purchases (weapons, shields, cargo)
* [ ] Persist player data in `localStorage`

### Milestone 3 – Go Lobby Prototype (Week 4)

* [ ] Set up Go module `spacehub`
* [ ] Create Gorilla WebSocket endpoint `/ws`
* [ ] Define JSON message types (`JOIN`, `INPUT`, `STATE`, `BUY`)
* [ ] Implement hub (register, broadcast, unregister)
* [ ] Hard‑code lobby “alpha‑field‑01”
* [ ] Connect two clients and echo state updates

### Milestone 4 – Multiplayer Core (Week 5–6)

* [ ] Move physics tick to authoritative server ECS
* [ ] Add client prediction & reconciliation
* [ ] Stream world snapshots at 15 Hz
* [ ] Switch packets from JSON to Flatbuffers
* [ ] Implement basic lag compensation (shot rewind)

### Milestone 5 – Persistence & Economy (Week 7)

* [ ] Set up Postgres schema for players, inventory, upgrades
* [ ] Expose REST endpoints for account & lobby discovery
* [ ] Validate upgrade purchases server‑side
* [ ] Add Redis pub/sub scaling across hubs

### Milestone 6 – Polish & Deployment (Week 8+)

* [ ] Compress assets with KTX2/Draco
* [ ] Add GPU particle effects for lasers/asteroid debris
* [ ] Integrate sound effects & background music
* [ ] Dockerize Go server + Nginx static hosting
* [ ] Deploy client to Netlify / Vercel
* [ ] Load‑test for \~200 concurrent players
* [ ] Write README and contribution guidelines

#### Stretch Goals

* [ ] Procedural sectors & warp gates
* [ ] Player guilds & shared cargo contracts
* [ ] In‑game player‑driven marketplace

---

## 8 · License

**MIT** – hack, share, have fun. (Replace if your studio needs something else.)
