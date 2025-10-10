import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCommonPinningStyles } from "@/lib/utils"
import { flexRender, type Table } from "@tanstack/react-table"
import { type ReactNode, type RefObject } from "react"

import { vps } from "../../types"
import { TableContainer } from "./body"
import { Pin } from "./header/pin"
import { Sort } from "./header/sort"

interface TableViewProps {
  table: Table<vps>
  tableContainerRef: RefObject<HTMLDivElement>
}

export function TableView({ table, tableContainerRef }: TableViewProps) {
  return (
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
                    className={`bg-background group h-8 px-0 ${canSort ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
                    style={{
                      ...getCommonPinningStyles<vps>(header.column),
                      width: header.column.getSize(),
                      minWidth: header.column.getSize(),
                    }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center justify-between gap-0.5 text-xs text-gray-500 dark:text-gray-300 px-1">
                      {header.isPlaceholder ? null : (flexRender(header.column.columnDef.header, header.getContext()) as ReactNode)}
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
  )
}
