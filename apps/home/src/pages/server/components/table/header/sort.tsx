import { vps } from "@/pages/server/types"
import { Header } from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"

interface SortProps {
  header: Header<vps, unknown>
}
export function Sort({ header }: SortProps) {
  const canSort = header.column.getCanSort()
  return (
    <>
      {canSort && (
        <div className="flex flex-col">
          {header.column.getIsSorted() === "asc" && <ChevronDown className="w-4 h-4" />}
          {header.column.getIsSorted() === "desc" && <ChevronUp className="w-4 h-4" />}
          {!header.column.getIsSorted() && <div />}
        </div>
      )}
    </>
  )
}
