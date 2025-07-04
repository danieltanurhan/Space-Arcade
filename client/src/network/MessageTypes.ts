export const MessageTypes = {
  JOIN: 'JOIN',
  INPUT: 'INPUT',
  STATE: 'STATE',
} as const

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes]