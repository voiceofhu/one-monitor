package controller

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/hashicorp/go-uuid"

	"github.com/nezhahq/nezha/model"
	"github.com/nezhahq/nezha/pkg/utils"
	"github.com/nezhahq/nezha/service/singleton"
)

// WebSocket 连接管理器
type WebSocketManager struct {
	connections map[string]*WebSocketConnection
	broadcast   chan *wsBroadcastEnvelope
	register    chan *WebSocketConnection
	unregister  chan *WebSocketConnection
	mu          sync.RWMutex
	stateMu     sync.RWMutex
	lastStates  map[uint64]*model.HostState
}

type wsBroadcastEnvelope struct {
	member *model.ServerDeltaUpdate
	guest  *model.ServerDeltaUpdate
}

type WebSocketConnection struct {
	ID       string
	Conn     *websocket.Conn
	Send     chan *model.ServerDeltaUpdate
	UserID   uint64
	IsMember bool
	Cancel   context.CancelFunc
}

var wsManager *WebSocketManager

func InitWebSocketManager() {
	wsManager = &WebSocketManager{
		connections: make(map[string]*WebSocketConnection),
		broadcast:   make(chan *wsBroadcastEnvelope, 256),
		register:    make(chan *WebSocketConnection),
		unregister:  make(chan *WebSocketConnection),
		lastStates:  make(map[uint64]*model.HostState),
	}

	go wsManager.run()

	singleton.RegisterServerStateObserver(wsManager.handleServerStateUpdate)
	singleton.RegisterServerInfoObserver(wsManager.handleServerInfoUpdate)
	singleton.RegisterServerAddObserver(wsManager.handleServerAdd)
	singleton.RegisterServerRemoveObserver(wsManager.handleServerRemove)
	singleton.RegisterOnlineCountObserver(wsManager.handleOnlineCountChange)
}

func (m *WebSocketManager) run() {
	for {
		select {
		case conn := <-m.register:
			m.mu.Lock()
			m.connections[conn.ID] = conn
			m.mu.Unlock()

		case conn := <-m.unregister:
			m.mu.Lock()
			if _, ok := m.connections[conn.ID]; ok {
				delete(m.connections, conn.ID)
				close(conn.Send)
				conn.Cancel()
			}
			m.mu.Unlock()

		case envelope := <-m.broadcast:
			if envelope == nil {
				continue
			}
			m.mu.Lock()
			for id, conn := range m.connections {
				payload := envelope.member
				if !conn.IsMember {
					if envelope.guest != nil {
						payload = envelope.guest
					}
				} else if payload == nil && envelope.guest != nil {
					payload = envelope.guest
				}
				if payload == nil {
					continue
				}
				select {
				case conn.Send <- payload:
				default:
					// 连接阻塞，移除连接
					delete(m.connections, id)
					close(conn.Send)
					conn.Cancel()
				}
			}
			m.mu.Unlock()
		}
	}
}

func (m *WebSocketManager) handleServerStateUpdate(server *model.Server) {
	if server == nil || server.State == nil {
		return
	}

	stateCopy := copyHostState(server.State)

	m.stateMu.Lock()
	if last, ok := m.lastStates[server.ID]; ok && !hasStateChanged(last, stateCopy) {
		m.stateMu.Unlock()
		return
	}
	m.lastStates[server.ID] = stateCopy
	m.stateMu.Unlock()

	var countryCode string
	if server.GeoIP != nil {
		countryCode = server.GeoIP.CountryCode
	}

	m.BroadcastStateChange(&model.ServerStateChange{
		ID:          server.ID,
		State:       stateCopy,
		LastActive:  server.LastActive,
		CountryCode: countryCode,
	})
}

func (m *WebSocketManager) handleServerInfoUpdate(server *model.Server) {
	if server == nil {
		return
	}
	m.BroadcastServerInfoChange(&model.ServerInfoChange{
		ID:           server.ID,
		Name:         server.Name,
		PublicNote:   server.PublicNote,
		DisplayIndex: server.DisplayIndex,
	})
}

func (m *WebSocketManager) handleServerAdd(server *model.Server) {
	if server == nil {
		return
	}

	if server.State != nil {
		m.stateMu.Lock()
		m.lastStates[server.ID] = copyHostState(server.State)
		m.stateMu.Unlock()
	}

	m.BroadcastServerAdd(server)
}

