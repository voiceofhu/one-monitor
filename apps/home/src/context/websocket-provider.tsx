import { useCallback, useEffect, useRef, useState } from "react"

import { fetchServerList } from "@/lib/nezha-api"
import type { NezhaServer, NezhaServerStatus, ServerDeltaUpdate } from "@/types/nezha-api"
import type { State, vps } from "@/pages/server/types"

import { WebSocketContext, WebSocketContextType } from "./websocket-context"

interface WebSocketProviderProps {
  url: string
  children: React.ReactNode
}

const MAX_HISTORY_RECORDS = 30
const MAX_RECONNECT_ATTEMPTS = 30

const normalizeTemperatures = (input?: NezhaServerStatus["temperatures"]): State["temperatures"] => {
  if (!input || !Array.isArray(input)) {
    return []
  }

  return input
    .map((item, index) => {
      if (item == null) {
        return null
      }

      if (typeof item === "number") {
        return {
          name: `传感器${index + 1}`,
          temperature: item,
        }
      }

      if (typeof item === "object") {
        const rawTemp = (item as any).Temperature ?? (item as any).temperature
        const tempValue = typeof rawTemp === "number" ? rawTemp : Number.parseFloat(String(rawTemp ?? ""))
        if (!Number.isFinite(tempValue)) {
          return null
        }
        const rawName = (item as any).Name ?? (item as any).name
        const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : `传感器${index + 1}`
        return {
          name,
          temperature: tempValue,
        }
      }

      return null
    })
    .filter((entry): entry is NonNullable<State["temperatures"]>[number] => Boolean(entry))
    .slice(0, 12)
}

const mapServerState = (state?: NezhaServerStatus): State => {
  if (!state) {
    return {}
  }
  const result: State = {}
  if (state.cpu !== undefined) result.cpu = state.cpu
  if (state.mem_used !== undefined) result.mem_used = state.mem_used
  if (state.swap_used !== undefined) result.swap_used = state.swap_used
  if (state.disk_used !== undefined) result.disk_used = state.disk_used
  if (state.net_in_transfer !== undefined) result.net_in_transfer = state.net_in_transfer
  if (state.net_out_transfer !== undefined) result.net_out_transfer = state.net_out_transfer
  if (state.net_in_speed !== undefined) result.net_in_speed = state.net_in_speed
  if (state.net_out_speed !== undefined) result.net_out_speed = state.net_out_speed
  if (state.uptime !== undefined) result.uptime = state.uptime
  if (state.load_1 !== undefined) result.load_1 = state.load_1
  if (state.load_5 !== undefined) result.load_5 = state.load_5
  if (state.load_15 !== undefined) result.load_15 = state.load_15
  if (state.tcp_conn_count !== undefined) result.tcp_conn_count = state.tcp_conn_count
  if (state.udp_conn_count !== undefined) result.udp_conn_count = state.udp_conn_count
  if (state.process_count !== undefined) result.process_count = state.process_count
  if (state.gpu !== undefined) result.gpu = state.gpu
  const temps = normalizeTemperatures(state.temperatures)
  if (temps.length > 0) {
    result.temperatures = temps
  }
  return result
}

