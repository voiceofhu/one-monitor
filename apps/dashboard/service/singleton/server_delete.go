package singleton

import (
	"github.com/nezhahq/nezha/model"
	"gorm.io/gorm"
)

// DeleteServers removes the specified servers and any related records that depend on them.
// natIDs returns the IDs of NAT entries that were deleted so in-memory caches can be updated.
func DeleteServers(tx *gorm.DB, serverIDs []uint64) (natIDs []uint64, err error) {
	if len(serverIDs) == 0 {
		return nil, nil
	}

	if err = tx.Model(&model.NAT{}).
		Where("server_id IN ?", serverIDs).
		Pluck("id", &natIDs).Error; err != nil {
		return nil, err
	}

	if err = tx.Unscoped().
		Delete(&model.ServiceHistory{}, "server_id IN ?", serverIDs).Error; err != nil {
		return nil, err
	}

	if err = tx.Unscoped().
		Delete(&model.Transfer{}, "server_id IN ?", serverIDs).Error; err != nil {
		return nil, err
	}

	if err = tx.Unscoped().
		Delete(&model.NAT{}, "server_id IN ?", serverIDs).Error; err != nil {
		return nil, err
	}

	if err = tx.Unscoped().
		Delete(&model.ServerGroupServer{}, "server_id IN ?", serverIDs).Error; err != nil {
		return nil, err
	}

	if err = tx.Unscoped().
		Delete(&model.Server{}, "id IN ?", serverIDs).Error; err != nil {
		return nil, err
	}

	return natIDs, nil
}
