import { NezhaServer } from "@/types/nezha-api"
import { Column } from "@tanstack/react-table"
import { type ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import duration from "dayjs/plugin/duration"
import relativeTime from "dayjs/plugin/relativeTime"
import { CSSProperties } from "react"
import { twMerge } from "tailwind-merge"

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.locale("zh-cn")

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCommonPinningStyles<T>(column: Column<T>): CSSProperties {
  const isPinned = column.getIsPinned()
  const isLastLeftPinnedColumn = isPinned === "left" && column.getIsLastColumn("left")
  const isFirstRightPinnedColumn = isPinned === "right" && column.getIsFirstColumn("right")

  const style: CSSProperties = {
    position: isPinned ? "sticky" : "relative",
    zIndex: isPinned ? 1 : 0,
    opacity: isPinned ? 0.95 : 1,
    width: column.getSize(),
  }

  if (isPinned === "left") {
    style.left = `${column.getStart("left")}px`
    if (isLastLeftPinnedColumn) {
      style.boxShadow = "-4px 0 4px -4px gray inset"
    }
  }

  if (isPinned === "right") {
    style.right = `${column.getAfter("right")}px`
    if (isFirstRightPinnedColumn) {
      style.boxShadow = "4px 0 4px -4px gray inset"
    }
  }

  return style
}
// 格式化字节大小
export const formatBytes = (bytes: number = 0): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export const formatBytesWithUnifiedUnit = (bytes1: number = 0, bytes2: number = 0): { value1: string; value2: string; unit: string } => {
  if (bytes1 === 0 && bytes2 === 0) return { value1: "0", value2: "0", unit: "B" }

  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const maxBytes = Math.max(bytes1, bytes2)
  const unitIndex = Math.floor(Math.log(maxBytes) / Math.log(k))

  const value1 = parseFloat((bytes1 / Math.pow(k, unitIndex)).toFixed(2))
  const value2 = parseFloat((bytes2 / Math.pow(k, unitIndex)).toFixed(2))

  return {
    value1: value1.toString(),
    value2: value2.toString(),
    unit: sizes[unitIndex],
  }
}

// 格式化运行时间
export const formatUptime = (seconds: number = 0): string => {
  if (seconds === 0) return "离线"

  const dur = dayjs.duration(seconds, "seconds")
  const days = Math.floor(dur.asDays())

  if (days >= 1) {
    return `${days}天`
  } else {
    return "1天内"
  }
}

export function formatNezhaInfo(now: number, serverInfo: NezhaServer) {
  const lastActiveTime = serverInfo.last_active.startsWith("000") ? 0 : parseISOTimestamp(serverInfo.last_active)
  return {
    ...serverInfo,
    original_name: serverInfo.name,
    cpu: serverInfo.state.cpu || 0,
    gpu: serverInfo.state.gpu || [],
    process: serverInfo.state.process_count || 0,
    up: serverInfo.state.net_out_speed / 1024 / 1024 || 0,
    down: serverInfo.state.net_in_speed / 1024 / 1024 || 0,
    last_active_time_string: lastActiveTime ? dayjs(lastActiveTime).format("YYYY-MM-DD HH:mm:ss") : "",
    online: now - lastActiveTime <= 30000,
    uptime: serverInfo.state.uptime || 0,
    version: serverInfo.host.version || null,
    tcp: serverInfo.state.tcp_conn_count || 0,
    udp: serverInfo.state.udp_conn_count || 0,
    mem: (serverInfo.state.mem_used / serverInfo.host.mem_total) * 100 || 0,
    swap: (serverInfo.state.swap_used / serverInfo.host.swap_total) * 100 || 0,
    disk: (serverInfo.state.disk_used / serverInfo.host.disk_total) * 100 || 0,
    stg: (serverInfo.state.disk_used / serverInfo.host.disk_total) * 100 || 0,
    country_code: serverInfo.country_code,
    platform: serverInfo.host.platform || "",
    net_out_transfer: serverInfo.state.net_out_transfer || 0,
    net_in_transfer: serverInfo.state.net_in_transfer || 0,
    arch: serverInfo.host.arch || "",
    mem_total: serverInfo.host.mem_total || 0,
    swap_total: serverInfo.host.swap_total || 0,
    disk_total: serverInfo.host.disk_total || 0,
    boot_time: serverInfo.host.boot_time || 0,
    boot_time_string: serverInfo.host.boot_time ? dayjs(serverInfo.host.boot_time * 1000).format("YYYY-MM-DD HH:mm:ss") : "",
    platform_version: serverInfo.host.platform_version || "",
    cpu_info: serverInfo.host.cpu || [],
    gpu_info: serverInfo.host.gpu || [],
    load_1: serverInfo.state.load_1?.toFixed(2) || 0.0,
    load_5: serverInfo.state.load_5?.toFixed(2) || 0.0,
    load_15: serverInfo.state.load_15?.toFixed(2) || 0.0,
    public_note: handlePublicNote(serverInfo.id, serverInfo.public_note || ""),
  }
}

export function resolveCycleInfo(cycle?: string | null): { months: number; label: string } {
  if (!cycle) {
    return { months: 0, label: "" }
  }
  const normalized = cycle.toLowerCase()
  switch (normalized) {
    case "月":
    case "m":
    case "mo":
    case "month":
    case "monthly":
      return { months: 1, label: "月" }
    case "年":
    case "y":
    case "yr":
    case "year":
    case "annual":
      return { months: 12, label: "年" }
    case "季":
    case "q":
    case "qr":
    case "quarterly":
      return { months: 3, label: "季" }
    case "半":
    case "半年":
    case "h":
    case "half":
    case "semi-annually":
      return { months: 6, label: "半年" }
    default:
      return { months: 0, label: cycle }
  }
}

export function getDaysBetweenDatesWithAutoRenewal({ autoRenewal, cycle, startDate, endDate }: BillingData): {
  days: number
  cycleLabel: string
  remainingPercentage: number
} {
  const { months, label } = resolveCycleInfo(cycle)
  const cycleLabel = label
  const start = startDate ? dayjs(startDate) : null
  let effectiveEndDate = endDate
  if ((!effectiveEndDate || !dayjs(effectiveEndDate).isValid()) && start && months > 0) {
    effectiveEndDate = start.add(months, "month").format("YYYY-MM-DD")
  }
  if (!start || !start.isValid() || !effectiveEndDate || !dayjs(effectiveEndDate).isValid()) {
    return {
      days: 0,
      cycleLabel,
      remainingPercentage: 0,
    }
  }

  const nowTime = new Date().getTime()
  const nowIso = new Date(nowTime).toISOString()
  const endDay = dayjs(effectiveEndDate)
  const endTime = endDay.valueOf()
  const remainingDays = getDaysBetweenDates(effectiveEndDate, nowIso)
  const totalPeriodDays = Math.max(1, endDay.diff(start, "day") || 1)

  if (autoRenewal !== "1" || months <= 0) {
    return {
      days: remainingDays,
      cycleLabel,
      remainingPercentage: Math.min(1, Math.max(0, remainingDays) / totalPeriodDays),
    }
  }

  if (nowTime < endTime) {
    return {
      days: remainingDays,
      cycleLabel,
      remainingPercentage: Math.min(1, Math.max(0, remainingDays) / totalPeriodDays),
    }
  }

  const nextTime = getNextCycleTime(endTime, months, nowTime)
  const diff = dayjs(nextTime).diff(dayjs(), "day") + 1
  const cycleDurationDays = Math.max(1, dayjs(nextTime).diff(dayjs(nextTime).subtract(months, "month"), "day"))
  const remainingPercentage = Math.min(1, Math.max(0, diff) / cycleDurationDays)

  return {
    days: diff,
    cycleLabel,
    remainingPercentage,
  }
}

// Thanks to hi2shark for the code
// https://github.com/hi2shark/nazhua/blob/main/src/utils/date.js#L86
export function getNextCycleTime(startDate: number, months: number, specifiedDate: number): number {
  const start = dayjs(startDate)
  const checkDate = dayjs(specifiedDate)

  if (!start.isValid() || months <= 0) {
    throw new Error("参数无效：请检查起始日期、周期月份数和指定日期。")
  }

  let nextDate = start

  // 循环增加周期直到大于当前日期
  let whileStatus = true
  while (whileStatus) {
    nextDate = nextDate.add(months, "month")
    whileStatus = nextDate.valueOf() <= checkDate.valueOf()
  }

  return nextDate.valueOf() // 返回时间毫秒数
}

export function getDaysBetweenDates(date1: string, date2: string): number {
  const oneDay = 24 * 60 * 60 * 1000 // 一天的毫秒数
  const firstDate = new Date(date1)
  const secondDate = new Date(date2)

  // 计算两个日期之间的天数差异
  return Math.round((firstDate.getTime() - secondDate.getTime()) / oneDay)
}

export const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText)
      }
      return res.json()
    })
    .then((data) => data.data)
    .catch((err) => {
      console.error(err)
      throw err
    })

