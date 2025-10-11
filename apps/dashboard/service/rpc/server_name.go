package rpc

import (
	"fmt"
	"log"
	"math"
	"net"
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
	if seg := firstIPv4Segment(ip.IPv4Addr); seg != "" {
		return seg
	}
	if seg := firstIPv6Segment(ip.IPv6Addr); seg != "" {
		return seg
	}
	joined := strings.TrimSpace(ip.Join())
	if seg := firstIPv4Segment(joined); seg != "" {
		return seg
	}
	if seg := firstIPv6Segment(joined); seg != "" {
		return seg
	}
	return ""
}

func firstIPv4Segment(input string) string {
	if input = sanitizeRawIP(input); input == "" {
		return ""
	}
	if ip := net.ParseIP(input); ip != nil {
		if v4 := ip.To4(); v4 != nil {
			return strconv.Itoa(int(v4[0]))
		}
	}
	if idx := strings.Index(input, "."); idx > 0 {
		return input[:idx]
	}
	return ""
}

func firstIPv6Segment(input string) string {
	if input = sanitizeRawIP(input); input == "" {
		return ""
	}
	lowered := strings.ToLower(input)
	if strings.HasPrefix(lowered, "::ffff:") {
		if seg := firstIPv4Segment(input[len("::ffff:"):]); seg != "" {
			return seg
		}
	}
	if idx := strings.Index(input, ":"); idx > 0 {
		return strings.ToUpper(input[:idx])
	}
	if ip := net.ParseIP(input); ip != nil && ip.To16() != nil {
		parts := strings.SplitN(strings.ToUpper(input), ":", 2)
		return parts[0]
	}
	return ""
}

func sanitizeRawIP(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "ip:")
	raw = strings.Trim(raw, "[]")
	if idx := strings.Index(raw, "%"); idx >= 0 {
		raw = raw[:idx]
	}
	return raw
}
