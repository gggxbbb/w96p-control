# DraggableCard 重构计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建通用 DraggableCard 壳组件，将拖拽/缩放逻辑从 Card 和 MetricCard 中剥离到壳层，内容组件变干净。

**Architecture:** DraggableCard 包装内容组件（Card / MetricCard / 自定义面板），通过 `forwardRef` 对接 react-grid-layout，通过 render prop `children(editable)` 向下传递编辑模式状态。整面可拖拽（无手柄 bar），右下角缩放手柄由壳层统一渲染。

**Tech Stack:** React 19 + TypeScript + react-grid-layout 2.2.3 + Zustand 5 + Tailwind 4

---

## 设计决策回顾

| 决策 | 选择 |
|------|------|
| 拖拽手柄位置 | 无手柄，整面拖拽，仅右下角缩放区排除 |
| 缩放手柄渲染 | DraggableCard 统一渲染 |
| 编辑模式传递 | render prop: `children(editable: boolean)`, EditModeContext 保留兼容 |

---

### Task 1: 创建 DraggableCard 组件

**Files:**
- Create: `src/components/ui/DraggableCard.tsx`
- Modify: `src/components/ui/index.ts`（如有）

**Step 1: 创建 DraggableCard.tsx**

```tsx
import { forwardRef, type ReactNode, type CSSProperties } from 'react';
import { useEditMode } from './EditModeContext';

interface DraggableCardProps {
  style?: CSSProperties;
  className?: string;
  children: (editable: boolean) => ReactNode;
}

export const DraggableCard = forwardRef<HTMLDivElement, DraggableCardProps>(
  function DraggableCard({ style, className, children }, ref) {
    const editable = useEditMode();

    return (
      <div
        ref={ref}
        className={className}
        style={{
          height: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          // 编辑模式整面显示 grab 光标
          cursor: editable ? 'grab' : undefined,
          ...style,
        }}
      >
        {children(editable)}
        {/* 缩放手柄 — 仅编辑模式可见，由 react-grid-layout 的 resizeConfig 接管 */}
        <div
          className="react-resizable-handle"
          style={{
            position: 'absolute',
            width: '16px',
            height: '16px',
            bottom: 0,
            right: 0,
            cursor: 'se-resize',
            opacity: editable ? undefined : 0,
            zIndex: 5,
            background: 'none',
            padding: 0,
          }}
        />
      </div>
    );
  },
);
```

**Step 2: 验证编译**

```bash
cd w96p-control && npx tsc --noEmit
```

---

### Task 2: 清理 Card 组件

**Files:**
- Modify: `src/components/ui/Card.tsx`

**变更清单：**
- 移除 `forwardRef` 包装，改为普通函数组件
- 移除 `dragHandle` prop
- 移除 6 点 SVG 拖拽手柄图标
- 移除 `.drag-handle` / `.no-drag` 类名
- 移除 `...rest` 扩展（不再需要透传 ref 和其他 grid 属性）
- 移除 `overflow: 'auto'`（由 DraggableCard 管理布局）

**最终 Card.tsx:**

```tsx
import { type ReactNode, type CSSProperties } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Card({ title, subtitle, children, actions, style, className }: CardProps) {
  return (
    <section
      className={className}
      style={{
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '8px',
            borderBottom: '0.5px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              {title && (
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 500, letterSpacing: '0.5px' }}>
                  {title}
                </h2>
              )}
              {subtitle && (
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
```

---

### Task 3: 清理 MetricCard 组件

**Files:**
- Modify: `src/components/ui/MetricCard.tsx`

**变更清单：**
- 移除 `forwardRef` 包装
- 移除 `useEditMode()` import 和调用
- 移除 6 点 SVG 拖拽手柄图标
- 移除 `.drag-handle` / `.drag-handle-icon` / `.no-drag` 类名
- 添加 `editable?: boolean` prop（替代 `useEditMode()`）
- 移除 `...rest` 扩展

**关键 diff（部分）：**

删除：
```typescript
import { useEditMode } from './EditModeContext';
```

接口变更：
```typescript
interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  accent?: string;
  gaugeMin?: number;
  gaugeMax?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
  editable?: boolean;  // 新增
}
```

组件签名变更：
```typescript
// Before:
export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(function MetricCard(
  { label, value, unit, accent: _accent, gaugeMin = 0, gaugeMax = 100, style, className, children, ...rest },
  ref,
) {
  const editable = useEditMode();

// After:
export function MetricCard({
  label, value, unit, accent: _accent, gaugeMin = 0, gaugeMax = 100, style, className, children, editable = false,
}: MetricCardProps) {
```

移除 drag-handle strip（128-160 行区域），改为纯 label 行：
```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '2px',
  }}
>
  <span
    style={{
      color: 'var(--color-text-muted)',
      fontSize: '10px',
      letterSpacing: '0.05em',
      flex: 1,
      minWidth: 0,
      padding: '2px 0',
    }}
  >
    {label}
  </span>
  {/* edit-mode buttons — 保留 */}
  {editable && (
    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
      ...
    </div>
  )}
</div>
```

