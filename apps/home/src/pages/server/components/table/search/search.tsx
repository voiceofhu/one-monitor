import { Input } from "@/components/ui/input"
import { useStore } from "@/pages/server/store"
import { vps } from "@/pages/server/types"
import { Table } from "@tanstack/react-table"
import { useState } from "react"
import { useDebounce } from "react-use"

export function Search({ table }: { table: Table<vps> }) {
  const { keyword, setKeyword } = useStore()
  const [filter, setFilter] = useState<string>(keyword)
  useDebounce(
    () => {
      table.getColumn("name")?.setFilterValue(filter)
      setKeyword(filter)
    },
    500,
    [filter],
  )
  return (
    <Input
      className="h-8 w-[200px] cursor-pointer"
      placeholder={`输入服务器名称进行搜索`}
      onChange={(e) => setFilter(e.target.value)}
      value={filter}
    />
  )
}
