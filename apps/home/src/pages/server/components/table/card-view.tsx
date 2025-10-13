import ServerFlag from "@/components/ServerFlag"
import { AnimatedNumber } from "@/components/animated-number"
import { cn, formatBytes, formatBytesWithUnifiedUnit } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, Gauge, Timer } from "lucide-react"
import { type CSSProperties, type ReactNode } from "react"

import { vps } from "../../types"
import { calculateHealthScore } from "./column/health"
import { Progress } from "./progress"

type CardToneState = "offline" | "danger" | "warning" | "healthy"

type CardToneConfig = {
  badgeClassName: string
  badgeStyle?: CSSProperties
  cardClassName: string
  cardStyle?: CSSProperties
  state: CardToneState
}

function resolveCardTone(isOnline: boolean, healthPercentage: number): CardToneConfig {
  if (!isOnline) {
    return {
      badgeClassName: "bg-muted text-muted-foreground",
      cardClassName: "border-border/40 bg-muted/40 text-muted-foreground/80 opacity-80",
      state: "offline",
    }
  }

  const safeHealth = Math.max(0, Math.min(100, healthPercentage))
  const state: CardToneState = safeHealth <= 60 ? "danger" : safeHealth < 85 ? "warning" : "healthy"

  const hue = (safeHealth / 100) * 120
  const tintColor = `hsla(${hue}, 85%, 60%, 0.22)`
  const backdropColor = `hsla(${hue}, 80%, 62%, 0.08)`
  const borderColor = `hsla(${hue}, 75%, 45%, 0.45)`
  const shadowStroke = `hsla(${hue}, 75%, 45%, 0.16)`
  const gradientStop = Math.max(safeHealth, 10)
  const gradientFadeStop = Math.min(gradientStop + 25, 100)

  const badgeBackground = `hsla(${hue}, 85%, 62%, 0.18)`
  const badgeTextColor = `hsla(${hue}, 85%, 28%, 0.95)`

  return {
    badgeClassName: "",
    badgeStyle: {
      backgroundColor: badgeBackground,
      color: badgeTextColor,
    },
    cardClassName: "",
    cardStyle: {
      borderColor,
      backgroundColor: backdropColor,
      backgroundImage: `linear-gradient(135deg, ${tintColor} 0%, ${tintColor} ${gradientStop}%, transparent ${gradientFadeStop}%)`,
      boxShadow: `inset 0 0 0 1px ${shadowStroke}`,
    },
    state,
  }
}

