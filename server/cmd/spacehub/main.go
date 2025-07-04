package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gorilla/websocket"

	proto "space-arcade-server/internal/protocol"
	"space-arcade-server/internal/broadcast"
)

// Re-export protocol message types locally for convenience
type MessageType = proto.MessageType

const (
	MsgJoin  MessageType = proto.MsgJoin
	MsgInput MessageType = proto.MsgInput
	MsgState MessageType = proto.MsgState
)

// JoinMessage follows the protocol envelope with an inner data object.
type JoinMessage struct {
	Type      MessageType `json:"type"`
	Timestamp int64       `json:"timestamp"`
	Seq       uint32      `json:"seq"`
	Data      struct {
		Lobby string `json:"lobby"`
		Role  string `json:"role,omitempty"`
		// Additional fields (playerName, version) are ignored for now
	} `json:"data"`
}

type InputMessage struct {
	Type      MessageType `json:"type"`
	Timestamp int64       `json:"timestamp"`
	Seq       uint32      `json:"seq"`
	Data      struct {
		Movement struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
			Z float64 `json:"z"`
		} `json:"movement"`
		Rotation struct {
			Pitch float64 `json:"pitch"`
			Yaw   float64 `json:"yaw"`
		} `json:"rotation"`
		Actions struct {
			Shoot   bool   `json:"shoot"`
			Ability string `json:"ability,omitempty"`
			Interact bool  `json:"interact,omitempty"`
		} `json:"actions"`
	} `json:"data"`
}

// Server messages (Server → Client)
type StateMessage struct {
	Type      MessageType `json:"type"`
	Timestamp int64       `json:"timestamp"`
	Seq       uint32      `json:"seq"`
	Data      struct {
		Entities []Entity `json:"entities"`
	} `json:"data"`
}

type Entity = proto.Entity

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Client represents a connected player
type Client struct {
	conn   *websocket.Conn
	lobby  string
	send   chan []byte
	hub    *Hub
	id     int
	lastSeq int
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	lobbies    map[string][]*Client
	gameState  map[string][]Entity // lobby -> entities
	lastState  map[string][]Entity // previous snapshot per lobby
	lobbySeq   map[string]uint32   // monotonically increasing seq per lobby
	nextID     int
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		lobbies:    make(map[string][]*Client),
		gameState:  make(map[string][]Entity),
		lastState:  make(map[string][]Entity),
		lobbySeq:   make(map[string]uint32),
		nextID:     1,
	}
}

func (h *Hub) run() {
	ticker := time.NewTicker(66 * time.Millisecond) // ~15 Hz state updates
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			client.id = h.nextID
			h.nextID++
			log.Printf("Client %d registered", client.id)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.removeFromLobby(client)
				log.Printf("Client %d unregistered", client.id)
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
					h.removeFromLobby(client)
				}
			}

		case <-ticker.C:
			// Send state updates to all lobbies
			h.broadcastGameState()
		}
	}
}

func (h *Hub) addToLobby(client *Client, lobby string) {
	client.lobby = lobby
	h.lobbies[lobby] = append(h.lobbies[lobby], client)
	
	// Initialize lobby state if needed
	if _, exists := h.gameState[lobby]; !exists {
		h.gameState[lobby] = h.createInitialGameState()
	}
	
	// Inform the client they successfully joined
	joined := struct {
		ClientID int `json:"clientId"`
		Lobby    string `json:"lobby"`
		SpawnPosition [3]float64 `json:"spawnPosition"`
		WorldState struct {
			Entities []Entity `json:"entities"`
		} `json:"worldState"`
	}{
		ClientID: client.id,
		Lobby: lobby,
		SpawnPosition: [3]float64{0, 0, 0},
	}
	joined.WorldState.Entities = h.gameState[lobby]

	payload, _ := proto.Wrap(proto.MsgJoined, uint32(time.Now().Unix()), joined)
	client.send <- payload

	log.Printf("Client %d joined lobby %s", client.id, lobby)
}

func (h *Hub) removeFromLobby(client *Client) {
	if client.lobby == "" {
		return
	}
	
	clients := h.lobbies[client.lobby]
	for i, c := range clients {
		if c == client {
			h.lobbies[client.lobby] = append(clients[:i], clients[i+1:]...)
			break
		}
	}
	
	// Clean up empty lobbies
	if len(h.lobbies[client.lobby]) == 0 {
		delete(h.lobbies, client.lobby)
		delete(h.gameState, client.lobby)
	}
}

