import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/pages/server/store"
import { useEffect } from "react"

interface GroupFilterProps {
  variant?: "default" | "small"
}

export function GroupFilter({ variant = "default" }: GroupFilterProps) {
  const { currentGroup, groups, setCurrentGroup, setGroups } = useStore()

  // 初始化数据
  useEffect(() => {
    if (!groups.length) {
      setGroups([])
    }
  }, [groups.length, setGroups])

  // 处理选择变化
  const handleValueChange = (value: string) => {
    if (value === "all") {
      // 清空选择
      setCurrentGroup(null)
      return
    }

    const selectedGroup = [...[]].find((item) => item.group.name === value)

    if (selectedGroup) {
      setCurrentGroup(selectedGroup)
    }
  }

  return (
    <Select value={currentGroup?.group.name || "all"} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className="w-auto min-w-[120px]">
        <SelectValue placeholder="请选择分组" />
      </SelectTrigger>
      <SelectContent>
        {/* 添加清空选项 */}
        <SelectItem value="all">
          <span className="">全部分组</span>
        </SelectItem>
        {groups.map((group) => (
          <SelectItem key={group.group.id || "all"} value={group.group.name}>
            {group.group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
