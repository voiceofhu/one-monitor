import { cn } from "@/lib/utils"
import { m } from "framer-motion"
import type { ReactNode } from "react"

export function Progress({
  value,
  usagePercentage,
  className,
  size = "md",
  textClassName = "",
  mode = "usage", // 新增模式参数
}: {
  value: ReactNode
  usagePercentage: number
  className?: string
  showPercentage?: boolean
  size?: "sm" | "md" | "lg"
  textClassName?: string
  mode?: "usage" | "health" // usage: 使用率模式（越高越差），health: 健康值模式（越高越好）
}) {
  // 状态分级 - 根据模式决定逻辑
  let status: "healthy" | "warning" | "alarm"
  
  if (mode === "health") {
    // 健康值模式：值越高越健康
    if (usagePercentage >= 85) status = "healthy"
    else if (usagePercentage > 60) status = "warning"
    else status = "alarm"
  } else {
    // 使用率模式：值越高越危险
    if (usagePercentage < 70) status = "healthy"
    else if (usagePercentage < 90) status = "warning"
    else status = "alarm"
  }

  // 颜色配置
  const colorMap = {
    healthy: {
      bg: "bg-primary/10",
      stripe: "", // 健康状态不显示斑马纹
    },
    warning: {
      bg: "bg-yellow-100", 
      stripe: mode === "health" 
        ? "bg-[repeating-linear-gradient(135deg,#fef9c3_0px,#fef9c3_8px,#fde68a_8px,#fde68a_16px)] opacity-40 animate-zebra"
        : "bg-[repeating-linear-gradient(135deg,#fef9c3_0px,#fef9c3_8px,#fde68a_8px,#fde68a_16px)] opacity-40",
    },
    alarm: {
      bg: "bg-red-400/90",
      stripe: "bg-[repeating-linear-gradient(135deg,#f87171_0px,#f87171_8px,#ef4444_8px,#ef4444_16px)] animate-zebra opacity-80",
    },
  }
  const { bg, stripe } = colorMap[status]

  const sizeMap = {
    sm: { height: "h-3", text: "text-xs" },
    md: { height: "h-5", text: "text-xs" },
    lg: { height: "h-7", text: "text-base" },
  }
  const { height, text } = sizeMap[size]

  return (
    <div
      role="progressbar"
      aria-valuenow={usagePercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative w-full overflow-hidden rounded bg-neutral-100 border border-neutral-200",
        height,
        className
      )}
    >
      <m.div
        className={cn(
          "absolute left-0 top-0 h-full transition-all duration-700 rounded-r",
          bg,
          stripe
        )}
        initial={{ width: 0 }}
        animate={{ width: `${usagePercentage}%` }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      />
      <div
        className={cn(
          "relative z-10 flex h-full items-center justify-end",
          text,
          "text-black font-medium",
          textClassName
        )}
      >
        <span className="mx-1">{value}</span>
      </div>
    </div>
  )
}
