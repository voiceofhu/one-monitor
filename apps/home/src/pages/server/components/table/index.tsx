import { cn } from "@/lib/utils"
import { SortingState, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import "dayjs/locale/zh-cn"
import { useMemo, useRef, useState } from "react"

import { useStore } from "../../store"
import { vps } from "../../types"
import { CardView } from "./card-view"
import { getColumn } from "./column"
import { Footer } from "./footer"
import { Header } from "./search/index"
import { TableView } from "./table-view"

// 服务器数据类型定义

interface ServerTableProps {
  servers: vps[]
  now?: number
  className?: string
  tableHeight?: number // 允许自定义表格高度
}

// 获取状态颜色

export default function ServerTable({ servers, className }: ServerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [viewMode, setViewMode] = useState<"table" | "card">("table")
  const defaultColumns = getColumn(servers)
  const [columns] = useState<typeof defaultColumns>(() => [...defaultColumns.filter((it) => it)])
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    host_cpu: false, // CPU 列默认隐藏
    host_arch: false,
    state_process_count: false,
  })
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { currentGroup, status } = useStore()

  const filteredByFilters = useMemo(() => {
    const groupIds = currentGroup ? new Set(currentGroup.servers) : null
    return servers.filter((server) => {
      if (groupIds && !groupIds.has(server.id)) {
        return false
      }
      if (status === "online") {
        return isServerOnline(server)
      }
      if (status === "offline") {
        return !isServerOnline(server)
      }
      return true
    })
  }, [servers, currentGroup, status])

  // 正确使用 useReactTable - 它返回 table 实例，不需要 ref
  const table = useReactTable({
    data: filteredByFilters,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      columnVisibility,
    },
    initialState: {
      columnPinning: {
        left: ["name"],
      },
    },
  })
  const filteredServers = table.getRowModel().rows.map((row) => row.original)
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* 统计和搜索 */}
      <div className="flex-shrink-0 py-2">
        <Header table={table} setColumnVisibility={setColumnVisibility} viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* 表格容器 */}
      {viewMode === "table" ? (
        <div className="flex-1 rounded-md border overflow-hidden bg-background flex flex-col min-h-0">
          <TableView table={table} tableContainerRef={tableContainerRef} />
        </div>
      ) : (
        <CardView servers={filteredServers} />
      )}
      {/* Footer */}
      <div className="flex-shrink-0">
        <Footer servers={filteredServers} />
      </div>
    </div>
  )
}

function isServerOnline(server: vps) {
  return Boolean((server.state.uptime || 0) > 0 || (server.state.net_in_speed || server.state.net_out_speed || 0) > 0)
}
