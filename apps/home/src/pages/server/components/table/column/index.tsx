import { AnimatedNumber } from "@/components/animated-number"
import { formatBytesWithUnifiedUnit, formatUptime } from "@/lib/utils"
import { createColumnHelper } from "@tanstack/react-table"

import { vps } from "../../../types"
import { Progress } from "../progress"
import { calculateHealthScore } from "./health"
import { InfoHoverCard } from "./info-hover-card"

const columnHelper = createColumnHelper<vps>()

const byteUnits = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

function formatBytesNumeric(bytes = 0) {
  if (!bytes) return { value: 0, unit: "B" }
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  return { value, unit: byteUnits[i] }
}

export const getColumn = (servers: vps[]) => {
  const max_net_in_out_speed = 1024 * 1024 * 1024 * 1024 * 10
  const max_net_in_out_transfer = 1024 * 1024 * 1024 * 1024 * 1024 * 10
  const max_data = () => ({
    max_in_speed: Math.max(...servers.map((s) => s.state.net_in_speed || 0), max_net_in_out_speed),
    max_out_speed: Math.max(...servers.map((s) => s.state.net_out_speed || 0), max_net_in_out_speed),
    max_in_transfer: Math.max(...servers.map((s) => s.state.net_in_transfer || 0), max_net_in_out_transfer),
    max_out_transfer: Math.max(...servers.map((s) => s.state.net_out_transfer || 0), max_net_in_out_transfer),
  })
  // 优化：使用 useMemo 缓存计算结果
  const { max_in_speed, max_out_speed, max_in_transfer, max_out_transfer } = max_data()

  return [
    columnHelper.accessor("name", {
      header: () => <div className="ml-2">实例</div>,
      cell: (info) => {
        return <InfoHoverCard data={info.row.original} />
      },
      size: 150,
      enableSorting: true,
      enableHiding: false,
      filterFn: "includesString", // 默认包含字符串匹配
    }),
    columnHelper.accessor(
      (row) => calculateHealthScore(row), // 直接返回计算值作为排序依据
      {
        id: "healthy",
        header: () => <div className="">健康值</div>,
        cell: (info) => {
          const server = info.row.original
          const healthScore = calculateHealthScore(server)
          return (
            <Progress
              mode="health"
              value={<AnimatedNumber value={healthScore} decimals={0} />}
              usagePercentage={healthScore}
            />
          )
        },
        size: 80,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const valueA = calculateHealthScore(rowA.original)
          const valueB = calculateHealthScore(rowB.original)
          return valueA - valueB
        },
      },
    ),
    columnHelper.accessor("state.cpu", {
      header: "CPU使用率",
      cell: (info) => {
        const cpu = info.row.original.state.cpu || 0
        const usagePercentage = cpu
        return <Progress value={<AnimatedNumber value={usagePercentage} decimals={2} suffix="%" />} usagePercentage={usagePercentage} />
      },

      size: 100,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("host.platform", {
      header: "内存占用率",
      cell: (info) => {
        const used = info.row.original.state.mem_used || 0
        const total = info.row.original.host.mem_total || 0
        const { value1: usedValue, value2: totalValue, unit } = formatBytesWithUnifiedUnit(used, total)
        const usagePercentage = total > 0 ? (used / total) * 100 : 0
        const usedNum = Number.parseFloat(usedValue)
        const totalNum = Number.parseFloat(totalValue)
        return (
          <Progress
            value={
              <span className="flex items-center gap-1">
                <AnimatedNumber value={Number.isNaN(usedNum) ? 0 : usedNum} decimals={2} />
                <span>/</span>
                <AnimatedNumber value={Number.isNaN(totalNum) ? 0 : totalNum} decimals={2} suffix={` ${unit}`} />
              </span>
            }
            usagePercentage={usagePercentage}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        const rowAused = rowA.original.state.mem_used || 0
        const rowAtotal = rowA.original.host.mem_total || 0
        const rowAusagePercentage = rowAtotal > 0 ? (rowAused / rowAtotal) * 100 : 0
        const rowBused = rowB.original.state.mem_used || 0
        const rowBtotal = rowB.original.host.mem_total || 0
        const rowBusagePercentage = rowBtotal > 0 ? (rowBused / rowBtotal) * 100 : 0
        return rowBusagePercentage - rowAusagePercentage
      },
      size: 135,
      enableSorting: true,
    }),

    columnHelper.accessor("state.disk_used", {
      header: "硬盘使用率",
      cell: (info) => {
        const used = info.row.original.state.disk_used || 0
        const total = info.row.original.host.disk_total || 0
        const { value1: usedValue, value2: totalValue, unit } = formatBytesWithUnifiedUnit(used, total)
        const usagePercentage = total > 0 ? (used / total) * 100 : 0
        const usedNum = Number.parseFloat(usedValue)
        const totalNum = Number.parseFloat(totalValue)
        return (
          <Progress
            value={
              <span className="flex items-center gap-1">
                <AnimatedNumber value={Number.isNaN(usedNum) ? 0 : usedNum} decimals={2} />
                <span>/</span>
                <AnimatedNumber value={Number.isNaN(totalNum) ? 0 : totalNum} decimals={2} suffix={` ${unit}`} />
              </span>
            }
            usagePercentage={usagePercentage}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        const rowAused = rowA.original.state.disk_used || 0
        const rowAtotal = rowA.original.host.disk_total || 0
        const rowAusagePercentage = rowAtotal > 0 ? (rowAused / rowAtotal) * 100 : 0
        const rowBused = rowB.original.state.disk_used || 0
        const rowBtotal = rowB.original.host.disk_total || 0
        const rowBusagePercentage = rowBtotal > 0 ? (rowBused / rowBtotal) * 100 : 0
        return rowBusagePercentage - rowAusagePercentage
      },
      size: 132,
      enableSorting: true, // 不可排序
    }),
    columnHelper.accessor("state.net_in_speed", {
      header: () => <span className="text-xs">传输速率(上传)</span>,
      cell: (info) => {
        const inspeed = info.row.original.state.net_in_speed || 0
        const usageInPercentage = max_in_speed > 0 ? (inspeed / max_in_speed) * 100 : 0
        const { value: numericValue, unit } = formatBytesNumeric(inspeed)
        return <Progress value={<AnimatedNumber value={numericValue} decimals={2} suffix={` ${unit}/s`} />} usagePercentage={usageInPercentage} />
      },
      size: 120,
      enableSorting: true, // 可以排序
    }),
    columnHelper.accessor("state.net_out_speed", {
      header: () => <span className="text-xs">传输速率(下载)</span>,
      cell: (info) => {
        const outspeed = info.row.original.state.net_out_speed || 0
        const usageOutPercentage = max_out_speed > 0 ? (outspeed / max_out_speed) * 100 : 0
        const { value: numericValue, unit } = formatBytesNumeric(outspeed)
        return <Progress value={<AnimatedNumber value={numericValue} decimals={2} suffix={` ${unit}/s`} />} usagePercentage={usageOutPercentage} />
      },
      size: 120,
      enableSorting: true, // 可以排序
    }),
    columnHelper.accessor("state.net_in_transfer", {
      header: () => <span>总流量(入站)</span>,
      size: 110,
      cell: (info) => {
        const inspeed = info.row.original.state.net_in_transfer || 0
        const usageInPercentage = max_in_transfer > 0 ? (inspeed / max_in_transfer) * 100 : 0
        const { value: numericValue, unit } = formatBytesNumeric(inspeed)
        return <Progress value={<AnimatedNumber value={numericValue} decimals={2} suffix={` ${unit}`} />} usagePercentage={usageInPercentage} />
      },
    }),
    columnHelper.accessor("state.net_out_transfer", {
      header: () => <span>总流量(出站)</span>,
      size: 110,
      cell: (info) => {
        const outspeed = info.row.original.state.net_out_transfer || 0
        const usageOutPercentage = max_out_transfer > 0 ? (outspeed / max_out_transfer) * 100 : 0
        const { value: numericValue, unit } = formatBytesNumeric(outspeed)
        return <Progress value={<AnimatedNumber value={numericValue} decimals={2} suffix={` ${unit}`} />} usagePercentage={usageOutPercentage} />
      },
    }),

    columnHelper.accessor("state.uptime", {
      header: () => <div className="text-left w-full">在线时长</div>,
      cell: (info) => {
        const uptime = info.row.original.state.uptime || 0
        const formattedUptime = formatUptime(uptime)
        return <div className="text-xs text-left">{formattedUptime || "-"}</div>
      },
      size: 82,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("state.process_count", {
      header: () => <div className="text-left w-full">进程数</div>,
      cell: (info) => {
        const process_count = info.row.original.state.process_count
        return (
          <div className="text-xs text-left pr-2">
            {typeof process_count === "number" ? <AnimatedNumber value={process_count} decimals={0} /> : "-"}
          </div>
        )
      },
      size: 82,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("state.tcp_conn_count", {
      header: () => <div className="text-left w-full">TCP连接数</div>,
      cell: (info) => {
        const tcp_conn_count = info.row.original.state.tcp_conn_count
        return (
          <div className="text-xs text-left pr-2">
            {typeof tcp_conn_count === "number" ? <AnimatedNumber value={tcp_conn_count} decimals={0} /> : "-"}
          </div>
        )
      },
      size: 100,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("state.udp_conn_count", {
      header: () => <div className="text-left w-full">UDP连接数</div>,
      cell: (info) => {
        const udp_conn_count = info.row.original.state.udp_conn_count
        return (
          <div className="text-xs text-left pr-2">
            {typeof udp_conn_count === "number" ? <AnimatedNumber value={udp_conn_count} decimals={0} /> : "-"}
          </div>
        )
      },
      size: 100,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("state.load_1", {
      header: () => <div className="text-left w-full">负载(1m)</div>,
      cell: (info) => {
        const load1 = info.row.original.state.load_1 || 0
        return (
          <div className="text-xs text-left pr-2">
            <AnimatedNumber value={load1} decimals={2} />
          </div>
        )
      },
      size: 90,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("state.load_5", {
      header: () => <div className="text-left w-full">负载(5m)</div>,
      cell: (info) => {
        const load5 = info.row.original.state.load_5 || 0
        return (
          <div className="text-xs text-left pr-2">
            <AnimatedNumber value={load5} decimals={2} />
          </div>
        )
      },
      size: 90,
      enableSorting: true, // 可排序
    }),
    columnHelper.accessor("state.load_15", {
      header: () => <div className="text-left w-full">负载(15m)</div>,
      cell: (info) => {
        const load15 = info.row.original.state.load_15 || 0
        return (
          <div className="text-xs text-left pr-2">
            <AnimatedNumber value={load15} decimals={2} />
          </div>
        )
      },
      size: 90,
      enableSorting: true, // 可排序
    }),

    columnHelper.accessor("host.arch", {
      header: () => <div className="text-left w-full">架构</div>,
      cell: (info) => {
        const arch = info.row.original.host.arch
        return <div className="text-xs text-left">{arch || "-"}</div>
      },
      size: 72,
      enableSorting: false, // 可排序
    }),
    columnHelper.accessor("host.cpu", {
      id: "host_cpu",
      header: () => <div className="text-left w-full">CPU</div>,
      cell: (info) => {
        const cpu = info.row.original.host.cpu
        return <div className="text-xs text-right">{cpu || "-"}</div>
      },
      enableSorting: false, // 可排序
      size: 400,
    }),
  ]
}
