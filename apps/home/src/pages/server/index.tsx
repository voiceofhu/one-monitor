import { useWebSocketContext } from "@/hooks/use-websocket-context"

import ServerTable from "./components/table"
import { vps } from "./types"

export default function Servers() {
  const { lastMessage, connected } = useWebSocketContext()
  if (!connected) {
    return <div className="container mx-auto p-4 min-h-[90vh]">connect...</div>
  }
  const servers: vps[] = lastMessage?.data ? JSON.parse(lastMessage?.data).servers : []
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="container mx-auto px-2 sm:px-6 h-full flex flex-col">
        <ServerTable servers={servers} className="flex-1 flex flex-col min-h-0" />
      </div>
    </div>
  )
}
