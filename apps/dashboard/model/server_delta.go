package model

import "time"

// WebSocket 增量更新数据结构
type ServerDeltaUpdate struct {
	Type      string      `json:"type"`      // "update", "add", "remove", "status"
	Timestamp int64       `json:"timestamp"` // 更新时间戳
	Data      interface{} `json:"data"`      // 具体更新数据
}

// 服务器状态变化
type ServerStateChange struct {
	ID          uint64     `json:"id"`
	State       *HostState `json:"state,omitempty"`        // 更新的状态数据
	LastActive  time.Time  `json:"last_active,omitempty"`  // 最后活跃时间
	CountryCode string     `json:"country_code,omitempty"` // 国家代码变化
}

// 服务器基本信息变化 (名称、备注等)
type ServerInfoChange struct {
	ID           uint64 `json:"id"`
	Name         string `json:"name,omitempty"`
	PublicNote   string `json:"public_note,omitempty"`
	DisplayIndex int    `json:"display_index,omitempty"`
}

// 服务器添加
type ServerAdd struct {
	Server StreamServer `json:"server"`
}

// 服务器移除
type ServerRemove struct {
	ID uint64 `json:"id"`
}

// 在线用户数变化
type OnlineCountChange struct {
	Online int `json:"online"`
}

// WebSocket 消息类型常量
const (
	WS_MSG_SERVER_STATE  = "server_state"  // 服务器状态更新
	WS_MSG_SERVER_INFO   = "server_info"   // 服务器信息更新
	WS_MSG_SERVER_ADD    = "server_add"    // 服务器添加
	WS_MSG_SERVER_REMOVE = "server_remove" // 服务器移除
	WS_MSG_ONLINE_COUNT  = "online_count"  // 在线用户数更新
	WS_MSG_HEARTBEAT     = "heartbeat"     // 心跳消息
)
