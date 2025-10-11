package rpc

import (
	"fmt"
	"log"
	"math"
	"regexp"
	"strconv"
	"strings"

	"github.com/nezhahq/nezha/model"
	"github.com/nezhahq/nezha/service/singleton"
)

const (
	defaultCountryCode = "XX"
	defaultIPSegment   = "NA"
)

var corePattern = regexp.MustCompile(`(?i)(\d+)\s+(?:[a-z]+\s+)?core\b`)

func maybeUpdateDefaultServerName(server *model.Server) bool {
	if server == nil || server.Name != "" {
		return false
	}

	name, ok := generateFeatureBasedServerName(server)
	if !ok {
		return false
	}

	result := singleton.DB.Model(&model.Server{}).
		Where("id = ? AND (name = '' OR name IS NULL)", server.ID).
		Update("name", name)

	if result.Error != nil {
		log.Printf("NEZHA>> failed to persist auto-generated server name for %d: %v", server.ID, result.Error)
		return false
	}

	if result.RowsAffected == 0 {
		return false
	}

	server.Name = name
	return true
}

func generateFeatureBasedServerName(server *model.Server) (string, bool) {
	if server == nil || server.Host == nil || server.GeoIP == nil {
		return "", false
	}

	country := strings.ToUpper(strings.TrimSpace(server.GeoIP.CountryCode))
	if country == "" {
		country = defaultCountryCode
	}

	cpuCores := calculateCPUCores(server.Host.CPU)
	if cpuCores == 0 {
		return "", false
	}

	memGB := calculateMemoryInGB(server.Host.MemTotal)
	if memGB == 0 {
		return "", false
	}

	ipSegment := extractIPSegment(server.GeoIP.IP)
	if ipSegment == "" {
		ipSegment = defaultIPSegment
	}

	name := fmt.Sprintf("%s-%dC%dG-%s", country, cpuCores, memGB, ipSegment)
	return name, true
}

func calculateCPUCores(cpuInfo []string) int {
	total := 0

	for _, info := range cpuInfo {
		info = strings.TrimSpace(info)
		if info == "" {
			continue
		}

		if matches := corePattern.FindStringSubmatch(info); len(matches) >= 2 {
			if count, err := strconv.Atoi(matches[1]); err == nil {
				total += count
				continue
			}
		}

		fields := strings.Fields(info)
		length := len(fields)
		if length < 2 {
			continue
		}
		if strings.EqualFold(fields[length-1], "core") {
			if count, err := strconv.Atoi(fields[length-2]); err == nil {
				total += count
				continue
			}
			if length >= 3 {
				if count, err := strconv.Atoi(fields[length-3]); err == nil {
					total += count
					continue
				}
			}
		}

		for i := length - 1; i >= 0; i-- {
			if strings.EqualFold(fields[i], "core") {
				for j := i - 1; j >= 0; j-- {
					if count, err := strconv.Atoi(fields[j]); err == nil {
						total += count
						i = -1
						break
					}
				}
				if i == -1 {
					break
				}
			}
			if strings.Contains(strings.ToLower(fields[i]), "core") {
				digits := corePattern.FindStringSubmatch(fields[i])
				if len(digits) >= 2 {
					if count, err := strconv.Atoi(digits[1]); err == nil {
						total += count
						break
					}
				}
			}
			if count, err := strconv.Atoi(fields[i]); err == nil {
				total += count
				continue
			}
		}
	}
	return total
}

func calculateMemoryInGB(memBytes uint64) int {
	if memBytes == 0 {
		return 0
	}
	memGB := int(math.Ceil(float64(memBytes) / float64(1<<30)))
	if memGB == 0 && memBytes > 0 {
		return 1
	}
	return memGB
}

func extractIPSegment(ip model.IP) string {
	if v4 := strings.TrimSpace(ip.IPv4Addr); v4 != "" {
		if idx := strings.Index(v4, "."); idx > 0 {
			return v4[:idx]
		}
		return v4
	}
	if v6 := strings.TrimSpace(ip.IPv6Addr); v6 != "" {
		if idx := strings.Index(v6, ":"); idx > 0 {
			return strings.ToUpper(v6[:idx])
		}
		return strings.ToUpper(v6)
	}
	return ""
}
