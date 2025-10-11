import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Label } from "@/components/ui/label"
import { Table } from "@tanstack/react-table"
import { ListFilter } from "lucide-react"

import { vps } from "../../../types"

interface ColumnVisibilityProps {
  table: Table<vps>
  setColumnVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  variant?: "default" | "inline"
}

export function ColumnVisibility({ table, setColumnVisibility, variant = "default" }: ColumnVisibilityProps) {
  const columnGroups = {
    基础信息: ["name", "healthy"],
    系统资源: ["state_cpu", "host_platform", "state_disk_used"],
    网络传输: ["state_net_in_speed", "state_net_out_speed", "state_net_in_transfer", "state_net_out_transfer"],
    系统状态: ["state_uptime", "state_process_count", "state_tcp_conn_count", "state_udp_conn_count"],
    系统负载: ["state_load_1", "state_load_5", "state_load_15"],
    硬件信息: ["host_cpu", "host_arch"],
  }

  // 列显示名称映射
  const columnDisplayNames = {
    name: "实例名称",
    healthy: "健康值",
    state_cpu: "CPU使用率",
    host_platform: "内存占用率",
    state_disk_used: "硬盘使用率",
    state_net_in_speed: "下载速率",
    state_net_out_speed: "上传速率",
    state_net_in_transfer: "总流量(入站)",
    state_net_out_transfer: "总流量(出站)",
    state_uptime: "在线时长",
    state_process_count: "进程数",
    state_tcp_conn_count: "TCP连接数",
    state_udp_conn_count: "UDP连接数",
    state_load_1: "负载(1分钟)",
    state_load_5: "负载(5分钟)",
    state_load_15: "负载(15分钟)",
    host_cpu: "CPU信息",
    host_arch: "系统架构",
  }
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button size="sm" variant="outline" className="cursor-pointer">
          <ListFilter />
          列首选项
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="end">
        <div className="">
          {Object.keys(columnGroups).map((key) => (
            <div className="mb-3" key={key}>
              <div className="font-bold text-sm mb-2">{key}</div>
              <div className="grid grid-cols-2 gap-2">
                {columnGroups[key].map((col) => {
                  return (
                    <Label htmlFor={col} key={col} className="text-xs text-gray-500">
                      <Checkbox
                        checked={table.getColumn(col)?.getIsVisible()}
                        disabled={col === "name"} // 不允许隐藏实例名称列
                        id={col}
                        onCheckedChange={(value) => {
                          table.getColumn(col)?.toggleVisibility(!!value)
                          setColumnVisibility((prev) => ({
                            ...prev,
                            [col]: !!value,
                          }))
                        }}
                      />
                      {columnDisplayNames[col]}
                    </Label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
