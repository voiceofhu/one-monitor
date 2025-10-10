import { AnimatedNumber } from "@/components/animated-number"
import { Separator } from "@/components/ui/separator"
import { formatBytes } from "@/lib/utils"
import { Activity, ArrowDown01, ArrowUp01, Database } from "lucide-react"
import { useTranslation } from "react-i18next"

import { vps } from "../../types"

interface TableFooterProps {
  servers: vps[]
}

export function Footer({ servers }: TableFooterProps) {
  const { t } = useTranslation()

  const total_up_speed = servers.reduce((total, server) => {
    return total + (server.state.net_out_speed || 0)
  }, 0) // 计算总上传速率
  const total_down_speed = servers.reduce((total, server) => {
    return total + (server.state.net_in_speed || 0)
  }, 0) // 计算总下载速率
  const total_up_transfer = servers.reduce((total, server) => {
    return total + (server.state.net_out_transfer || 0)
  }, 0) // 计算总上传流量
  const total_down_transfer = servers.reduce((total, server) => {
    return total + (server.state.net_in_transfer || 0)
  }, 0) // 计算总下载流量

  const stats = [
    {
      icon: Database,
      label: t("total_upload_transfer"),
      value: formatBytes(total_up_transfer),
      type: "upload" as const,
    },
    {
      icon: Database,
      label: t("total_download_transfer"),
      value: formatBytes(total_down_transfer),
      type: "download" as const,
    },
    {
      icon: Activity,
      label: t("upload_speed"),
      value: `${formatBytes(total_up_speed)}/s`,
      type: "upload" as const,
    },
    {
      icon: Activity,
      label: t("download_speed"),
      value: `${formatBytes(total_down_speed)}/s`,
      type: "download" as const,
    },
  ]

  const renderAnimatedValue = (value: string, className?: string) => {
    const trimmed = value.trim()
    const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (!match) {
      return <span className={className}>{value}</span>
    }
    const [, numericPart, unitPart = ""] = match
    const numericValue = Number.parseFloat(numericPart)
    if (Number.isNaN(numericValue)) {
      return <span className={className}>{value}</span>
    }
    const decimals = numericPart.includes(".") ? numericPart.split(".")[1].length : 0
    return <AnimatedNumber value={numericValue} decimals={decimals} suffix={unitPart} className={className} />
  }

  return (
    <div className="bg-background py-3">
      {/* 桌面端：水平布局 */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex gap-6 items-center text-xs text-muted-foreground">
          {/* 流量统计 */}
          <div className="flex items-center gap-4">
            {stats.slice(0, 2).map((stat, index) => (
              <div key={index} className="flex items-center gap-1.5">
                {/* @ts-expect-error React 19 type compatibility */}
                {stat.type === "upload" ? <ArrowUp01 className="w-3 h-3 text-blue-500" /> : <ArrowDown01 className="w-3 h-3 text-green-500" />}
                <span className="font-medium">{stat.label}:</span>
                <span className="font-mono">{renderAnimatedValue(stat.value)}</span>
              </div>
            ))}
          </div>

          <Separator orientation="vertical" className="h-4" />

          {/* 速率统计 */}
          <div className="flex items-center gap-4">
            {stats.slice(2, 4).map((stat, index) => (
              <div key={index} className="flex items-center gap-1.5">
                {/* @ts-expect-error React 19 type compatibility */}
                {stat.type === "upload" ? <ArrowUp01 className="w-3 h-3 text-blue-500" /> : <ArrowDown01 className="w-3 h-3 text-green-500" />}
                <span className="font-medium">{stat.label}:</span>
                <span className="font-mono">{renderAnimatedValue(stat.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("total_servers")}:{" "}
          <span className="font-mono font-medium">
            <AnimatedNumber value={servers.length} decimals={0} />
          </span>
        </div>
      </div>

      {/* 移动端：网格布局 */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">{t("network_stats")}</h4>
          <span className="text-xs text-muted-foreground">
            {t("total_servers")}:{" "}
            <span className="font-mono font-medium">
              <AnimatedNumber value={servers.length} decimals={0} />
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg bg-secondary/50">
              {stat.type === "upload" ? (
                <ArrowUp01 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <ArrowDown01 className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground truncate">{stat.label}</div>
                <div className="text-sm font-mono font-medium text-foreground">{renderAnimatedValue(stat.value)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
