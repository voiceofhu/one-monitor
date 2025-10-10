import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useStore } from "@/pages/server/store"
import { vps } from "@/pages/server/types"
import { Table } from "@tanstack/react-table"
import { CircleX, Search as SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"

export function Search({ table }: { table: Table<vps> }) {
  const { keyword, setKeyword } = useStore()
  const [filter, setFilter] = useState<string>(keyword)
  const { t } = useTranslation()
  useEffect(() => {
    setFilter(keyword)
  }, [keyword])

  useDebounce(
    () => {
      table.getColumn("name")?.setFilterValue(filter)
      setKeyword(filter)
    },
    500,
    [filter],
  )

  const clearFilter = () => {
    setFilter("")
    table.getColumn("name")?.setFilterValue("")
    setKeyword("")
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className={cn(
          "h-9 w-[220px] pl-8 pr-8 text-sm",
          filter ? "ring-1 ring-primary/40 focus-visible:ring-primary" : "",
        )}
        placeholder={t("enter_server_name_to_search")}
        onChange={(e) => setFilter(e.target.value)}
        value={filter}
        autoComplete="off"
        spellCheck={false}
        aria-label={t("search_servers_and_apply_filters")}
      />
      {filter ? (
        <button
          type="button"
          onClick={clearFilter}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="清除搜索"
        >
          <CircleX className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