func (m *WebSocketManager) handleServerRemove(id uint64) {
	m.stateMu.Lock()
	delete(m.lastStates, id)
	m.stateMu.Unlock()
	m.BroadcastServerRemove(id)
}

func (m *WebSocketManager) handleOnlineCountChange(count int) {
	m.BroadcastOnlineCountChange(count)
}

// 广播服务器状态变化
func (m *WebSocketManager) BroadcastStateChange(change *model.ServerStateChange) {
	if change == nil {
		return
	}
	update := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_SERVER_STATE,
		Timestamp: time.Now().Unix() * 1000,
		Data:      change,
	}

	m.enqueueBroadcast(update, update)
}

// 广播在线用户数变化
func (m *WebSocketManager) BroadcastOnlineCountChange(count int) {
	update := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_ONLINE_COUNT,
		Timestamp: time.Now().Unix() * 1000,
		Data: &model.OnlineCountChange{
			Online: count,
		},
	}

	m.enqueueBroadcast(update, update)
}

func (m *WebSocketManager) BroadcastServerInfoChange(info *model.ServerInfoChange) {
	if info == nil {
		return
	}
	update := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_SERVER_INFO,
		Timestamp: time.Now().Unix() * 1000,
		Data:      info,
	}
	m.enqueueBroadcast(update, update)
}

func (m *WebSocketManager) BroadcastServerAdd(server *model.Server) {
	if server == nil {
		return
	}

	member := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_SERVER_ADD,
		Timestamp: time.Now().Unix() * 1000,
		Data: &model.ServerAdd{
			Server: buildStreamServer(server, true),
		},
	}
	guest := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_SERVER_ADD,
		Timestamp: member.Timestamp,
		Data: &model.ServerAdd{
			Server: buildStreamServer(server, false),
		},
	}

	m.enqueueBroadcast(member, guest)
}

func (m *WebSocketManager) BroadcastServerRemove(id uint64) {
	update := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_SERVER_REMOVE,
		Timestamp: time.Now().Unix() * 1000,
		Data: &model.ServerRemove{
			ID: id,
		},
	}
	m.enqueueBroadcast(update, update)
}

func (m *WebSocketManager) enqueueBroadcast(member, guest *model.ServerDeltaUpdate) {
	if member == nil && guest == nil {
		return
	}

	select {
	case m.broadcast <- &wsBroadcastEnvelope{member: member, guest: guest}:
	default:
	}
}

func buildStreamServer(server *model.Server, includeHost bool) model.StreamServer {
	if server == nil {
		return model.StreamServer{}
	}

	host := utils.IfOr(includeHost, cloneHost(server.Host), filterHost(server.Host))
	state := copyHostState(server.State)

	var countryCode string
	if server.GeoIP != nil {
		countryCode = server.GeoIP.CountryCode
	}

	return model.StreamServer{
		ID:           server.ID,
		Name:         server.Name,
		PublicNote:   server.PublicNote,
		DisplayIndex: server.DisplayIndex,
		Host:         host,
		State:        state,
		CountryCode:  countryCode,
		LastActive:   server.LastActive,
	}
}

func cloneHost(h *model.Host) *model.Host {
	if h == nil {
		return nil
	}
	clone := *h
	if len(h.CPU) > 0 {
		clone.CPU = append([]string(nil), h.CPU...)
	}
	if len(h.GPU) > 0 {
		clone.GPU = append([]string(nil), h.GPU...)
	}
	return &clone
}

func filterHost(h *model.Host) *model.Host {
	if h == nil {
		return nil
	}
	return h.Filter()
}

// 检查状态是否发生变化
func hasStateChanged(old, new *model.HostState) bool {
	if old == nil || new == nil {
		return true
	}

	return old.CPU != new.CPU ||
		old.MemUsed != new.MemUsed ||
		old.SwapUsed != new.SwapUsed ||
		old.DiskUsed != new.DiskUsed ||
		old.NetInSpeed != new.NetInSpeed ||
		old.NetOutSpeed != new.NetOutSpeed ||
		old.NetInTransfer != new.NetInTransfer ||
		old.NetOutTransfer != new.NetOutTransfer ||
		old.Uptime != new.Uptime ||
		old.Load1 != new.Load1 ||
		old.Load5 != new.Load5 ||
		old.Load15 != new.Load15
}

