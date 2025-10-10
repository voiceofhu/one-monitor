import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useStore } from "@/pages/server/store"
import { useMemo } from "react"

interface StateFilterProps {
  variant?: "default" | "small"
}

export function StateFilter({ variant = "default" }: StateFilterProps) {
  const { status, statusList, setStatus } = useStore()

  // 处理选择变化
  const handleValueChange = (value: string) => {
    if (value === "all") {
      setStatus(null)
      return
    }
    const currentVal = statusList.find((item) => item.value === value)
    if (currentVal) setStatus(currentVal.value)
  }

  const triggerClassName = useMemo(
    () => cn("w-auto min-w-[140px]", variant === "small" ? "h-8 text-xs" : "h-9 text-sm"),
    [variant],
  )

  return (
    <Select value={status || "all"} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className={triggerClassName}>
        <SelectValue placeholder="全部状态" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span>全部状态</span>
        </SelectItem>
        {statusList.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