export const nezhaFetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.")
    // @ts-expect-error - res.json() returns a Promise<any>
    error.info = await res.json()
    // @ts-expect-error - res.status is a number
    error.status = res.status
    throw error
  }

  return res.json()
}

export function parseISOTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d`
  } else if (hours > 0) {
    return `${hours}h`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else if (seconds >= 0) {
    return `${seconds}s`
  }
  return "0s"
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

interface BillingData {
  startDate?: string
  endDate?: string
  autoRenewal?: string
  cycle?: string
  amount?: string
  purchaseDate?: string
  purchasePrice?: string
  billingModel?: string
  currency?: string
  isFree?: boolean
}

interface PlanData {
  bandwidth: string
  trafficVol: string
  trafficType: string
  IPv4: string
  IPv6: string
  networkRoute: string
  extra: string
}

export interface PublicNoteData {
  billingDataMod?: BillingData
  planDataMod?: PlanData
}

export type ParsedPublicNote =
  | {
      type: "structured"
      data: PublicNoteData
    }
  | {
      type: "html"
      html: string
    }

function normalizeStructuredPublicNote(raw: unknown): PublicNoteData | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const candidate = raw as {
    billingDataMod?: Partial<BillingData>
    planDataMod?: Partial<PlanData>
  }

  const hasBilling = Boolean(candidate.billingDataMod)
  const hasPlan = Boolean(candidate.planDataMod)

  if (!hasBilling && !hasPlan) {
    return null
  }

  const result: PublicNoteData = {}

  const toStringSafe = (value: unknown): string | undefined => {
    if (value === null || value === undefined) {
      return undefined
    }
    if (typeof value === "string") {
      return value
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value)
    }
    return undefined
  }

  const toBooleanSafe = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") {
      return value
    }
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true
      if (value.toLowerCase() === "false") return false
    }
    return undefined
  }

  if (hasBilling && candidate.billingDataMod) {
    const billing = candidate.billingDataMod
    result.billingDataMod = {
      startDate: toStringSafe(billing.startDate),
      endDate: toStringSafe(billing.endDate),
      autoRenewal: toStringSafe(billing.autoRenewal),
      cycle: toStringSafe(billing.cycle),
      amount: toStringSafe(billing.amount),
      billingModel: toStringSafe(billing.billingModel),
      purchaseDate: toStringSafe(billing.purchaseDate ?? billing.startDate),
      purchasePrice: toStringSafe(billing.purchasePrice ?? billing.amount),
      currency: toStringSafe(billing.currency),
      isFree: toBooleanSafe(billing.isFree),
    }
  }

  if (hasPlan && candidate.planDataMod) {
    const plan = candidate.planDataMod
    result.planDataMod = {
      bandwidth: toStringSafe(plan.bandwidth) ?? "",
      trafficVol: toStringSafe(plan.trafficVol) ?? "",
      trafficType: toStringSafe(plan.trafficType) ?? "",
      IPv4: toStringSafe(plan.IPv4) ?? "",
      IPv6: toStringSafe(plan.IPv6) ?? "",
      networkRoute: toStringSafe(plan.networkRoute) ?? "",
      extra: toStringSafe(plan.extra) ?? "",
    }
  }

  return result
}

function sanitizePublicNoteHtml(html: string): string {
  if (!html.trim()) {
    return ""
  }

  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return html
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const body = doc.body
  if (!body) {
    return ""
  }
  const removeSelectors = ["script", "style", "iframe", "object", "embed", "link"]
  removeSelectors.forEach((selector) => {
    body.querySelectorAll(selector).forEach((node) => node.remove())
  })

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT)
  const disallowedProtocols = ["javascript:", "data:"]
  while (walker.nextNode()) {
    const element = walker.currentNode as Element
    // Remove event handler attributes (on*)
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attr.name)
        continue
      }
      if (["href", "src", "xlink:href"].includes(attr.name.toLowerCase())) {
        const value = attr.value.trim().toLowerCase()
        if (disallowedProtocols.some((protocol) => value.startsWith(protocol))) {
          element.removeAttribute(attr.name)
        }
      }
    }
  }

  return doc.body.innerHTML.trim()
}

export function parsePublicNote(publicNote: string): ParsedPublicNote | null {
  const trimmed = (publicNote || "").trim()
  if (!trimmed) {
    return null
  }

  try {
    const raw = JSON.parse(trimmed)
    const structured = normalizeStructuredPublicNote(raw)
    if (structured) {
      return { type: "structured", data: structured }
    }
  } catch {
    // Expected when content is HTML; continue to HTML fallback.
  }

  const sanitizedHtml = sanitizePublicNoteHtml(trimmed)
  if (!sanitizedHtml) {
    return null
  }
  return { type: "html", html: sanitizedHtml }
}

// Function to handle public_note with sessionStorage
export function handlePublicNote(serverId: number, publicNote: string): string {
  const storageKey = `server_${serverId}_public_note`
  const storedNote = sessionStorage.getItem(storageKey)

  if (!publicNote && storedNote) {
    return storedNote
  }

  if (publicNote) {
    sessionStorage.setItem(storageKey, publicNote)
    return publicNote
  }

  return ""
}