// 复制主机状态
func copyHostState(state *model.HostState) *model.HostState {
	if state == nil {
		return nil
	}

	newState := *state
	return &newState
}

// 新的 WebSocket 处理器 - 增量推送版本
// @Summary Websocket server delta stream
// @tags common
// @Description Websocket server delta stream (incremental updates)
// @security BearerAuth
// @Router /ws/server-delta [get]
func serverDeltaStream(c *gin.Context) (any, error) {
	connId, err := uuid.GenerateUUID()
	if err != nil {
		return nil, newWsError("%v", err)
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return nil, newWsError("%v", err)
	}

	userIp := c.GetString(model.CtxKeyRealIPStr)
	if userIp == "" {
		userIp = c.RemoteIP()
	}

	u, isMember := c.Get(model.CtxKeyAuthorizedUser)
	var userId uint64
	if isMember {
		userId = u.(*model.User).ID
	}

	// 创建上下文用于取消操作
	ctx, cancel := context.WithCancel(context.Background())

	wsConn := &WebSocketConnection{
		ID:       connId,
		Conn:     conn,
		Send:     make(chan *model.ServerDeltaUpdate, 256),
		UserID:   userId,
		IsMember: isMember,
		Cancel:   cancel,
	}

	// 注册连接
	wsManager.register <- wsConn

	// 添加到在线用户列表
	singleton.AddOnlineUser(connId, &model.OnlineUser{
		UserID:      userId,
		IP:          userIp,
		ConnectedAt: time.Now(),
		Conn:        conn,
	})

	// 启动消息处理协程
	go wsConn.writePump(ctx)
	go wsConn.readPump()

	// 发送初始心跳
	wsConn.sendHeartbeat()
	wsConn.sendInitialData()

	// 等待连接关闭
	<-ctx.Done()

	// 清理资源
	wsManager.unregister <- wsConn
	singleton.RemoveOnlineUser(connId)
	conn.Close()

	return nil, newWsError("")
}

// 写入消息泵
func (c *WebSocketConnection) writePump(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second) // 心跳间隔
	defer ticker.Stop()

	for {
		select {
		case update, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))

			data, err := json.Marshal(update)
			if err != nil {
				continue
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}

		case <-ticker.C:
			c.sendHeartbeat()

		case <-ctx.Done():
			return
		}
	}
}

// 读取消息泵 (处理客户端发送的消息，主要是心跳响应)
func (c *WebSocketConnection) readPump() {
	defer c.Cancel()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *WebSocketConnection) enqueue(update *model.ServerDeltaUpdate) {
	if update == nil {
		return
	}
	select {
	case c.Send <- update:
	default:
	}
}

func (c *WebSocketConnection) sendInitialData() {
	now := time.Now().Unix() * 1000
	c.enqueue(&model.ServerDeltaUpdate{
		Type:      model.WS_MSG_ONLINE_COUNT,
		Timestamp: now,
		Data: &model.OnlineCountChange{
			Online: singleton.GetOnlineUserCount(),
		},
	})

	var servers []*model.Server
	if c.IsMember {
		servers = singleton.ServerShared.GetSortedList()
	} else {
		servers = singleton.ServerShared.GetSortedListForGuest()
	}

	for _, server := range servers {
		payload := buildStreamServer(server, c.IsMember)
		c.enqueue(&model.ServerDeltaUpdate{
			Type:      model.WS_MSG_SERVER_ADD,
			Timestamp: time.Now().Unix() * 1000,
			Data: &model.ServerAdd{
				Server: payload,
			},
		})
	}
}

// 发送心跳消息
func (c *WebSocketConnection) sendHeartbeat() {
	update := &model.ServerDeltaUpdate{
		Type:      model.WS_MSG_HEARTBEAT,
		Timestamp: time.Now().Unix() * 1000,
		Data:      nil,
	}

	c.enqueue(update)

	// 发送 ping
	c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	c.Conn.WriteMessage(websocket.PingMessage, []byte{})
}
