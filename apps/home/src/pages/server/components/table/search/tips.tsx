import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Database, Gauge, HardDrive, HelpCircle, Network, Server } from "lucide-react"
import { useState } from "react"

interface TermDefinition {
  term: string
  definition: string
  unit?: string
  example?: string
  tips?: string[]
}

const serverTerms: Record<string, TermDefinition[]> = {
  basic: [
    {
      term: "服务器名称",
      definition: "服务器的标识名称，格式：国家-配置-IP段",
      example: "HK-2C2G-48（香港-2核2G内存-IP段48）",
      tips: ["便于快速识别服务器位置和配置"],
    },
    {
      term: "在线状态",
      definition: "服务器当前的连接状态",
      example: "在线 / 离线",
      tips: ["离线通常表示网络问题或服务器故障"],
    },
    {
      term: "运行时间",
      definition: "服务器从上次重启到现在的连续运行天数",
      unit: "天",
      example: "15天",
      tips: ["长时间运行表示系统稳定"],
    },
  ],
  performance: [
    {
      term: "CPU 使用率",
      definition: "处理器当前的使用百分比",
      unit: "%",
      example: "15.6%",
      tips: ["正常范围：0-70%", "持续超过80%需要关注"],
    },
    {
      term: "系统负载",
      definition: "等待CPU处理的任务队列长度",
      unit: "load1/load5/load15",
      example: "0.8, 1.2, 1.5",
      tips: ["小于CPU核心数为正常"],
    },
    {
      term: "内存使用率",
      definition: "RAM的使用百分比",
      unit: "%",
      example: "65.4%",
      tips: ["正常范围：30-80%", "超过85%可能影响性能"],
    },
  ],
  storage: [
    {
      term: "磁盘使用率",
      definition: "存储设备已使用空间百分比",
      unit: "%",
      example: "45.8%",
      tips: ["建议保持在80%以下"],
    },
    {
      term: "磁盘读写速度",
      definition: "存储设备每秒读写的数据量",
      unit: "MB/s",
      example: "读：125MB/s，写：87MB/s",
      tips: ["SSD比HDD快10-100倍"],
    },
  ],
  network: [
    {
      term: "网络速度",
      definition: "当前网络接口的实时传输速度",
      unit: "MB/s",
      example: "上传：2.5MB/s，下载：15.8MB/s",
      tips: ["与带宽上限对比判断使用率"],
    },
    {
      term: "网络流量",
      definition: "累计数据传输量",
      unit: "GB/TB",
      example: "上传：1.2TB，下载：5.8TB",
      tips: ["用于流量计费和容量规划"],
    },
    {
      term: "连接数",
      definition: "当前活跃的网络连接数量",
      unit: "个",
      example: "TCP：127，UDP：45",
      tips: ["Web服务器连接数通常较高"],
    },
  ],
  system: [
    {
      term: "进程数",
      definition: "当前系统中运行的进程总数",
      unit: "个",
      example: "156个进程",
      tips: ["包含系统进程和用户进程"],
    },
    {
      term: "系统架构",
      definition: "服务器的处理器架构类型",
      example: "x86_64, ARM64",
      tips: ["x86_64是最常见的64位架构"],
    },
  ],
}

const statusExplanations = {
  online: {
    color: "text-primary dark:text-primary/40",
    bg: "bg-primary/10 dark:bg-green-950",
    description: "服务器正常运行，监控系统能够正常通信",
  },
  offline: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
    description: "服务器无响应，可能是网络问题或服务器故障",
  },
}

interface TipsProps {
  className?: string
}

export function Tips({ className }: TipsProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-gray-500 text-xs">
          <HelpCircle className="w-4 h-4" />
          指标说明
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-w-[600px] overflow-hidden">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">服务器监控指标说明</DialogTitle>
          <DialogDescription className="text-sm">快速了解各项监控指标的含义和正常范围</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="basic" className="text-xs flex items-center gap-1">
              <Server className="w-3 h-3" />
              基础
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              性能
            </TabsTrigger>
            <TabsTrigger value="storage" className="text-xs flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              存储
            </TabsTrigger>
            <TabsTrigger value="network" className="text-xs flex items-center gap-1">
              <Network className="w-3 h-3" />
              网络
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] w-full pr-2">
            {Object.entries(serverTerms).map(([category, terms]) => (
              <TabsContent key={category} value={category} className="mt-2 space-y-3">
                {terms.map((term, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{term.term}</h4>
                      {term.unit && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {term.unit}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{term.definition}</p>
                    {term.example && (
                      <div className="mb-2">
                        <code className="text-xs bg-background px-2 py-1 rounded border">{term.example}</code>
                      </div>
                    )}
                    {term.tips && (
                      <div className="space-y-1">
                        {term.tips.map((tip, tipIndex) => (
                          <div key={tipIndex} className="text-xs text-primary dark:text-primary/40 flex items-start gap-1">
                            <span className="w-1 h-1 bg-current rounded-full mt-1.5 flex-shrink-0" />
                            {tip}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
            ))}
          </ScrollArea>

          {/* 状态说明 */}
          <div className="mt-3 pt-3">
            <h4 className="font-medium mb-2 text-sm">状态说明</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(statusExplanations).map(([status, info]) => (
                <div key={status} className={`p-2 rounded-md ${info.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${info.color.replace("text-", "bg-")}`} />
                    <span className={`font-medium text-xs ${info.color}`}>{status === "online" ? "在线" : "离线"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
