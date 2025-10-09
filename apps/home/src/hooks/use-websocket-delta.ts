import { useCallback, useEffect, useRef, useState } from "react"
import type { NezhaServer } from "@/types/nezha-api"

// WebSocket 消息类型
interface ServerDeltaUpdate {
  type: string
  timestamp: number
  data: any
}

// 服务器状态变化
interface ServerStateChange {
  id: number
  state?: any
  last_active?: string
  country_code?: string
}

// 在线用户数变化
interface OnlineCountChange {
  online: number
}

// WebSocket 消息类型常量
const WS_MSG_SERVER_STATE = "server_state"
const WS_MSG_ONLINE_COUNT = "online_count"
const WS_MSG_HEARTBEAT = "heartbeat"

interface UseWebSocketDeltaReturn {
  servers: NezhaServer[]
  isConnected: boolean
  onlineCount: number
  error: string | null
  reconnect: () => void
}

export function useWebSocketDelta(initialServers: NezhaServer[] = []): UseWebSocketDeltaReturn {
  const [servers, setServers] = useState<NezhaServer[]>(initialServers)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/server-delta`
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log("WebSocket 增量连接已建立")
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      wsRef.current.onmessage = (event) => {
        try {
          const update: ServerDeltaUpdate = JSON.parse(event.data)
          handleDeltaUpdate(update)
        } catch (err) {
          console.error("解析WebSocket消息失败:", err)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log("WebSocket 连接已关闭", event.code, event.reason)
        setIsConnected(false)
        
        // 如果不是主动关闭，尝试重连
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }

      wsRef.current.onerror = (event) => {
        console.error("WebSocket 错误:", event)
        setError("WebSocket 连接错误")
      }
    } catch (err) {
      console.error("创建WebSocket连接失败:", err)
      setError("无法创建WebSocket连接")
    }
  }, [])

  const handleDeltaUpdate = useCallback((update: ServerDeltaUpdate) => {
    switch (update.type) {
      case WS_MSG_SERVER_STATE: {
        const stateChange = update.data as ServerStateChange
        setServers(prevServers => 
          prevServers.map(server => 
            server.id === stateChange.id 
              ? {
                  ...server,
                  state: stateChange.state || server.state,
                  last_active: stateChange.last_active || server.last_active,
                  country_code: stateChange.country_code || server.country_code,
                }
              : server
          )
        )
        break
      }

      case WS_MSG_ONLINE_COUNT: {
        const onlineChange = update.data as OnlineCountChange
        setOnlineCount(onlineChange.online)
        break
      }

      case WS_MSG_HEARTBEAT:
        // 心跳消息，无需处理
        break

      default:
        console.log("未知的WebSocket消息类型:", update.type)
    }
  }, [])

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "主动断开连接")
    }
  }, [])

  // 初始化连接
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  // 更新初始服务器数据
  useEffect(() => {
    setServers(initialServers)
  }, [initialServers])

  return {
    servers,
    isConnected,
    onlineCount,
    error,
    reconnect,
  }
}