返回值去 ref，去 `...rest`：
```tsx
return (
  <div
    className={className}
    style={{ ... }}
  >
```

config popup 的 `.no-drag` 类名也移除（不再需要）。

---

### Task 4: 更新 DashboardGrid 拖拽配置

**Files:**
- Modify: `src/components/ui/DashboardGrid.tsx`

**变更：** `dragConfig` 不再指定 `handle`，整面可拖拽；取消 `.no-drag` 类名排除。

```typescript
// Before (line 155-161):
dragConfig={{
  enabled: editable,
  bounded: false,
  handle: '.drag-handle',
  cancel: '.react-resizable-handle, input, textarea, button, select, .no-drag',
  threshold: 3,
}}

// After:
dragConfig={{
  enabled: editable,
  bounded: false,
  // 不指定 handle → 整个 grid item 可拖拽
  cancel: '.react-resizable-handle, input, textarea, button, select',
  threshold: 3,
}}
```

---

### Task 5: 更新 CSS 样式

**Files:**
- Modify: `src/styles.css`

**删除以下规则：**

```css
/* 删除 .drag-handle-icon 相关 */
.w96p-grid:not(.editable) .drag-handle-icon {
  display: none;
}
.w96p-grid.editable .drag-handle {
  cursor: grab;
}
.w96p-grid.editable .react-grid-item.react-draggable-dragging .drag-handle {
  cursor: grabbing;
}
```

**新增或修改：**

```css
/* 编辑模式下 grid item 整面显示 grab 光标 */
.w96p-grid.editable .react-grid-item {
  cursor: grab;
}
.w96p-grid.editable .react-grid-item.react-draggable-dragging {
  cursor: grabbing;
}
```

注意：DraggableCard 的内联 `cursor` 会覆盖此规则，所以这里作为后备。缩放手柄的 `cursor: se-resize` 优先级更高，不受影响。

---

### Task 6: 更新所有页面 — 用 DraggableCard 包装

涉及 7 个页面文件 + 6 个自定义面板组件。

#### 6a. Dashboard 页面

**Files:**
- Modify: `src/pages/dashboard/index.tsx`

**MetricCards（7 个）：** 每个用 DraggableCard 包装，传入 `editable`。

```tsx
// Before:
<MetricCard key="rpm" label="转速" value={rpm} />

// After:
<DraggableCard key="rpm">
  {(editable) => <MetricCard key="rpm" label="转速" value={rpm} editable={editable} />}
</DraggableCard>
```

> 注意：key 保留在 DraggableCard 上（react-grid-layout 通过 key 索引 layout），MetricCard 的 key 可移除。

**Cards（3 个）：** 移除 `dragHandle` prop，用 DraggableCard 包装。

```tsx
// Before:
<Card key="fan-control" title="风扇控制" subtitle={...} dragHandle>
  <SpeedControl />
</Card>

// After:
<DraggableCard key="fan-control">
  {() => (
    <Card title="风扇控制" subtitle={...}>
      <SpeedControl />
    </Card>
  )}
</DraggableCard>
```

同理处理 "状态" 和 "自然风曲线" Card。

#### 6b. Fan 页面

**Files:**
- Modify: `src/pages/fan/index.tsx`

```tsx
// Before:
<SpeedControl key="speed-control" dragHandle />
<TimerPanel key="timer" dragHandle />
<SleepPanel key="sleep" dragHandle />
<Card key="gear-down" title="减档模式" dragHandle>...</Card>
<SpeedCalibPanel key="speed-calib" dragHandle />

// After:
<DraggableCard key="speed-control">
  {() => <SpeedControl />}
</DraggableCard>
<DraggableCard key="timer">
  {() => <TimerPanel />}
</DraggableCard>
<DraggableCard key="sleep">
  {() => <SleepPanel />}
</DraggableCard>
<DraggableCard key="gear-down">
  {() => <Card title="减档模式">...</Card>}
</DraggableCard>
<DraggableCard key="speed-calib">
  {() => <SpeedCalibPanel />}
</DraggableCard>
```

#### 6c. Power 页面

**Files:**
- Modify: `src/pages/power/index.tsx`

```tsx
// Before:
<BatteryPanel key="battery" dragHandle />
<VbusPanel key="vbus" dragHandle />
<MotorPanel key="motor" dragHandle />

// After:
<DraggableCard key="battery">
  {() => <BatteryPanel />}
</DraggableCard>
<DraggableCard key="vbus">
  {() => <VbusPanel />}
</DraggableCard>
<DraggableCard key="motor">
  {() => <MotorPanel />}
</DraggableCard>
```

#### 6d. Nature Wind 页面

