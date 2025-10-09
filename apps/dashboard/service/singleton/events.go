package singleton

import (
	"sync"

	"github.com/nezhahq/nezha/model"
)

var (
	eventMu sync.RWMutex

	serverStateObservers  []func(*model.Server)
	serverInfoObservers   []func(*model.Server)
	serverAddObservers    []func(*model.Server)
	serverRemoveObservers []func(uint64)
	onlineCountObservers  []func(int)
)

// RegisterServerStateObserver 注册服务器状态变化观察者
func RegisterServerStateObserver(fn func(*model.Server)) {
	if fn == nil {
		return
	}
	eventMu.Lock()
	defer eventMu.Unlock()
	serverStateObservers = append(serverStateObservers, fn)
}

// RegisterServerInfoObserver 注册服务器信息变化观察者
func RegisterServerInfoObserver(fn func(*model.Server)) {
	if fn == nil {
		return
	}
	eventMu.Lock()
	defer eventMu.Unlock()
	serverInfoObservers = append(serverInfoObservers, fn)
}

// RegisterServerAddObserver 注册服务器新增观察者
func RegisterServerAddObserver(fn func(*model.Server)) {
	if fn == nil {
		return
	}
	eventMu.Lock()
	defer eventMu.Unlock()
	serverAddObservers = append(serverAddObservers, fn)
}

// RegisterServerRemoveObserver 注册服务器删除观察者
func RegisterServerRemoveObserver(fn func(uint64)) {
	if fn == nil {
		return
	}
	eventMu.Lock()
	defer eventMu.Unlock()
	serverRemoveObservers = append(serverRemoveObservers, fn)
}

// RegisterOnlineCountObserver 注册在线用户数变化观察者
func RegisterOnlineCountObserver(fn func(int)) {
	if fn == nil {
		return
	}
	eventMu.Lock()
	defer eventMu.Unlock()
	onlineCountObservers = append(onlineCountObservers, fn)
}

// NotifyServerStateUpdate 通知服务器状态变化
func NotifyServerStateUpdate(server *model.Server) {
	eventMu.RLock()
	defer eventMu.RUnlock()
	for _, fn := range serverStateObservers {
		fn(server)
	}
}

// NotifyServerInfoUpdate 通知服务器信息变化
func NotifyServerInfoUpdate(server *model.Server) {
	eventMu.RLock()
	defer eventMu.RUnlock()
	for _, fn := range serverInfoObservers {
		fn(server)
	}
}

// NotifyServerAdd 通知服务器新增
func NotifyServerAdd(server *model.Server) {
	eventMu.RLock()
	defer eventMu.RUnlock()
	for _, fn := range serverAddObservers {
		fn(server)
	}
}

// NotifyServerRemove 通知服务器删除
func NotifyServerRemove(id uint64) {
	eventMu.RLock()
	defer eventMu.RUnlock()
	for _, fn := range serverRemoveObservers {
		fn(id)
	}
}

// NotifyOnlineCountChange 通知在线用户数变化
func NotifyOnlineCountChange(count int) {
	eventMu.RLock()
	defer eventMu.RUnlock()
	for _, fn := range onlineCountObservers {
		fn(count)
	}
}
