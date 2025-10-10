import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchServerGroup } from "@/lib/nezha-api"
import { cn } from "@/lib/utils"
import { useStore } from "@/pages/server/store"
import { useEffect, useMemo, useRef, useState } from "react"

interface GroupFilterProps {
  variant?: "default" | "small"
}

export function GroupFilter({ variant = "default" }: GroupFilterProps) {
  const { currentGroup, groups, setCurrentGroup, setGroups } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  // 初始化数据
  useEffect(() => {
    if (groups.length || hasFetchedRef.current) return
    let cancelled = false
    const loadGroups = async () => {
      try {
        setLoading(true)
        hasFetchedRef.current = true
        const response = await fetchServerGroup()
        if (!response?.success) {
          throw new Error("加载分组失败")
        }
        if (cancelled) return
        const data = response.data ?? []
        setGroups(data)
        if (currentGroup) {
          const stillExists = data.some((item) => item.group.id === currentGroup.group.id)
          if (!stillExists) {
            setCurrentGroup(null)
          }
        }
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载分组失败")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void loadGroups()
    return () => {
      cancelled = true
    }
  }, [currentGroup, groups.length, setCurrentGroup, setGroups])

  const handleRetry = () => {
    hasFetchedRef.current = false
    setError(null)
    setGroups([])
  }

  // 处理选择变化
  const handleValueChange = (value: string) => {
    if (value === "retry") {
      handleRetry()
      return
    }

    if (value === "all") {
      setCurrentGroup(null)
      return
    }

    const selectedGroup = groups.find((item) => String(item.group.id) === value)

    if (selectedGroup) {
      setCurrentGroup(selectedGroup)
    }
  }

  const triggerClassName = useMemo(
    () =>
      cn(
        "w-auto min-w-[140px]",
        variant === "small" ? "h-8 text-xs" : "h-9 text-sm",
        loading ? "pointer-events-none opacity-70" : "",
      ),
    [variant, loading],
  )

  return (
    <Select value={currentGroup ? String(currentGroup.group.id) : "all"} onValueChange={handleValueChange} disabled={loading && !groups.length}>
      <SelectTrigger size="sm" className={triggerClassName}>
        <SelectValue placeholder={loading ? "正在加载..." : error ? "加载失败，点击重试" : "选择分组"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span>全部分组</span>
        </SelectItem>
        {error ? (
          <SelectItem value="retry" className="text-rose-500">
            重新加载分组
          </SelectItem>
        ) : null}
        {groups.map((group) => (
          <SelectItem key={group.group.id} value={String(group.group.id)}>
            {group.group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
