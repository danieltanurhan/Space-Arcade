let container: HTMLDivElement | null = null

function ensureContainer() {
  if (!container) {
    container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '10px'
    container.style.right = '10px'
    container.style.zIndex = '9999'
    document.body.appendChild(container)
  }
}

export function showError(message: string) {
  ensureContainer()
  const box = document.createElement('div')
  box.textContent = `⚠️ ${message}`
  box.style.background = 'rgba(255,0,0,0.8)'
  box.style.color = '#fff'
  box.style.padding = '8px 12px'
  box.style.marginTop = '4px'
  box.style.borderRadius = '4px'
  container!.appendChild(box)
  setTimeout(() => box.remove(), 5000)
}