**Files:**
- Modify: `src/pages/nature-wind/index.tsx`

4 个 Card 全部去掉 `dragHandle`，用 DraggableCard 包装。

#### 6e. Settings 页面

**Files:**
- Modify: `src/pages/settings/index.tsx`

5 个 Card 全部去掉 `dragHandle`，用 DraggableCard 包装。

#### 6f. History 页面

**Files:**
- Modify: `src/pages/history/index.tsx`

```tsx
// Before:
<Card key="placeholder" title="历史数据" subtitle="功能开发中" dragHandle/>

// After:
<DraggableCard key="placeholder">
  {() => <Card title="历史数据" subtitle="功能开发中" />}
</DraggableCard>
```

#### 6g. Power Config 页面

**Files:**
- Modify: `src/components/power/PowerConfigPanel.tsx`

PowerConfigPanel 内部直接渲染 Card（带 dragHandle），现在是 `<PageGrid>` 的 children。改为 DraggableCard 包装。

但 PowerConfigPanel 是动态渲染多个 Card 的组件，需要重构其导出。查看现状：

```tsx
// 当前 PowerConfigPanel 在页面中作为 children 渲染多个 <Card ... dragHandle>
// 作为 <PageGrid> 的直接子元素
```

**方案：** 将 PowerConfigPanel 改为返回 DraggableCard 列表。

---

### Task 7: 更新自定义面板组件 — 移除 dragHandle prop

**Files to modify:**
- `src/components/fan/SpeedControl.tsx`
- `src/components/fan/TimerPanel.tsx`
- `src/components/fan/SleepPanel.tsx`
- `src/components/fan/SpeedCalibPanel.tsx`
- `src/components/power/BatteryPanel.tsx`
- `src/components/power/VbusPanel.tsx`
- `src/components/power/MotorPanel.tsx`

每个文件做相同修改：
1. 从 props 和接口中移除 `dragHandle?: boolean`
2. 移除传递给 `<Card>` 的 `dragHandle` prop
3. 移除传递给 `<Card>` 的 `style` prop（style 现由 DraggableCard 管理）

示例 — SpeedControl.tsx：

```typescript
// Before:
export function SpeedControl({ dragHandle, style }: { dragHandle?: boolean; style?: React.CSSProperties }) {
  return (
    <Card title="转速控制" subtitle={...} dragHandle={dragHandle} style={style}>
      ...
    </Card>
  );
}

// After:
export function SpeedControl() {
  return (
    <Card title="转速控制" subtitle={...}>
      ...
    </Card>
  );
}
```

---

### Task 8: 构建验证

**Step 1: TypeScript 编译检查**

```bash
cd w96p-control && npx tsc --noEmit
```

**Step 2: Vite 构建**

```bash
cd w96p-control && npx vite build
```

预期：零错误通过。

---

### Task 9: 功能验证清单

手动验证以下场景：

- [ ] 非编辑模式：所有页面正常显示，无视觉变化
- [ ] 进入编辑模式：缩放手柄可见，整面可拖拽
- [ ] 编辑模式拖拽：卡片平滑移动，占位符显示正常
- [ ] 编辑模式缩放：右下角手柄可拖拽调整尺寸
- [ ] MetricCard 编辑按钮：编辑模式下显示 `#`/`◔`/`⚙`
- [ ] MetricCard 配置弹窗：档位切换、范围设置正常
- [ ] 退出编辑模式：缩放手柄隐藏，不可拖拽/缩放
- [ ] 布局重置：各页面重置恢复默认布局
- [ ] 布局持久化：拖拽后刷新页面，布局保持

---

## 文件变更汇总

| 操作 | 文件 |
|------|------|
| 新建 | `src/components/ui/DraggableCard.tsx` |
| 修改 | `src/components/ui/Card.tsx` |
| 修改 | `src/components/ui/MetricCard.tsx` |
| 修改 | `src/components/ui/DashboardGrid.tsx` |
| 修改 | `src/styles.css` |
| 修改 | `src/pages/dashboard/index.tsx` |
| 修改 | `src/pages/fan/index.tsx` |
| 修改 | `src/pages/power/index.tsx` |
| 修改 | `src/pages/nature-wind/index.tsx` |
| 修改 | `src/pages/settings/index.tsx` |
| 修改 | `src/pages/history/index.tsx` |
| 修改 | `src/components/fan/SpeedControl.tsx` |
| 修改 | `src/components/fan/TimerPanel.tsx` |
| 修改 | `src/components/fan/SleepPanel.tsx` |
| 修改 | `src/components/fan/SpeedCalibPanel.tsx` |
| 修改 | `src/components/power/BatteryPanel.tsx` |
| 修改 | `src/components/power/VbusPanel.tsx` |
| 修改 | `src/components/power/MotorPanel.tsx` |
| 修改 | `src/components/power/PowerConfigPanel.tsx` |
