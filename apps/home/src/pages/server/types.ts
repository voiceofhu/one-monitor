export interface group {
  group: {
    id: number
    created_at: string
    updated_at: string
    name: string
  }
  servers: number[]
}

export interface vps {
  id: number
  name: string
  original_name?: string
  display_index?: number
  host: Host
  state: State
  last_active: string
  country_code?: string
  public_note?: string
}
export interface Host {
  platform?: string
  platform_version?: string
  cpu?: string[]
  arch?: string
  virtualization?: string
  boot_time?: number
  country_code?: string
  version?: string
  mem_total?: number
  disk_total?: number
  swap_total?: number
  ip?: string
  gpu?: string[]
}

export interface State {
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
  temperatures?: Array<{
    name?: string
    temperature?: number
  }>
  gpu?: any
}