export function CardView({ servers }: { servers: vps[] }) {
  if (!servers.length) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground px-4 py-8">暂无服务器数据</div>
  }

  return (
    <div className="flex-1 overflow-auto ">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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

          const swapTotal = server.host.swap_total || 0
          const swapUsed = server.state.swap_used || 0
          const swapUsage = swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0
          const { value1: swapUsedValue, value2: swapTotalValue, unit: swapUnit } = formatBytesWithUnifiedUnit(swapUsed, swapTotal)
          const swapDetail = swapTotal > 0 ? `${swapUsedValue} / ${swapTotalValue} ${swapUnit}` : ""

          const netInSpeed = formatBytes(server.state.net_in_speed || 0)
          const netOutSpeed = formatBytes(server.state.net_out_speed || 0)

          const netInTransfer = formatBytes(server.state.net_in_transfer || 0)
          const netOutTransfer = formatBytes(server.state.net_out_transfer || 0)

          const uptimeSeconds = server.state.uptime || 0
          const load1 = server.state.load_1 ?? 0
          const load5 = server.state.load_5 ?? 0
          const load15 = server.state.load_15 ?? 0
          // const cpuCores = server.host.cpu?.length || 1
          // const loadSummary = cpuCores > 0 ? `${load5.toFixed(2)} / ${cpuCores}` : load5.toFixed(2)
          const loadDetail = `${load1.toFixed(2)} · ${load5.toFixed(2)} ·  ${load15.toFixed(2)}`

          const healthScore = calculateHealthScore(server)
          const healthPercentage = Math.max(0, Math.min(100, healthScore))
          // const healthPercentage = 0
          const isOnline = uptimeSeconds > 0 || (server.state.net_in_speed || server.state.net_out_speed || 0) > 0
          const uptimeLabel = isOnline ? formatUptimeCompact(uptimeSeconds) : "离线"

          const memDetail = memTotal > 0 ? `${memUsedValue} / ${memTotalValue} ${memUnit}` : ""
          const diskDetail = diskTotal > 0 ? `${diskUsedValue} / ${diskTotalValue} ${diskUnit}` : ""
          const platformLabel = [server.host.platform, server.host.platform_version].filter(Boolean).join(" ")
          const osLabel = [platformLabel, server.host.arch].filter(Boolean).join(" / ") || "-"
          const countryCode = (server.country_code || server.host.country_code || "").trim()
          const cardTone = resolveCardTone(isOnline, healthPercentage)

          const temperatureReadings = normalizeTemperatures(server.state.temperatures)
          const hasTemperatures = temperatureReadings.length > 0

          const metrics: { label: string; percentage: number; detail?: string }[] = [
            { label: "CPU", percentage: cpuUsage },
            { label: "内存", percentage: memUsage, detail: memDetail },
            { label: "磁盘", percentage: diskUsage, detail: diskDetail },
            { label: "月流量", percentage: diskUsage, detail: netInTransfer },
            // { label: "磁盘", percentage: diskUsage, detail: diskDetail },
          ]
          if (swapTotal > 0) {
            metrics.push({ label: "交换分区", percentage: swapUsage, detail: swapDetail })
          }

          return (
            <div
              key={server.id}
              className={cn("h-full rounded-2xl border bg-background/60 p-3 transition-colors", cardTone.cardClassName)}
              style={cardTone.cardStyle}
              aria-disabled={!isOnline}
              data-health-state={cardTone.state}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {countryCode ? <ServerFlag country_code={countryCode} className="text-[14px]" /> : null}
                    <span className="truncate text-[12px] font-semibold leading-tight text-foreground">{server.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("rounded-full px-2 py-1 text-[10px] font-medium leading-none", cardTone.badgeClassName)}
                      style={cardTone.badgeStyle}
                    >
                      {isOnline ? <AnimatedNumber value={healthScore} decimals={0} /> : "离线"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-muted/10  py-2 space-y-2 text-[11px]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {metrics.map((metric) => (
                      <MetricCard key={metric.label} label={`${metric.label}`} percentage={metric.percentage} detail={metric.detail} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MetaInfo label="系统" value="" detail={osLabel} />
                    <MetaInfo
                      label="在线时间"
                      value=""
                      detail={uptimeLabel}
                      icon={<Timer className="h-3.5 w-3.5" />}
                      valueClassName={isOnline ? "text-emerald-600" : "text-rose-500"}
                    />
                  </div>
                  <div>
                    <MetaInfo label="平均负载" value={loadDetail} icon={<Gauge className="h-3.5 w-3.5" />} />
                  </div>

                  <TrafficBlock
                    uploadSpeed={`${netOutSpeed}/s`}
                    downloadSpeed={`${netInSpeed}/s`}
                    uploadTransfer={netOutTransfer}
                    downloadTransfer={netInTransfer}
                  />

                  {hasTemperatures ? <TemperatureBlock temperatures={temperatureReadings} /> : null}
                </div>

                <FooterStats server={server} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MetricCard({ label, percentage, detail }: { label: string; percentage: number; detail?: string }) {
  const safePercentage = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0))
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-primary/4 bg-primary/2 px-3 py-3 shadow-inner shadow-primary/10">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">{label}</span>
        {detail ? <span className="text-[10px] text-muted-foreground">{detail}</span> : null}
      </div>
      <Progress
        usagePercentage={safePercentage}
        size="md"
        value={<AnimatedNumber value={safePercentage} decimals={1} suffix="%" />}
        textClassName="justify-between text-[11px] px-0"
      />
    </div>
  )
}

function MetaInfo({
  label,
  value,
  detail,
  icon,
  valueClassName,
}: {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/80 px-2.5 py-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon ? icon : null}
          {label}
        </span>
        <span className={cn("text-[11px] font-semibold text-foreground", valueClassName)}>{value || ""}</span>
      </div>
      {detail ? <div className="mt-1 text-[10px] text-muted-foreground/80">{detail}</div> : null}
    </div>
  )
}

function TrafficBlock({
  uploadSpeed,
  downloadSpeed,
  uploadTransfer,
  downloadTransfer,
}: {
  uploadSpeed: string
  downloadSpeed: string
  uploadTransfer: string
  downloadTransfer: string
}) {
  return (
    <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-[11px]">
      <div className="flex gap-2 items-center justify-between text-muted-foreground">
        <span>实时网络</span>
        <span className="flex flex-1 justify-between items-center gap-2 font-medium text-[11px]">
          {renderDirectionalValue(uploadSpeed, "up")}
          {renderDirectionalValue(downloadSpeed, "down")}
        </span>
      </div>
      <div className="mt-1.5 flex gap-2 items-center justify-between text-muted-foreground">
        <span>累计流量</span>
        <span className="flex flex-1 justify-between items-center gap-2 font-medium text-[11px]">
          {renderDirectionalValue(uploadTransfer, "up")}
          {renderDirectionalValue(downloadTransfer, "down")}
        </span>
      </div>
    </div>
  )
}

type TemperatureReading = {
  name: string
  temperature: number
}

function TemperatureBlock({ temperatures }: { temperatures: TemperatureReading[] }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-[11px]">
      <div className="mb-1 flex items-center justify-between text-muted-foreground">
        <span>温度</span>
        <span className="text-[10px] text-muted-foreground/70">°C</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {temperatures.map((sensor, index) => (
          <span
            key={`${sensor.name}-${index}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
          >
            <span className="truncate max-w-[80px]">{sensor.name}</span>
            <AnimatedNumber value={sensor.temperature} decimals={1} suffix="°C" />
          </span>
        ))}
      </div>
    </div>
  )
}

function FooterStats({ server }: { server: vps }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
      <span>进程数 {typeof server.state.process_count === "number" ? <AnimatedNumber value={server.state.process_count} decimals={0} /> : "-"}</span>
      <span className="flex items-center gap-2">
        <span>TCP {typeof server.state.tcp_conn_count === "number" ? <AnimatedNumber value={server.state.tcp_conn_count} decimals={0} /> : "-"}</span>
        <span className="text-muted-foreground">/</span>
        <span>UDP {typeof server.state.udp_conn_count === "number" ? <AnimatedNumber value={server.state.udp_conn_count} decimals={0} /> : "-"}</span>
      </span>
    </div>
  )
}

function renderDirectionalValue(value: string, type: "up" | "down") {
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
      {type === "up" ? <ArrowUpRight className="h-3 w-3" strokeWidth={2} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={2} />}
      <AnimatedNumber value={numericValue} decimals={decimals} suffix={unitPart} />
    </span>
  )
}

function normalizeTemperatures(temperatures: vps["state"]["temperatures"]): TemperatureReading[] {
  if (!Array.isArray(temperatures) || temperatures.length === 0) {
    return []
  }

  const normalized = temperatures
    .map((entry, index) => {
      if (entry == null) {
        return null
      }
      if (typeof entry === "number") {
        return {
          name: `传感器${index + 1}`,
          temperature: entry,
        }
      }
      const typed = entry as { name?: unknown; Name?: unknown; temperature?: unknown; Temperature?: unknown }
      const rawTemp = typed.temperature ?? typed.Temperature
      const tempValue = typeof rawTemp === "number" ? rawTemp : Number.parseFloat(String(rawTemp))
      if (!Number.isFinite(tempValue)) {
        return null
      }
      const rawNameValue = typed.name ?? typed.Name
      const rawName = typeof rawNameValue === "string" ? rawNameValue : ""
      const name = rawName.trim() ? rawName.trim() : `传感器${index + 1}`
      return {
        name,
        temperature: tempValue,
      }
    })
    .filter((item): item is TemperatureReading => Boolean(item && Number.isFinite(item.temperature)))

  return normalized.sort((a, b) => b.temperature - a.temperature).slice(0, 4)
}

function formatUptimeCompact(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "-"
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0 && parts.length < 2) parts.push(`${minutes}分钟`)

  if (parts.length === 0) {
    return "<1分钟"
  }
  return parts.slice(0, 2).join(" ")
}
