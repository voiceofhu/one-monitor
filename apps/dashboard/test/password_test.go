package test

import (
	"fmt"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestPasswordHashing(t *testing.T) {
	// 原始密码
	password := "admin"

	// 使用默认成本生成哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("生成哈希密码失败: %v", err)
	}

	t.Logf("原始密码: %s", password)
	t.Logf("哈希密码: %s", string(hashedPassword))

	// 验证密码是否匹配
	err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
	if err != nil {
		t.Errorf("密码验证失败: %v", err)
	} else {
		t.Log("密码匹配成功!")
	}

	// 获取哈希成本
	cost, err := bcrypt.Cost(hashedPassword)
	if err != nil {
		t.Fatalf("获取哈希成本失败: %v", err)
	}
	t.Logf("哈希成本: %d", cost)
}

func TestPasswordMismatch(t *testing.T) {
	// 测试密码不匹配的情况
	password := "123456"
	wrongPassword := "654321"

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("生成哈希密码失败: %v", err)
	}

	// 验证错误密码应该失败
	err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(wrongPassword))
	if err == nil {
		t.Error("错误密码验证应该失败，但却成功了")
	} else if err == bcrypt.ErrMismatchedHashAndPassword {
		t.Log("正确检测到密码不匹配")
	} else {
		t.Errorf("意外的错误: %v", err)
	}
}

func TestDifferentCosts(t *testing.T) {
	password := "123456"
	costs := []int{bcrypt.MinCost, bcrypt.DefaultCost, 12}

	for _, cost := range costs {
		t.Run(fmt.Sprintf("Cost_%d", cost), func(t *testing.T) {
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), cost)
			if err != nil {
				t.Fatalf("使用成本 %d 生成哈希失败: %v", cost, err)
			}

			// 验证密码
			err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
			if err != nil {
				t.Errorf("成本 %d 的密码验证失败: %v", cost, err)
			}

			// 验证成本
			actualCost, err := bcrypt.Cost(hashedPassword)
			if err != nil {
				t.Fatalf("获取成本失败: %v", err)
			}

			expectedCost := cost
			if cost < bcrypt.MinCost {
				expectedCost = bcrypt.DefaultCost
			}

			if actualCost != expectedCost {
				t.Errorf("期望成本 %d，实际成本 %d", expectedCost, actualCost)
			}

			t.Logf("成本 %d: 哈希密码 %s", actualCost, string(hashedPassword))
		})
	}
}
