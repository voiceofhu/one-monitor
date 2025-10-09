export interface NezhaWebsocketResponse {
  now: number
  online?: number
  servers: NezhaServer[]
}

export interface NezhaServer {
  id: number
  name: string
  public_note?: string
  display_index?: number
  last_active: string
  country_code?: string
  host: NezhaServerHost
  state?: NezhaServerStatus
}

export interface NezhaServerHost {
  platform?: string
  platform_version?: string
  cpu?: string[]
  gpu?: string[]
  mem_total?: number
  disk_total?: number
  swap_total?: number
  arch?: string
  virtualization?: string
  boot_time?: number
  version?: string
}

export interface NezhaServerStatus {
  cpu?: number
  mem_used?: number
  swap_used?: number
  disk_used?: number
  net_in_transfer?: number
  net_out_transfer?: number
  net_in_speed?: number
  net_out_speed?: number
  uptime?: number
  load_1?: number
  load_5?: number
  load_15?: number
  tcp_conn_count?: number
  udp_conn_count?: number
  process_count?: number
  temperatures?: temperature[]
  gpu?: number[]
}

interface temperature {
  Name: string
  Temperature: number
}

export interface ServerListResponse {
  success: boolean
  data: {
    now: number
    online: number
    servers: NezhaServer[]
  }
  error?: string
}

export type ServerDeltaUpdate =
  | { type: "server_state"; timestamp: number; data: ServerStateChange }
  | { type: "server_info"; timestamp: number; data: ServerInfoChange }
  | { type: "server_add"; timestamp: number; data: ServerAddPayload }
  | { type: "server_remove"; timestamp: number; data: ServerRemovePayload }
  | { type: "online_count"; timestamp: number; data: OnlineCountChange }
  | { type: "heartbeat"; timestamp: number; data: null }

export interface ServerStateChange {
  id: number
  state?: NezhaServerStatus
  last_active?: string
  country_code?: string
}

export interface ServerInfoChange {
  id: number
  name?: string
  public_note?: string
  display_index?: number
}

export interface ServerAddPayload {
  server: NezhaServer
}

export interface ServerRemovePayload {
  id: number
}

export interface OnlineCountChange {
  online: number
}

export interface ServerGroupResponse {
  success: boolean
  data: ServerGroup[]
}

export interface ServerGroup {
  group: {
    id: number
    created_at: string
    updated_at: string
    name: string
  }
  servers: number[]
}

export interface LoginUserResponse {
  success: boolean
  data: {
    id: number
    username: string
    password: string
    created_at: string
    updated_at: string
  }
}

export interface MonitorResponse {
  success: boolean
  data: NezhaMonitor[]
}

export type ServerMonitorChart = {
  [key: string]: {
    created_at: number
    avg_delay: number
  }[]
}

export interface NezhaMonitor {
  monitor_id: number
  monitor_name: string
  server_id: number
  server_name: string
  created_at: number[]
  avg_delay: number[]
}

export interface ServiceResponse {
  success: boolean
  data: {
    services: {
      [key: string]: ServiceData
    }
    cycle_transfer_stats: CycleTransferStats
  }
}

export interface ServiceData {
  service_name: string
  current_up: number
  current_down: number
  total_up: number
  total_down: number
  delay: number[]
  up: number[]
  down: number[]
}

export interface CycleTransferStats {
  [key: string]: CycleTransferData
}

export interface CycleTransferData {
  name: string
  from: string
  to: string
  max: number
  min: number
  server_name: {
    [key: string]: string
  }
  transfer: {
    [key: string]: number
  }
  next_update: {
    [key: string]: string
  }
}

type SettingConfig = {
  debug: boolean
  language: string
  site_name: string
  user_template: string
  admin_template: string
  custom_code: string
}

export interface SettingResponse {
  success: boolean
  data: {
    config: SettingConfig
    version: string
  }
}
