import * as gameState from '../state/gameState'
import { asteroids } from '../entities/asteroid'

export function updateUI() {
  const el = document.getElementById('stats')
  if (!el) return
  el.innerHTML = `Score: ${gameState.stats.score}<br>
    Asteroids Destroyed: ${gameState.stats.asteroidsDestroyed}<br>
    Asteroids Remaining: ${asteroids.length}`
}