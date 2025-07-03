import * as gameState from '../state/gameState'
import { asteroids } from '../entities/asteroid'
import { mineralChunks } from '../entities/mineralChunk'
import { spaceships } from '../entities/spaceship'
import { isNearSpaceStation } from '../entities/spaceStation'

export function updateUI() {
  const el = document.getElementById('stats')
  if (!el) return
  
  const ship = spaceships.length > 0 ? spaceships[0] : null
  const nearStation = ship ? isNearSpaceStation(ship.position) : false
  const distanceToOrigin = ship ? ship.position.length().toFixed(1) : '0'
  
  // Count mineral chunks by type
  const chunkCounts = {
    iron: 0,
    copper: 0,
    rare_metals: 0,
    crystals: 0
  }
  
  mineralChunks.forEach(chunk => {
    chunkCounts[chunk.type]++
  })
  
  el.innerHTML = `
    <div style="font-family: monospace; color: #00ff00; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
      <h3 style="margin: 0 0 10px 0; color: #ffffff;">🎮 Space Arcade Status</h3>
      <div style="margin-bottom: 8px;"><strong>Score:</strong> ${gameState.stats.score}</div>
      <div style="margin-bottom: 8px;"><strong>Asteroids Destroyed:</strong> ${gameState.stats.asteroidsDestroyed}</div>
      <div style="margin-bottom: 8px;"><strong>Minerals Collected:</strong> ${gameState.stats.mineralsCollected}</div>
      <div style="margin-bottom: 12px;"><strong>Distance to Station:</strong> ${distanceToOrigin} units</div>
      
      <h4 style="margin: 0 0 8px 0; color: #ffff00;">🌍 World Status</h4>
      <div style="margin-bottom: 8px;"><strong>Asteroids Remaining:</strong> ${asteroids.length}</div>
      <div style="margin-bottom: 8px;"><strong>Mineral Chunks Available:</strong> ${mineralChunks.length}</div>
      <div style="margin-bottom: 8px; color: ${nearStation ? '#00ff00' : '#ff6600'};">
        <strong>Near Space Station:</strong> ${nearStation ? 'YES' : 'NO'}
      </div>
      
      <h4 style="margin: 0 0 8px 0; color: #ff6600;">💎 Active Minerals</h4>
      <div style="margin-bottom: 4px;">🔩 Iron: ${chunkCounts.iron}</div>
      <div style="margin-bottom: 4px;">🔶 Copper: ${chunkCounts.copper}</div>
      <div style="margin-bottom: 4px;">⚪ Rare Metals: ${chunkCounts.rare_metals}</div>
      <div style="margin-bottom: 4px;">💎 Crystals: ${chunkCounts.crystals}</div>
      
      <div style="margin-top: 12px; font-size: 0.9em; color: #888888;">
        Fly close to mineral chunks to collect them!
      </div>
    </div>
  `
}