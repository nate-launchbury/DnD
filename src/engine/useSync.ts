import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameAction } from '../types/actions'
import { deserializeGameState, type SerializedGameState } from './persistence'
import type { GameState } from '../types/game'

const WS_URL = `ws://${window.location.hostname}:4000`
const RECONNECT_BASE_MS = 500
const RECONNECT_MAX_MS = 5000

interface UseSyncOptions {
  onStateUpdate: (state: GameState) => void
}

export function useSync({ onStateUpdate }: UseSyncOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const onStateUpdateRef = useRef(onStateUpdate)
  onStateUpdateRef.current = onStateUpdate

  const reconnectDelay = useRef(RECONNECT_BASE_MS)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setConnected(true)
      reconnectDelay.current = RECONNECT_BASE_MS
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'state') {
          const state = deserializeGameState(msg.data as SerializedGameState)
          onStateUpdateRef.current(state)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      if (!mountedRef.current) return
      const delay = reconnectDelay.current
      reconnectDelay.current = Math.min(delay * 2, RECONNECT_MAX_MS)
      setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const sendAction = useCallback((action: GameAction) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(action))
    }
  }, [])

  return { connected, sendAction }
}
