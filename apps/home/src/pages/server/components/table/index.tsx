import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, getCommonPinningStyles } from "@/lib/utils"
import { SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import "dayjs/locale/zh-cn"
import { useRef, useState } from "react"

import { useStore } from "../../store"
import { vps } from "../../types"
import { TableContainer } from "./body"
import { getColumn } from "./column"
import { Footer } from "./footer"
import { Pin } from "./header/pin"
import { Sort } from "./header/sort"
import { Header } from "./search/index"
import { CardView } from "./card-view"

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
  // 正确使用 useReactTable - 它返回 table 实例，不需要 ref
  const table = useReactTable({
    data: servers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    globalFilterFn: (row) => {
      // 如果没有选中组，显示所有数据
      if (!currentGroup && !status) return true
      // 如果选中了组，只显示该组的服务器
      switch (status) {
        case "online":
          return true
        case "offline":
          return true
        default:
          break
      }
      return currentGroup.servers.includes(row.original.id)
    },
    state: {
      sorting,
      globalFilter: currentGroup ? currentGroup.group.id : "",
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
      <div className="flex-1 rounded-md border overflow-hidden bg-background flex flex-col min-h-0">
        {viewMode === "table" ? (
          <div ref={tableContainerRef} className="flex-1 overflow-auto relative">
            <table
              style={{
                width: table.getTotalSize(),
              }}
            >
              <TableHeader className="sticky top-0 z-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700">
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort()
                      return (
                        <TableHead
                          key={header.id}
                          className={cn("bg-background group h-8 px-0", canSort ? "cursor-pointer hover:bg-gray-50" : "cursor-default")}
                          style={{
                            ...getCommonPinningStyles<vps>(header.column),
                            width: header.column.getSize(),
                            minWidth: header.column.getSize(),
                          }}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div className="flex items-center justify-between gap-0.5 text-xs text-gray-500 dark:text-gray-300 px-1">
                            {header.isPlaceholder ? null : (flexRender(header.column.columnDef.header, header.getContext()) as React.ReactNode)}
                            <Sort header={header} />
                            <Pin header={header} />
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableContainer table={table} tableContainerRef={tableContainerRef} />
            </table>
          </div>
        ) : (
          <CardView servers={filteredServers} />
        )}
      </div>
      {/* Footer */}
      <div className="flex-shrink-0">
        <Footer servers={servers} />
      </div>
    </div>
  )
}
