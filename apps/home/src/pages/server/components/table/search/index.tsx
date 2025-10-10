import { Button } from "@/components/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useStore } from "@/pages/server/store"
import { vps } from "@/pages/server/types"
import { Table } from "@tanstack/react-table"
import { Filter, LayoutGrid, Search as SearchIcon, Settings, Table as TableIcon, X } from "lucide-react"
import { type Dispatch, type SetStateAction, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"

import { ColumnVisibility } from "./column-visible"
import { GroupFilter } from "./group"
import { Search } from "./search"
import { StateFilter } from "./status"
import { Tips } from "./tips"

// 移动端搜索和筛选抽屉组件
function MobileSearchDrawer({
  table,
  setColumnVisibility,
}: {
  table: Table<vps>
  setColumnVisibility: Dispatch<SetStateAction<Record<string, boolean>>>
}) {
  const { t } = useTranslation()
  const { keyword, setKeyword } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<string>(keyword)

  // 防抖搜索
  useDebounce(
    () => {
      table.getColumn("name")?.setFilterValue(filter)
      setKeyword(filter)
    },
    500,
    [filter],
  )

  // 同步外部关键字变化
  useEffect(() => {
    setFilter(keyword)
  }, [keyword])

  const clearSearch = () => {
    setFilter("")
    table.getColumn("name")?.setFilterValue("")
    setKeyword("")
  }

  return (
    <div className="sm:hidden">
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        {/* @ts-expect-error React 19 type compatibility */}
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 px-3 gap-2" aria-label={t("search_and_filter")}>
            {/* @ts-expect-error React 19 type compatibility */}
            <SearchIcon className="w-4 h-4" />
            <span className="text-sm">{keyword ? `"${keyword}"` : t("search")}</span>
            {/* @ts-expect-error React 19 type compatibility */}
            <Filter className="w-4 h-4" />
          </Button>
        </DrawerTrigger>

        {/* @ts-expect-error React 19 type compatibility */}
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left pb-4">
            {/* @ts-expect-error React 19 type compatibility */}
            <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
              {/* @ts-expect-error React 19 type compatibility */}
              <SearchIcon className="w-5 h-5" />
              {t("search_and_filter")}
            </DrawerTitle>
            {/* @ts-expect-error React 19 type compatibility */}
            <DrawerDescription className="text-sm text-muted-foreground">{t("search_servers_and_apply_filters")}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-6 mobile-search-content">
            {/* 搜索部分 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {/* @ts-expect-error React 19 type compatibility */}
                <SearchIcon className="w-4 h-4" />
                {t("search")}
              </h3>
              <div className="relative">
                <Input
                  placeholder={t("enter_server_name_to_search")}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-12 pl-10 pr-10 text-base mobile-search-input"
                  autoFocus
                />
                {/* @ts-expect-error React 19 type compatibility */}
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {filter && (
                  <Button variant="ghost" size="sm" onClick={clearSearch} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0">
                    {/* @ts-expect-error React 19 type compatibility */}
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {filter && (
                <p className="text-xs text-muted-foreground">
                  {t("searching_for")}: "{filter}"
                </p>
              )}
            </div>

            <Separator />

            {/* 筛选部分 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {/* @ts-expect-error React 19 type compatibility */}
                <Filter className="w-4 h-4" />
                {t("filters")}
              </h3>

              {/* 分组筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("group")}</label>
                <GroupFilter variant="small" />
              </div>

              {/* 状态筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("status")}</label>
                <StateFilter variant="small" />
              </div>
            </div>

            <Separator />

            {/* 显示设置部分 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {/* @ts-expect-error React 19 type compatibility */}
                <Settings className="w-4 h-4" />
                {t("display_settings")}
              </h3>

              {/* 列可见性 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("columns")}</label>
                <ColumnVisibility table={table} setColumnVisibility={setColumnVisibility} />
              </div>

              {/* 帮助提示 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("help")}</label>
                <Tips />
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-4">
            {/* @ts-expect-error React 19 type compatibility */}
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                {/* @ts-expect-error React 19 type compatibility */}
                <X className="w-4 h-4 mr-2" />
                {t("close")}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export function Header({
  table,
  setColumnVisibility,
  viewMode,
  setViewMode,
}: {
  table: Table<vps>
  setColumnVisibility: Dispatch<SetStateAction<Record<string, boolean>>>
  viewMode: "table" | "card"
  setViewMode: Dispatch<SetStateAction<"table" | "card">>
}) {
  return (
    <>
      {/* 移动端：使用抽屉式搜索和筛选 */}
      <div className="sm:hidden space-y-2">
        <MobileSearchDrawer table={table} setColumnVisibility={setColumnVisibility} />
        <TooltipProvider delayDuration={150}>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "table" | "card")}
            variant="outline"
            size="sm"
            className="!w-full justify-center border border-border/60 bg-background/80 shadow-sm"
          >
            <Tooltip>
              {/* @ts-expect-error React 19 type compatibility */}
              <TooltipTrigger asChild>
                <ToggleGroupItem value="table" className="px-3 py-2 gap-2 text-xs font-medium">
                  {/* @ts-expect-error React 19 type compatibility */}
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                切换为表格布局展示
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              {/* @ts-expect-error React 19 type compatibility */}
              <TooltipTrigger asChild>
                <ToggleGroupItem value="card" className="px-3 py-2 gap-2 text-xs font-medium">
                  {/* @ts-expect-error React 19 type compatibility */}
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                切换为卡片布局展示
              </TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </TooltipProvider>
      </div>

      {/* 桌面端：保持原有布局 */}
      <div className="hidden sm:flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-start">
        <div className="flex items-center gap-2">
          <Search table={table} />
          <GroupFilter variant="small" />
          <StateFilter variant="small" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ColumnVisibility table={table} setColumnVisibility={setColumnVisibility} />
            <TooltipProvider delayDuration={150}>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as "table" | "card")}
                variant="outline"
                size="sm"
                className="border border-border/60 bg-background/80 shadow-sm"
              >
                <Tooltip>
                  {/* @ts-expect-error React 19 type compatibility */}
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="table" className="px-3 py-2 gap-2 text-xs font-medium">
                      {/* @ts-expect-error React 19 type compatibility */}
                      <TableIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    切换为表格布局展示
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  {/* @ts-expect-error React 19 type compatibility */}
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="card" className="px-3 py-2 gap-2 text-xs font-medium">
                      {/* @ts-expect-error React 19 type compatibility */}
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    切换为卡片布局展示
                  </TooltipContent>
                </Tooltip>
              </ToggleGroup>
            </TooltipProvider>
            <Tips />
          </div>
        </div>
      </div>
    </>
  )
}
