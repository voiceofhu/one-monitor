import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/pages/server/store"

interface StateFilterProps {
  variant?: "default" | "small"
}

export function StateFilter({ variant = "default" }: StateFilterProps) {
  const { status, statusList, setStatus } = useStore()

  // 处理选择变化
  const handleValueChange = (value: string) => {
    if (value === "all") {
      // 清空选择
      setStatus(null)
      return
    }
    const currentVal = statusList.find((item) => item.value === value)
    if (currentVal) setStatus(currentVal.value)
  }

  return (
    <Select value={status || "all"} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className="w-auto min-w-[120px]">
        <SelectValue placeholder="请选择分组" />
      </SelectTrigger>
      <SelectContent>
        {/* 添加清空选项 */}
        <SelectItem value="all">
          <span className="">全部状态</span>
        </SelectItem>
        {statusList.map((status) => (
          <SelectItem key={status.value || "all"} value={status.value}>
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
