package controller

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nezhahq/nezha/model"
	"github.com/nezhahq/nezha/pkg/utils"
	"github.com/nezhahq/nezha/service/singleton"
)

// 服务器列表响应结构
type ServerListResponse struct {
	Now     int64                `json:"now"`
	Online  int                  `json:"online"`
	Servers []model.StreamServer `json:"servers"`
}

// GET /api/v1/servers - 获取所有服务器列表
// @Summary Get server list
// @Tags server
// @Description Get all servers list with current status
// @Security BearerAuth
// @Produce json
// @Success 200 {object} model.CommonResponse[ServerListResponse]
// @Router /servers [get]
func getServerList(c *gin.Context) (ServerListResponse, error) {
	_, isMember := c.Get(model.CtxKeyAuthorizedUser)

	var serverList []*model.Server
	if isMember {
		serverList = singleton.ServerShared.GetSortedList()
	} else {
		serverList = singleton.ServerShared.GetSortedListForGuest()
	}

	servers := make([]model.StreamServer, 0, len(serverList))
	for _, server := range serverList {
		var countryCode string
		if server.GeoIP != nil {
			countryCode = server.GeoIP.CountryCode
		}
		servers = append(servers, model.StreamServer{
			ID:           server.ID,
			Name:         server.Name,
			PublicNote:   server.PublicNote, // 首次加载返回完整公开备注
			DisplayIndex: server.DisplayIndex,
			Host:         utils.IfOr(isMember, server.Host, server.Host.Filter()),
			State:        server.State,
			CountryCode:  countryCode,
			LastActive:   server.LastActive,
		})
	}

	return ServerListResponse{
		Now:     time.Now().Unix() * 1000,
		Online:  singleton.GetOnlineUserCount(),
		Servers: servers,
	}, nil
}