const normalizeServer = (server: NezhaServer): vps => {
  const host = server.host ?? {}
  return {
    id: server.id,
    name: server.name,
    display_index: server.display_index,
    public_note: server.public_note ?? "",
    last_active: server.last_active,
    country_code: server.country_code,
    host: {
      platform: host.platform,
      platform_version: host.platform_version,
      cpu: host.cpu ?? [],
      arch: host.arch,
      virtualization: host.virtualization,
      boot_time: host.boot_time,
      version: host.version,
      country_code: host.country_code,
      mem_total: host.mem_total,
      disk_total: host.disk_total,
      swap_total: host.swap_total,
      gpu: host.gpu ?? [],
    },
    state: mapServerState(server.state),
  }
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ url, children }) => {
  const [lastMessage, setLastMessage] = useState<{ data: string } | null>(null)
  const [messageHistory, setMessageHistory] = useState<{ data: string }[]>([])
  const [connected, setConnected] = useState(false)
  const [needReconnect, setNeedReconnect] = useState(false)

  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const isConnecting = useRef(false)

  const serversRef = useRef<Map<number, vps>>(new Map())
  const timestampRef = useRef<number>(Date.now())
  const onlineCountRef = useRef<number>(0)
  const fetchingInitialRef = useRef(false)

  const updateSnapshot = useCallback(
    (map: Map<number, vps>, timestamp: number, online: number) => {
      timestampRef.current = timestamp
      onlineCountRef.current = online

      const servers = Array.from(map.values()).map((server) => ({
        ...server,
        host: server.host
          ? {
              ...server.host,
              cpu: server.host.cpu ? [...server.host.cpu] : undefined,
              gpu: server.host.gpu ? [...server.host.gpu] : undefined,
            }
          : undefined,
        state: server.state ? { ...server.state } : {},
      }))

      const payload = {
        now: timestamp,
        online,
        servers,
      }

      const serialized = JSON.stringify(payload)
      const snapshot = { data: serialized }
      setLastMessage(snapshot)
      setMessageHistory((prev) => {
        const updated = [snapshot, ...prev]
        return updated.slice(0, MAX_HISTORY_RECORDS)
      })
    },
    [setLastMessage, setMessageHistory],
  )

  const applyServerMap = useCallback(
    (map: Map<number, vps>, timestamp: number, online: number) => {
      serversRef.current = map
      updateSnapshot(map, timestamp, online)
    },
    [updateSnapshot],
  )

  const handleDelta = useCallback(
    (update: ServerDeltaUpdate) => {
      const currentMap = serversRef.current
      const nextMap = new Map(currentMap)
      let nextOnline = onlineCountRef.current
      const nextTimestamp = update.timestamp || Date.now()
      let changed = false

      switch (update.type) {
        case "server_add": {
          const server = normalizeServer(update.data.server)
          nextMap.set(server.id, server)
          changed = true
          break
        }
        case "server_state": {
          const change = update.data
          const existing = nextMap.get(change.id)
          if (existing) {
            const mergedState: State = {
              ...existing.state,
              ...mapServerState(change.state),
            }
            nextMap.set(change.id, {
              ...existing,
              state: mergedState,
              last_active: change.last_active || existing.last_active,
              country_code: change.country_code || existing.country_code,
            })
            changed = true
          }
          break
        }
        case "server_info": {
          const info = update.data
          const existing = nextMap.get(info.id)
          if (existing) {
            nextMap.set(info.id, {
              ...existing,
              name: info.name ?? existing.name,
              public_note: info.public_note ?? existing.public_note,
              display_index: info.display_index ?? existing.display_index,
            })
            changed = true
          }
          break
        }
        case "server_remove": {
          if (nextMap.delete(update.data.id)) {
            changed = true
          }
          break
        }
        case "online_count": {
          nextOnline = update.data.online
          changed = true
          break
        }
        case "heartbeat":
        default:
          break
      }

      if (changed) {
        applyServerMap(nextMap, nextTimestamp, nextOnline)
      } else if (update.type === "heartbeat") {
        timestampRef.current = nextTimestamp
      }
    },
    [applyServerMap],
  )

  const cleanup = useCallback(() => {
    if (ws.current) {
      ws.current.onopen = null
      ws.current.onclose = null
      ws.current.onmessage = null
      ws.current.onerror = null

      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close()
      }
      ws.current = null
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }

    isConnecting.current = false
    setConnected(false)
  }, [])

  const loadInitialData = useCallback(async () => {
    if (fetchingInitialRef.current) {
      return
    }
    fetchingInitialRef.current = true
    try {
      const response = await fetchServerList()
      if (!response.success || !response.data) {
        console.warn("Failed to fetch server list")
        return
      }
      const map = new Map<number, vps>()
      response.data.servers.forEach((server: NezhaServer) => {
        map.set(server.id, normalizeServer(server))
      })
      applyServerMap(map, response.data.now, response.data.online)
    } catch (error) {
      console.error("Failed to fetch server list:", error)
    } finally {
      fetchingInitialRef.current = false
    }
  }, [applyServerMap])

  const connect = useCallback(() => {
    if (isConnecting.current) {
      return
    }

    cleanup()
    isConnecting.current = true

    try {
      const wsUrl = new URL(url, window.location.origin)
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws")

      ws.current = new WebSocket(wsUrl.toString())

      ws.current.onopen = () => {
        console.log("WebSocket connected")
        setConnected(true)
        setNeedReconnect(false)
        reconnectAttempts.current = 0
        isConnecting.current = false
        loadInitialData()
      }

      ws.current.onclose = () => {
        console.log("WebSocket disconnected")
        setConnected(false)
        ws.current = null
        isConnecting.current = false

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, 3000)
        } else {
          setNeedReconnect(true)
        }
      }

      ws.current.onmessage = (event) => {
        try {
          const delta = JSON.parse(event.data) as ServerDeltaUpdate
          handleDelta(delta)
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        isConnecting.current = false
      }
    } catch (error) {
      console.error("WebSocket connection error:", error)
      isConnecting.current = false
    }
  }, [cleanup, handleDelta, loadInitialData, url])

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0
    setNeedReconnect(false)
    cleanup()
    setTimeout(() => {
      connect()
    }, 1000)
  }, [cleanup, connect])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    connect()

    const handleBeforeUnload = () => {
      cleanup()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      cleanup()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [connect, cleanup])

  const contextValue: WebSocketContextType = {
    lastMessage,
    connected,
    messageHistory,
    reconnect,
    needReconnect,
    setNeedReconnect,
  }

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}