func (h *Hub) createInitialGameState() []Entity {
	entities := []Entity{}
	
	// Add some asteroids
	for i := 0; i < 20; i++ {
		entities = append(entities, Entity{
			ID:   100 + i,
			Type: "asteroid",
			X:    (float64(i%5) - 2) * 20,
			Y:    0,
			Z:    (float64(i/5) - 2) * 20,
			VX:   0,
			VY:   0,
			VZ:   0,
			HP:   50,
		})
	}
	
	return entities
}

func (h *Hub) broadcastGameState() {
	for lobby, clients := range h.lobbies {
		if len(clients) == 0 {
			continue
		}

		// Increment lobby sequence number
		h.lobbySeq[lobby]++

		curr := h.gameState[lobby]
		prev := h.lastState[lobby]

		// If no previous snapshot, send full STATE
		if prev == nil {
			statePayload := StateMessage{
				Type:      proto.MsgState,
				Timestamp: time.Now().UnixMilli(),
				Seq:       h.lobbySeq[lobby],
			}
			statePayload.Data.Entities = curr

			data, _ := json.Marshal(statePayload)
			for _, client := range clients {
				select {
				case client.send <- data:
				default:
				}
			}
			// Store snapshot for next delta calc
			h.lastState[lobby] = cloneEntities(curr)
			continue
		}

		// Compute delta
		changed, removed, added := broadcast.ComputeDelta(prev, curr)
		if len(changed) == 0 && len(removed) == 0 && len(added) == 0 {
			// No changes, skip sending
			continue
		}

		deltaPayload := struct {
			Type      proto.MessageType `json:"type"`
			Timestamp int64             `json:"timestamp"`
			Seq       uint32            `json:"seq"`
			Data      broadcast.DeltaSnapshot `json:"data"`
		}{
			Type:      proto.MsgStateDelta,
			Timestamp: time.Now().UnixMilli(),
			Seq:       h.lobbySeq[lobby],
			Data: broadcast.DeltaSnapshot{
				BaseSeq: h.lobbySeq[lobby] - 1,
				Changes: changed,
				Removed: removed,
				Added:   added,
			},
		}

		data, _ := json.Marshal(deltaPayload)
		for _, client := range clients {
			select {
			case client.send <- data:
			default:
			}
		}

		// Update previous snapshot
		h.lastState[lobby] = cloneEntities(curr)
	}
}

// cloneEntities performs a shallow copy of entity slice to decouple snapshots.
func cloneEntities(src []Entity) []Entity {
	out := make([]Entity, len(src))
	copy(out, src)
	return out
}

// WebSocket handler
func wsHandler(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("Websocket upgrade error:", err)
			return
		}
		
		client := &Client{
			conn: conn,
			send: make(chan []byte, 256),
			hub:  hub,
		}
		
		hub.register <- client
		
		// Start goroutines for reading and writing
		go client.writePump()
		go client.readPump()
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		c.handleMessage(message)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
			
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(data []byte) {
	var baseMsg struct {
		Type MessageType `json:"type"`
	}
	
	if err := json.Unmarshal(data, &baseMsg); err != nil {
		log.Printf("Error parsing message: %v", err)
		return
	}
	
	switch baseMsg.Type {
	case MsgJoin:
		var msg JoinMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("Error parsing JOIN message: %v", err)
			return
		}
		c.hub.addToLobby(c, msg.Data.Lobby)
		
	case proto.MsgPing:
		// Echo PONG with server time
		pong := struct {
			ID string `json:"id"`
			ServerTime int64 `json:"serverTime"`
		}{}
		// Attempt to parse ping id
		var pingData struct{
			Data struct{ID string `json:"id"`} `json:"data"`
		}
		if err := json.Unmarshal(data, &pingData); err == nil {
			pong.ID = pingData.Data.ID
		}
		pong.ServerTime = time.Now().UnixMilli()
		payload, _ := proto.Wrap(proto.MsgPong, 0, pong)
		c.send <- payload

	case MsgInput:
		var msg InputMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("Error parsing INPUT message: %v", err)
			return
		}
		c.lastSeq = int(msg.Seq)
		// TODO: Process input (Milestone 4)
		log.Printf("Client %d input: throttle=%.2f, pitch=%.2f, fire=%v", 
			c.id, msg.Data.Movement.X, msg.Data.Rotation.Pitch, msg.Data.Actions.Shoot)
	}
}

func main() {
	hub := newHub()
	go hub.run()
	
	r := chi.NewRouter()
	
	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	
	// Routes
	r.Get("/ws", wsHandler(hub))
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("🚀 Space Arcade Server is running"))
	})
	
	port := ":8080"
	fmt.Printf("🚀 Space Arcade Server starting on port %s\n", port)
	fmt.Println("WebSocket endpoint: ws://localhost:8080/ws")
	fmt.Println("Health check: http://localhost:8080/health")
	
	log.Fatal(http.ListenAndServe(port, r))
}