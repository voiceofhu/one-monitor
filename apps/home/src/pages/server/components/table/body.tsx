import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { getCommonPinningStyles } from "@/lib/utils"
import { Row, Table, flexRender } from "@tanstack/react-table"
import { VirtualItem, Virtualizer, useVirtualizer } from "@tanstack/react-virtual"

import { vps } from "../../types"

export function TableContainer({ table, tableContainerRef }: { table: Table<vps>; tableContainerRef: React.RefObject<HTMLDivElement> }) {
  const { rows } = table.getRowModel()
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 29, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  })
  return (
    <TableBody
      className="w-full"
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index] as Row<vps>
        return <TableBodyRow key={row.id} total={rows.length} row={row} virtualRow={virtualRow} rowVirtualizer={rowVirtualizer} />
      })}
    </TableBody>
  )
}
interface TableBodyRowProps {
  row: Row<vps>
  virtualRow: VirtualItem
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>
  total: number
}
export function TableBodyRow({ row, virtualRow, rowVirtualizer, total }: TableBodyRowProps) {
  return (
    <TableRow
      data-index={virtualRow.index} //needed for dynamic row height measurement
      ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
      key={row.id}
      className="flex absolute w-full border-none  min-w-max"
      style={{
        transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
      }}
    >
      {row.getVisibleCells().map((cell) => {
        return (
          <TableCell
            key={cell.id}
            className={`truncate bg-background  w-full ${virtualRow.index === total - 1 ? "" : " border-b"}`}
            style={{
              ...getCommonPinningStyles<vps>(cell.column),
              width: cell.column.getSize(),
              minWidth: cell.column.getSize(),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext()) as React.ReactNode}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
