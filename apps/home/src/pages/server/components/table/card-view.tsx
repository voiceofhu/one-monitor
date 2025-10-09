import { AnimatedNumber } from "@/components/animated-number"
import { Badge } from "@/components/ui/badge"
import { cn, formatBytes, formatBytesWithUnifiedUnit, formatUptime } from "@/lib/utils"
import { type ReactNode } from "react"

import { vps } from "../../types"
import { calculateHealthScore } from "./column/health"

export function CardView({ servers }: { servers: vps[] }) {
  if (!servers.length) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground px-4 py-8">暂无服务器数据</div>
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {servers.map((server) => {
          const cpuUsage = server.state.cpu || 0

          const memTotal = server.host.mem_total || 0
          const memUsed = server.state.mem_used || 0
          const memUsage = memTotal > 0 ? (memUsed / memTotal) * 100 : 0
          const { value1: memUsedValue, value2: memTotalValue, unit: memUnit } = formatBytesWithUnifiedUnit(memUsed, memTotal)

          const diskTotal = server.host.disk_total || 0
          const diskUsed = server.state.disk_used || 0
          const diskUsage = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0
          const { value1: diskUsedValue, value2: diskTotalValue, unit: diskUnit } = formatBytesWithUnifiedUnit(diskUsed, diskTotal)

          const netInSpeed = formatBytes(server.state.net_in_speed || 0)
          const netOutSpeed = formatBytes(server.state.net_out_speed || 0)

          const netInTransfer = formatBytes(server.state.net_in_transfer || 0)
          const netOutTransfer = formatBytes(server.state.net_out_transfer || 0)

          const uptime = formatUptime(server.state.uptime || 0)
          const healthScore = calculateHealthScore(server)
          const isOnline = (server.state.uptime || 0) > 0 || (server.state.net_in_speed || server.state.net_out_speed || 0) > 0

          const memDetail = memTotal > 0 ? `${memUsedValue} / ${memTotalValue} ${memUnit}` : ""
          const diskDetail = diskTotal > 0 ? `${diskUsedValue} / ${diskTotalValue} ${diskUnit}` : ""
          const platformLabel = [server.host.platform, server.host.platform_version].filter(Boolean).join(" ")
          const osLabel = [platformLabel, server.host.arch].filter(Boolean).join(" / ") || "-"
          const uptimeLabel = uptime || "离线"
          const statusTone = isOnline ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"

          return (
            <div
              key={server.id}
              className="h-full rounded-3xl bg-card/95 border border-border/40 shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_18px_32px_rgba(15,23,42,0.12)]"
            >
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-tight truncate">{server.name}</h3>
                    {server.host.ip ? <p className="mt-1 text-[12px] text-muted-foreground truncate">{server.host.ip}</p> : null}
                  </div>
                  <Badge className={`text-xs px-3 py-1 rounded-full font-medium ${statusTone}`}>{isOnline ? "在线" : "离线"}</Badge>
                </div>

                <div className="rounded-2xl bg-muted/30 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>健康值</span>
                    <AnimatedNumber value={healthScore} decimals={0} className="text-sm font-semibold text-primary" />
                  </div>
                  <InlineBar percentage={healthScore} />
                </div>

                <div className="rounded-2xl bg-muted/20 px-4 py-3 space-y-3 text-xs">
                  <InfoRow label="操作系统">
                    <span className="text-sm font-medium text-foreground">{osLabel}</span>
                  </InfoRow>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <MetricBlock label="CPU" value={cpuUsage} percentage={cpuUsage} suffix="%" decimals={1} />
                    <MetricBlock label="内存" value={memUsage} percentage={memUsage} suffix="%" decimals={1} detail={memDetail} />
                    <MetricBlock label="磁盘" value={diskUsage} percentage={diskUsage} suffix="%" decimals={1} detail={diskDetail} />
                    <InfoRow label="在线时间">
                      <span className={`text-sm font-medium ${isOnline ? "text-emerald-600" : "text-rose-500"}`}>{uptimeLabel}</span>
                    </InfoRow>
                  </div>

                  <SummaryRow label="总流量" up={netInTransfer} down={netOutTransfer} />
                  <SummaryRow label="网络" up={`${netInSpeed}/s`} down={`${netOutSpeed}/s`} />
                </div>

                <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                  <span>
                    进程数{" "}
                    {typeof server.state.process_count === "number" ? (
                      <AnimatedNumber value={server.state.process_count} decimals={0} />
                    ) : (
                      "-"
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>
                      TCP{" "}
                      {typeof server.state.tcp_conn_count === "number" ? (
                        <AnimatedNumber value={server.state.tcp_conn_count} decimals={0} />
                      ) : (
                        "-"
                      )}
                    </span>
                    /
                    <span>
                      UDP{" "}
                      {typeof server.state.udp_conn_count === "number" ? (
                        <AnimatedNumber value={server.state.udp_conn_count} decimals={0} />
                      ) : (
                        "-"
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MetricBlock({
  label,
  value,
  percentage,
  detail,
  decimals = 0,
  suffix = "",
}: {
  label: string
  value: number
  percentage: number
  detail?: string
  decimals?: number
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-background/80 px-3 py-3 shadow-inner">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} className="text-sm font-medium text-foreground" />
      </div>
      <InlineBar percentage={percentage} />
      {detail ? <span className="text-[10px] text-muted-foreground">{detail}</span> : null}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/80 px-3 py-3 shadow-inner">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function SummaryRow({ label, up, down }: { label: string; up: string; down: string }) {
  const renderValue = (value: string, type: "up" | "down") => {
    const trimmed = value.trim()
    const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (!match) {
      return <span>{value}</span>
    }
    const [, numericPart, unitPart = ""] = match
    const numericValue = Number.parseFloat(numericPart)
    if (Number.isNaN(numericValue)) {
      return <span>{value}</span>
    }
    const decimals = numericPart.includes(".") ? numericPart.split(".")[1].length : 0
    return (
      <span className={cn("flex items-center gap-1", type === "up" ? "text-emerald-500" : "text-sky-500")}>
        {type === "up" ? <UpArrowIcon className="h-3 w-3" /> : <DownArrowIcon className="h-3 w-3" />}
        <AnimatedNumber value={numericValue} decimals={decimals} suffix={unitPart} />
      </span>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/80 px-3 py-3 shadow-inner text-xs">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="flex items-center gap-3 font-medium">
        {renderValue(up, "up")}
        {renderValue(down, "down")}
      </span>
    </div>
  )
}

function InlineBar({ percentage }: { percentage: number }) {
  const value = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0))
  return (
    <div className="h-2 rounded-full bg-muted/60">
      <div className="h-full rounded-full bg-primary/80 transition-all" style={{ width: `${value}%` }} />
    </div>
  )
}

function UpArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn("h-3.5 w-3.5", className)}>
      <path d="M5.25 5.25h5.5v5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.25 10.75 10.75 5.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn("h-3.5 w-3.5", className)}>
      <path d="M10.75 10.75h-5.5v-5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.25 5.25 10.75 10.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
