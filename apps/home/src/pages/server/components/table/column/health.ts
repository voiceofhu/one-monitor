import { vps } from "../../../types"

/**
 * 计算服务器健康值 (基于完整 Server 接口的精细版本)
 * 参考 Grafana 监控理念，使用多维度加权评分
 */
export const calculateHealthScore = (server: vps): number => {
  // 平滑评分函数：三段式线性插值
  const smoothScore = (value: number, excellent: number, good: number, warning: number, critical: number): number => {
    if (value <= excellent) return 100
    if (value >= critical) return 0

    if (value <= good) {
      // excellent 到 good：100-85分
      return 100 - ((value - excellent) / (good - excellent)) * 15
    } else if (value <= warning) {
      // good 到 warning：85-60分
      return 85 - ((value - good) / (warning - good)) * 25
    } else {
      // warning 到 critical：60-0分
      return 60 - ((value - warning) / (critical - warning)) * 60
    }
  }

  // 反向评分函数（值越高越好，如运行时间）
  const reverseScore = (value: number, critical: number, warning: number, good: number, excellent: number): number => {
    if (value >= excellent) return 100
    if (value <= critical) return 0

    if (value >= good) {
      return 85 + ((value - good) / (excellent - good)) * 15
    } else if (value >= warning) {
      return 60 + ((value - warning) / (good - warning)) * 25
    } else {
      return ((value - critical) / (warning - critical)) * 60
    }
  }

  // 1. CPU 使用率评分 (权重: 20%)
  const cpuUsage = server.state.cpu || 0
  const cpuScore = smoothScore(cpuUsage, 20, 50, 75, 95)

  // 2. 内存使用率评分 (权重: 20%)
  const memUsage = server.host.mem_total ? ((server.state.mem_used || 0) / server.host.mem_total) * 100 : 0
  const memoryScore = smoothScore(memUsage, 40, 70, 85, 95)

  // 3. 硬盘使用率评分 (权重: 15%)
  const diskUsage = server.host.disk_total ? ((server.state.disk_used || 0) / server.host.disk_total) * 100 : 0
  const diskScore = smoothScore(diskUsage, 50, 75, 90, 98)

  // 4. 系统负载评分 (权重: 15%) - 使用 load5 更稳定
  const load5 = server.state.load_5 || server.state.load_1 || 0
  const cpuCores = server.host.cpu?.length || 1
  const loadRatio = load5 / cpuCores
  const loadScore = smoothScore(loadRatio, 0.3, 0.8, 1.5, 3.0)

  // 5. 网络性能评分 (权重: 10%)
  // 基于网络速度和传输量的综合评估
  const netInSpeed = server.state.net_in_speed || 0
  const netOutSpeed = server.state.net_out_speed || 0
  const totalNetSpeed = (netInSpeed + netOutSpeed) / (1024 * 1024) // 转换为 MB/s
  const networkScore = smoothScore(totalNetSpeed, 10, 50, 100, 200)

  // 6. 连接数评分 (权重: 8%)
  const tcpConnections = server.state.tcp_conn_count || 0
  const udpConnections = server.state.udp_conn_count || 0
  const totalConnections = tcpConnections + udpConnections
  const connectionScore = smoothScore(totalConnections, 100, 500, 1500, 5000)

  // 7. 进程数评分 (权重: 7%)
  const processCount = server.state.process_count || 0
  const processScore = smoothScore(processCount, 50, 150, 300, 800)

  // 8. 运行时间评分 (权重: 5%) - 值越高越好，但过高可能表示需要重启
  const uptime = server.state.uptime || 0
  const uptimeDays = uptime / (24 * 3600)
  const uptimeScore =
    uptimeDays > 365
      ? smoothScore(uptimeDays, 30, 90, 180, 730) // 超过1年开始扣分
      : reverseScore(uptimeDays, 0, 1, 7, 30) // 1年内越高越好

  // 9. 温度评分 (如果有温度数据) - 权重动态调整
  let temperatureScore = 100
  let tempWeight = 0
  const temperatureValues = Array.isArray(server.state.temperatures)
    ? server.state.temperatures
        .map((item) => {
          if (typeof item === "number") {
            return item
          }
          if (item && typeof (item as any).temperature === "number") {
            return (item as any).temperature
          }
          if (item && typeof (item as any).Temperature === "number") {
            return (item as any).Temperature
          }
          return Number.NaN
        })
        .filter((value) => Number.isFinite(value))
    : []

  if (temperatureValues.length > 0) {
    const maxTemp = Math.max(...temperatureValues)
    temperatureScore = smoothScore(maxTemp, 40, 60, 75, 85)
    tempWeight = 0.05 // 5%
  }

  // 10. 交换分区使用率 (如果启用) - 权重动态调整
  let swapScore = 100
  let swapWeight = 0
  if (server.host.swap_total && server.host.swap_total > 0) {
    const swapUsage = ((server.state.swap_used || 0) / server.host.swap_total) * 100
    swapScore = smoothScore(swapUsage, 5, 20, 50, 80)
    swapWeight = 0.05 // 5%
  }

  // 动态调整权重（温度和交换分区如果不存在，权重分配给其他指标）
  const baseWeights = {
    cpu: 0.2,
    memory: 0.2,
    disk: 0.15,
    load: 0.15,
    network: 0.1,
    connection: 0.08,
    process: 0.07,
    uptime: 0.05,
  }

  const extraWeight = (tempWeight > 0 ? 0 : 0.05) + (swapWeight > 0 ? 0 : 0.05)
  const adjustedWeights = {
    ...baseWeights,
    cpu: baseWeights.cpu + extraWeight * 0.3,
    memory: baseWeights.memory + extraWeight * 0.3,
    load: baseWeights.load + extraWeight * 0.4,
  }

  // 加权平均计算基础分数
  const finalScore =
    cpuScore * adjustedWeights.cpu +
    memoryScore * adjustedWeights.memory +
    diskScore * adjustedWeights.disk +
    loadScore * adjustedWeights.load +
    networkScore * adjustedWeights.network +
    connectionScore * adjustedWeights.connection +
    processScore * adjustedWeights.process +
    uptimeScore * adjustedWeights.uptime +
    temperatureScore * tempWeight +
    swapScore * swapWeight

  // 健康度修正因子
  let healthModifier = 1.0

  // 极端情况惩罚
  const criticalCpu = cpuUsage > 98
  const criticalMem = memUsage > 98
  const criticalDisk = diskUsage > 98
  const criticalLoad = loadRatio > 5.0
  const criticalTemp = temperatureValues.length > 0 && Math.max(...temperatureValues) > 90

  const criticalCount = [criticalCpu, criticalMem, criticalDisk, criticalLoad, criticalTemp].filter(Boolean).length

  if (criticalCount >= 3) {
    healthModifier = 0.3 // 多个关键指标异常
  } else if (criticalCount >= 2) {
    healthModifier = 0.6
  } else if (criticalCount >= 1) {
    healthModifier = 0.8
  }

  // // 服务器活跃状态检查
  // const lastActive = new Date(server.last_active);
  // const now = new Date();
  // const inactiveMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);

  // if (inactiveMinutes > 30) {
  //   healthModifier *= 0.1; // 超过30分钟未活跃，严重惩罚
  // } else if (inactiveMinutes > 10) {
  //   healthModifier *= 0.5; // 超过10分钟未活跃，中等惩罚
  // } else if (inactiveMinutes > 5) {
  //   healthModifier *= 0.8; // 超过5分钟未活跃，轻微惩罚
  // }

  // 稳定性奖励（基于负载方差）
  if (server.state.load_1 && server.state.load_5 && server.state.load_15) {
    const loadVariance = Math.abs(server.state.load_1 - server.state.load_15)
    if (loadVariance < 0.1) {
      healthModifier *= 1.05 // 负载稳定奖励
    }
  }

  return Math.max(0, Math.min(100, Math.round(finalScore * healthModifier)))
}
