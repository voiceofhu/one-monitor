# 服务器健康值计算和快捷键功能改进

## 改进内容

### 1. 完善服务器健康值计算

在 `apps/home/src/pages/server/components/table.tsx` 中添加了 `calculateHealthScore` 函数，实现了综合健康值计算：

**评估维度及权重：**
- CPU使用率影响 (权重: 25%)
  - >90%: -25分
  - >70%: -15分  
  - >50%: -8分

- 内存使用率影响 (权重: 25%)
  - >90%: -25分
  - >80%: -15分
  - >70%: -8分

- 硬盘使用率影响 (权重: 20%)
  - >95%: -20分
  - >85%: -12分
  - >75%: -6分

- 系统负载影响 (权重: 15%)
  - 负载比 >2: -15分
  - 负载比 >1.5: -10分
  - 负载比 >1: -5分

- 在线状态影响 (权重: 15%)
  - 离线: -15分

**计算逻辑：**
- 基础分数：100分
- 根据各项指标扣分
- 最终分数范围：0-100分
- 优先使用服务器的 `display_index` 字段，如未设置则使用计算的健康值

### 2. Input点击触发快捷键搜索

添加了点击Input框触发命令面板的功能：

**功能特性：**
- 点击搜索框自动触发 `Ctrl+K` (Windows/Linux) 或 `⌘+K` (macOS) 快捷键
- 保持原有的只读状态和样式
- 通过程序化触发键盘事件来打开命令面板
- 响应式设计，支持不同操作系统

**实现方式：**
```typescript
const triggerCommandPalette = () => {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: !isMac,
    metaKey: isMac,
    bubbles: true
  })
  document.dispatchEvent(event)
}
```

## 技术说明

### 健康值计算算法
- 采用扣分制，确保各项指标权重合理
- 考虑了服务器运行的核心指标
- 提供直观的0-100分数显示
- 兼容现有的display_index字段

### 快捷键触发机制
- 利用现有的DashCommand组件快捷键监听
- 通过事件分发机制实现点击触发
- 保持了原有的UI/UX设计

## 文件修改清单

1. `/Users/zh/Documents/workspace/voh/monitor/apps/home/src/pages/server/components/table.tsx`
   - 添加 `calculateHealthScore` 函数
   - 修改健康值列显示逻辑
   - 添加 `triggerCommandPalette` 函数
   - 为Input添加onClick事件处理

## 使用效果

1. **健康值显示**：表格中的健康值列现在显示更精确的服务器健康状态评分
2. **快捷搜索**：点击搜索框即可快速打开命令面板，无需记忆快捷键组合
3. **用户体验**：提供了更直观的服务器状态评估和更便捷的搜索交互
