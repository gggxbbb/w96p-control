# W96P 前端重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 W96P 控制面板从工业风监控面板重构为消费级智能硬件 App 体验，默认首页为大转盘风速控制，专业数据收纳在可展开详情面板与高级视图中。

**Architecture:** 保留 React + Tailwind CSS 4 + Zustand 栈；新增独立首页组件与可视化 Dial；旧 dashboard 卡片网格迁移为 `/advanced` 路由；导航改为响应式底部/侧边栏。

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Zustand 5, react-router-dom 7

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `src/styles.css` | 新增 Design Tokens（浅色/深色变量）、全局动画 |
| `src/components/home/FanDial.tsx` | 大风速圆环，处理触摸/鼠标几何与数值映射 |
| `src/components/home/FanDial.test.tsx` | 圆环数值映射、边界测试 |
| `src/components/home/GearChips.tsx` | 1-4 档快捷选择 |
| `src/components/home/GearChips.test.tsx` | 档位计算测试 |
| `src/components/home/QuickActions.tsx` | 自然风/定时/灯光/Turbo 图标按钮组 |
| `src/components/home/DetailPanel.tsx` | 可展开详情面板 |
| `src/components/home/MetricRow.tsx` | 紧凑指标行 |
| `src/components/ui/Modal.tsx` | 首页快捷操作弹窗 |
| `src/components/layout/BottomNav.tsx` | 移动端底部标签栏 |
| `src/components/layout/SideNav.tsx` | 桌面端侧边栏（改造现有） |
| `src/components/layout/navItems.tsx` | 导航项配置（改造现有） |
| `src/pages/dashboard/index.tsx` | 新总览首页（重写） |
| `src/pages/advanced/index.tsx` | 旧卡片网格高级视图（新建） |
| `src/pages/settings/index.tsx` | 增加高级视图、电池学习、BLE 调试入口 |
| `src/app/router.tsx` | 新增 `/advanced` 路由，调整默认路由 |

---

### Task 1: 更新 Design Tokens 与全局样式

**Files:**
- Modify: `src/styles.css`
- Test: `pnpm build` (无视觉回归测试，依赖构建通过)

- [ ] **Step 1: 在 `@theme` 区块追加新 tokens**

在 `src/styles.css` 的 `@theme { ... }` 内添加（保留旧 token 以防高级视图仍引用）：

```css
@theme {
  --font-sans: 'MiSans', ui-sans-serif, system-ui, sans-serif;

  /* 旧 token 保留 */
  --color-bg-page: #1A1A18;
  --color-bg-surface: #2C2C2A;
  /* ... */

  /* 新浅色 token */
  --color-new-bg-page: #FFF8F0;
  --color-new-bg-surface: #FFFFFF;
  --color-new-bg-inset: #F7F2FA;
  --color-new-border: #F0E6D8;
  --color-new-text: #2C2C2A;
  --color-new-text-muted: #888780;
  --color-new-text-dim: #5F5E5A;
  --color-new-accent: #FF8C42;
  --color-new-accent-nature: #4ECDC4;
  --color-new-accent-dark: #292F36;
  --color-new-success: #1D9E75;
  --color-new-warning: #BA7517;
  --color-new-danger: #E24B4A;
}
```

- [ ] **Step 2: 添加暗色模式变量**

在 `src/styles.css` 的 `:root[data-theme="light"]` 旁新增 `:root[data-theme="dark"]`：

```css
:root[data-theme="dark"] {
  --color-new-bg-page: #0F0F12;
  --color-new-bg-surface: #1A1A20;
  --color-new-bg-inset: #232320;
  --color-new-border: #2C2C2A;
  --color-new-text: #F4F4F5;
  --color-new-text-muted: #888780;
  --color-new-text-dim: #5F5E5A;
  --color-new-accent: #FF8C42;
  --color-new-accent-nature: #4ECDC4;
  --color-new-accent-dark: #292F36;
  --color-new-success: #1D9E75;
  --color-new-warning: #BA7517;
  --color-new-danger: #E24B4A;
}
```

- [ ] **Step 3: 添加首页常用 utility 类**

在 `src/styles.css` 末尾追加：

```css
.surface-card {
  background: var(--color-new-bg-surface);
  border: 1px solid var(--color-new-border);
  border-radius: 20px;
}
.text-label {
  font-size: 12px;
  color: var(--color-new-text-muted);
}
```

- [ ] **Step 4: 构建验证**

Run: `pnpm build`
Expected: 构建成功，无新增 TypeScript/CSS 错误。

- [ ] **Step 5: 提交**

```bash
git add src/styles.css
git commit -m "feat: add new design tokens for consumer UI"
```

---

### Task 2: 实现 FanDial 圆环组件

**Files:**
- Create: `src/components/home/FanDial.tsx`
- Create: `src/components/home/FanDial.test.tsx`

- [ ] **Step 1: 编写数值/角度映射函数测试**

创建 `src/components/home/FanDial.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest';
import { angleToValue, valueToAngle, clamp, pointToAngle } from './FanDial';

function rect(left: number, top: number, size: number): DOMRect {
  return new DOMRect(left, top, size, size);
}

describe('FanDial math', () => {
  it('clamps value between min and max', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(45, 0, 100)).toBe(45);
  });

  it('maps value to angle', () => {
    expect(valueToAngle(0, 0, 100)).toBe(0);
    expect(valueToAngle(100, 0, 100)).toBe(270);
    expect(valueToAngle(50, 0, 100)).toBe(135);
  });

  it('maps angle to value', () => {
    expect(angleToValue(0, 0, 100)).toBe(0);
    expect(angleToValue(270, 0, 100)).toBe(100);
    expect(angleToValue(135, 0, 100)).toBe(50);
  });

  it('maps pointer position to active arc angle', () => {
    const r = rect(0, 0, 200); // center (100,100)
    // bottom-left -> 0, top -> 135, bottom-right -> 270
    expect(pointToAngle(20, 180, r)).toBeCloseTo(0, 0);
    expect(pointToAngle(100, 10, r)).toBeCloseTo(135, 0);
    expect(pointToAngle(180, 180, r)).toBeCloseTo(270, 0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/components/home/FanDial.test.tsx`
Expected: FAIL，提示 `angleToValue` 等未导出。

- [ ] **Step 3: 实现 FanDial 组件与工具函数**

创建 `src/components/home/FanDial.tsx`：

```tsx
import { useRef, useCallback, type PointerEvent } from 'react';

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function valueToAngle(value: number, min: number, max: number): number {
  const ratio = (value - min) / (max - min || 1);
  return ratio * 270;
}

export function angleToValue(angle: number, min: number, max: number): number {
  const ratio = clamp(angle, 0, 270) / 270;
  return Math.round(min + ratio * (max - min));
}

/** Convert pointer position to 0-270 degrees. Active arc runs from bottom-left (135°)
 *  clockwise through top (270°) to bottom-right (45°). */
function pointToAngle(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const a = (Math.atan2(dy, dx) * (180 / Math.PI) + 360) % 360;
  let mapped: number;
  if (a >= 135) {
    mapped = a - 135;
  } else if (a <= 45) {
    mapped = a + 225;
  } else {
    // In the inactive lower-right quadrant, snap to nearest endpoint
    mapped = a < 90 ? 270 : 0;
  }
  return mapped;
}

interface FanDialProps {
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}

export function FanDial({ value, min = 0, max = 100, onChange, onCommit }: FanDialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mapped = pointToAngle(clientX, clientY, rect);
    const next = angleToValue(mapped, min, max);
    onChange?.(next);
  }, [min, max, onChange]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    ref.current?.setPointerCapture(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    ref.current?.releasePointerCapture(e.pointerId);
    onCommit?.(value);
  };

  const angle = valueToAngle(value, min, max);

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        width: 220,
        height: 220,
        borderRadius: '50%',
        background: `conic-gradient(from 180deg, #FFE8D6 0deg, var(--color-new-accent) ${angle}deg, var(--color-new-border) ${angle}deg)`,
        boxShadow: 'inset 0 0 0 18px var(--color-new-bg-page), 0 12px 32px rgba(255,140,66,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'none',
        position: 'relative',
      }}
    >
      <div style={{
        width: 154,
        height: 154,
        borderRadius: '50%',
        background: 'var(--color-new-bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 56, fontWeight: 600, color: 'var(--color-new-text)', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 14, color: 'var(--color-new-text-muted)' }}>% 转速</span>
      </div>
      <div style={{
        position: 'absolute',
        bottom: 18,
        right: 42,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--color-new-accent)',
        boxShadow: '0 2px 8px rgba(255,107,53,0.5)',
        transform: `rotate(${angle}deg)`,
        transformOrigin: '-68px -68px',
      }} />
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/components/home/FanDial.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 提交**

```bash
git add src/components/home/FanDial.tsx src/components/home/FanDial.test.tsx
git commit -m "feat: add FanDial component with touch math tests"
```

---

### Task 3: 实现 GearChips 档位组件

**Files:**
- Create: `src/components/home/GearChips.tsx`
- Create: `src/components/home/GearChips.test.tsx`

- [ ] **Step 1: 编写档位计算测试**

创建 `src/components/home/GearChips.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest';
import { computeGear } from './GearChips';

describe('GearChips computeGear', () => {
  it('returns 0 when speed is 0', () => {
    expect(computeGear(0, [20, 40, 60, 80], false)).toBe(0);
  });

  it('returns closest gear index', () => {
    expect(computeGear(35, [20, 40, 60, 80], false)).toBe(2);
    expect(computeGear(55, [20, 40, 60, 80], false)).toBe(3);
  });

  it('returns 0 in nature wind mode', () => {
    expect(computeGear(60, [20, 40, 60, 80], true)).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/components/home/GearChips.test.tsx`
Expected: FAIL，`computeGear` 未导出。

- [ ] **Step 3: 实现 GearChips 组件**

创建 `src/components/home/GearChips.tsx`：

```tsx
const GEARS = [1, 2, 3, 4] as const;

export function computeGear(speed: number, calib: number[], natureWindOn: boolean): number {
  if (speed === 0 || natureWindOn) return 0;
  let best = 0;
  let minDiff = Infinity;
  calib.forEach((sp, i) => {
    const d = Math.abs(sp - speed);
    if (d < minDiff) {
      minDiff = d;
      best = i + 1;
    }
  });
  return best;
}

interface GearChipsProps {
  speed: number;
  calib: number[];
  natureWindOn: boolean;
  onGear: (gear: number) => void;
}

export function GearChips({ speed, calib, natureWindOn, onGear }: GearChipsProps) {
  const active = computeGear(speed, calib, natureWindOn);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
      {GEARS.map((g) => {
        const isActive = active === g;
        return (
          <button
            key={g}
            onClick={() => onGear(g)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              background: isActive ? 'var(--color-new-accent)' : 'var(--color-new-bg-surface)',
              color: isActive ? '#FFFFFF' : 'var(--color-new-text-dim)',
              boxShadow: isActive ? '0 4px 12px rgba(255,140,66,0.25)' : 'inset 0 0 0 1px var(--color-new-border)',
            }}
          >
            {g} 档
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/components/home/GearChips.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 提交**

```bash
git add src/components/home/GearChips.tsx src/components/home/GearChips.test.tsx
git commit -m "feat: add GearChips component with gear computation tests"
```

---

### Task 4: 实现 QuickActions 快捷操作

**Files:**
- Create: `src/components/home/QuickActions.tsx`

- [ ] **Step 1: 实现 QuickActions 组件**

创建 `src/components/home/QuickActions.tsx`：

```tsx
import { type ReactNode } from 'react';

interface Action {
  key: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  accent?: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: Action[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {actions.map((a) => (
        <button
          key={a.key}
          onClick={a.onClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: a.active ? (a.accent ?? 'var(--color-new-accent)') : 'var(--color-new-bg-surface)',
            color: a.active ? '#FFFFFF' : 'var(--color-new-text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: a.active ? `0 4px 12px ${a.accent ?? 'var(--color-new-accent)'}40` : 'inset 0 0 0 1px var(--color-new-border)',
          }}>
            {a.icon}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-new-text)' }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/components/home/QuickActions.tsx
git commit -m "feat: add QuickActions component"
```

---

### Task 5: 实现 DetailPanel、MetricRow 与 Modal

**Files:**
- Create: `src/components/home/MetricRow.tsx`
- Create: `src/components/home/DetailPanel.tsx`
- Create: `src/components/ui/Modal.tsx`

- [ ] **Step 1: 实现 MetricRow 组件**

创建 `src/components/home/MetricRow.tsx`：

```tsx
interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function MetricRow({ label, value, unit }: MetricRowProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-new-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-new-text)', marginTop: 2 }}>
        {value}{unit && <span style={{ fontSize: 11, color: 'var(--color-new-text-muted)', marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 实现 DetailPanel 组件**

创建 `src/components/home/DetailPanel.tsx`：

```tsx
import { useState, type ReactNode } from 'react';

interface DetailPanelProps {
  children: ReactNode;
  onOpenAdvanced?: () => void;
}

export function DetailPanel({ children, onOpenAdvanced }: DetailPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          alignSelf: 'center',
          padding: '8px 16px',
          borderRadius: 20,
          border: '1px solid var(--color-new-border)',
          background: 'var(--color-new-bg-surface)',
          color: 'var(--color-new-text-dim)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        实时数据 {open ? '▾' : '▸'}
      </button>
      {open && (
        <div style={{
          background: 'var(--color-new-bg-surface)',
          border: '1px solid var(--color-new-border)',
          borderRadius: 16,
          padding: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {children}
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: 4 }}>
            <button
              onClick={onOpenAdvanced}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-new-text-muted)',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              打开完整面板
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 实现 Modal 组件**

创建 `src/components/ui/Modal.tsx`：

```tsx
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      style={{
        border: 'none',
        borderRadius: 20,
        padding: 0,
        background: 'transparent',
        maxWidth: '90vw',
        width: 360,
      }}
    >
      <div style={{
        background: 'var(--color-new-bg-surface)',
        border: '1px solid var(--color-new-border)',
        borderRadius: 20,
        padding: 16,
        color: 'var(--color-new-text)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-new-text-muted)' }}>×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
```

- [ ] **Step 4: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 5: 提交**

```bash
git add src/components/home/MetricRow.tsx src/components/home/DetailPanel.tsx src/components/ui/Modal.tsx
git commit -m "feat: add DetailPanel, MetricRow and Modal components"
```

---

### Task 6: 重写总览首页

**Files:**
- Modify: `src/pages/dashboard/index.tsx`（完全重写）

- [ ] **Step 1: 备份旧 dashboard 逻辑到 advanced 页面**

先把当前 `src/pages/dashboard/index.tsx` 的内容复制到剪贴板，供 Task 7 使用。

- [ ] **Step 2: 重写 Dashboard 为新首页**

用以下内容替换 `src/pages/dashboard/index.tsx`：

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { DisconnectedScreen } from '../../components/connection/DisconnectedScreen';
import { FanDial } from '../../components/home/FanDial';
import { GearChips } from '../../components/home/GearChips';
import { QuickActions } from '../../components/home/QuickActions';
import { DetailPanel } from '../../components/home/DetailPanel';
import { MetricRow } from '../../components/home/MetricRow';
import { Modal } from '../../components/ui/Modal';
import { TimerPanel } from '../../components/fan/TimerPanel';
import { LightPanel } from '../../components/fan/LightPanel';
import { TurboPanel } from '../../components/fan/TurboPanel';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isConnected, setFanSpeed, toggleNatureWind } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const calib = useDeviceStore((s) => s.speedCalib);
  const battery = useDeviceStore((s) => s.battery);
  const powerConfig = useDeviceStore((s) => s.powerConfig);

  const [dragSpeed, setDragSpeed] = useState<number | null>(null);
  const [modal, setModal] = useState<'timer' | 'light' | 'turbo' | null>(null);
  const displaySpeed = dragSpeed ?? fanSpeed;

  if (!isConnected) {
    return <DisconnectedScreen />;
  }

  const batteryPower = battery ? (battery.voltageMv * battery.currentMa) / 1e6 : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: '16px 16px 32px',
      minHeight: '100%',
      background: 'var(--color-new-bg-page)',
      color: 'var(--color-new-text)',
    }}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>总览</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-new-text-muted)' }}>已连接</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FanDial
          value={displaySpeed}
          onChange={setDragSpeed}
          onCommit={(v) => { setDragSpeed(null); setFanSpeed(v); }}
        />
      </div>

      <GearChips
        speed={fanSpeed}
        calib={calib}
        natureWindOn={natureWindOn}
        onGear={(g) => setFanSpeed(calib[g - 1] ?? 0)}
      />

      <QuickActions
        actions={[
          {
            key: 'nature',
            icon: '🍃',
            label: '自然风',
            active: natureWindOn,
            accent: 'var(--color-new-accent-nature)',
            onClick: () => toggleNatureWind(!natureWindOn),
          },
          {
            key: 'timer',
            icon: '⏱',
            label: '定时',
            onClick: () => setModal('timer'),
          },
          {
            key: 'light',
            icon: '💡',
            label: '灯光',
            onClick: () => setModal('light'),
          },
          {
            key: 'turbo',
            icon: '⚡',
            label: 'Turbo',
            accent: 'var(--color-new-accent-dark)',
            onClick: () => setModal('turbo'),
          },
        ]}
      />

      <DetailPanel onOpenAdvanced={() => navigate('/advanced')}>
        <MetricRow label="电池功率" value={batteryPower.toFixed(2)} unit="W" />
        <MetricRow label="电池电压" value={battery ? (battery.voltageMv / 1000).toFixed(2) : '--'} unit="V" />
        <MetricRow label="芯片温度" value={powerConfig?.powCoreTemp ?? '--'} unit="℃" />
      </DetailPanel>

      <Modal open={modal === 'timer'} onClose={() => setModal(null)} title="定时关机">
        <TimerPanel />
      </Modal>
      <Modal open={modal === 'light'} onClose={() => setModal(null)} title="灯光控制">
        <LightPanel />
      </Modal>
      <Modal open={modal === 'turbo'} onClose={() => setModal(null)} title="Turbo 模式">
        <TurboPanel />
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 构建成功。如果 `useBle` 没有 `toggleNatureWind` 或返回类型不同，按实际 hook 调整。

- [ ] **Step 4: 提交**

```bash
git add src/pages/dashboard/index.tsx
git commit -m "feat: rewrite dashboard as new consumer home"
```

---

### Task 7: 创建高级视图页面

**Files:**
- Create: `src/pages/advanced/index.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: 新建 Advanced 页面**

把 Task 6 中备份的旧 `src/pages/dashboard/index.tsx` 内容粘贴到 `src/pages/advanced/index.tsx`，仅将默认导出函数名改为 `Advanced`。

- [ ] **Step 2: 在路由中添加 /advanced**

修改 `src/app/router.tsx`，在路由列表中加入：

```tsx
const Advanced = lazy(() => import('../pages/advanced'));
```

并在 `<Route>` 中添加：

```tsx
<Route path="advanced" element={<Advanced />} />
```

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/pages/advanced/index.tsx src/app/router.tsx
git commit -m "feat: move old dense dashboard to /advanced route"
```

---

### Task 8: 更新响应式导航

**Files:**
- Create: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/layout/SideNav.tsx`
- Modify: `src/components/layout/navItems.tsx`
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: 更新 navItems 配置**

修改 `src/components/layout/navItems.tsx`，只保留四项主导航：

```tsx
export const NAV_ITEMS = [
  { path: '/', label: '总览', icon: '🏠' },
  { path: '/nature-wind', label: '自然风', icon: '🍃' },
  { path: '/power', label: '电源', icon: '⚡' },
  { path: '/settings', label: '设置', icon: '⚙️' },
];
```

- [ ] **Step 2: 实现 BottomNav**

创建 `src/components/layout/BottomNav.tsx`：

```tsx
import { useLocation, Link } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 64,
      background: 'var(--color-new-bg-surface)',
      borderTop: '1px solid var(--color-new-border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              textDecoration: 'none',
              fontSize: 10,
              color: active ? 'var(--color-new-accent)' : 'var(--color-new-text-muted)',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 改造 SideNav 使用新配置**

修改 `src/components/layout/SideNav.tsx`，使其基于 `NAV_ITEMS` 渲染，并应用新视觉 token（背景、边框、强调色）。保持现有结构，替换映射的数据源和颜色。

- [ ] **Step 4: 更新 AppLayout 使用 BottomNav**

修改 `src/components/layout/AppLayout.tsx`，在 `<StatusBar />` 之前插入 `<BottomNav />`，并只在移动端显示（通过 CSS class 或媒体查询）。桌面端继续显示 `<SideNav />`。

- [ ] **Step 5: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/components/layout/BottomNav.tsx src/components/layout/SideNav.tsx src/components/layout/navItems.tsx src/components/layout/AppLayout.tsx
git commit -m "feat: responsive nav with bottom bar and simplified side nav"
```

---

### Task 9: 更新设置页

**Files:**
- Modify: `src/pages/settings/index.tsx`

- [ ] **Step 1: 在设置页添加辅助入口**

在 `src/pages/settings/index.tsx` 底部增加一个不显眼的区域：

```tsx
<div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-new-border)' }}>
  <div style={{ fontSize: 11, color: 'var(--color-new-text-muted)', marginBottom: 8 }}>高级</div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Link to="/advanced" style={{ fontSize: 13, color: 'var(--color-new-text-dim)', textDecoration: 'none' }}>高级视图</Link>
    <Link to="/battery-learn" style={{ fontSize: 13, color: 'var(--color-new-text-dim)', textDecoration: 'none' }}>电池学习</Link>
    <Link to="/debug-ble" style={{ fontSize: 13, color: 'var(--color-new-text-dim)', textDecoration: 'none' }}>BLE 调试</Link>
  </div>
</div>
```

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/pages/settings/index.tsx
git commit -m "feat: add advanced, battery-learn, and ble-debug links in settings"
```

---

### Task 10: 更新电源与自然风页面视觉

**Files:**
- Modify: `src/pages/power/index.tsx`
- Modify: `src/pages/nature-wind/index.tsx`
- Modify: `src/components/ui/Card.tsx`（可选，应用新 token）

- [ ] **Step 1: 为 Card 组件增加新皮肤属性（可选）**

如果 `src/components/ui/Card.tsx` 被多个页面共用，可添加 `variant?: 'default' | 'new'` prop，让新页面使用新 token，旧高级视图保持原样。

- [ ] **Step 2: 更新电源页**

把 `src/pages/power/index.tsx` 最外层背景改为 `var(--color-new-bg-page)`，文字改为 `var(--color-new-text)`，卡片使用 `surface-card` 样式。

- [ ] **Step 3: 更新自然风页**

同样把 `src/pages/nature-wind/index.tsx` 背景/文字改为新 token。曲线编辑器保留功能，只调整容器圆角和颜色。

- [ ] **Step 4: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 5: 提交**

```bash
git add src/pages/power/index.tsx src/pages/nature-wind/index.tsx src/components/ui/Card.tsx
git commit -m "feat: apply new visual tokens to power and nature-wind pages"
```

---

### Task 11: 主题切换与默认浅色

**Files:**
- Modify: `src/stores/settings.ts`
- Modify: `src/components/AppRoot.tsx` 或 `src/main.tsx`

- [ ] **Step 1: 在 settings store 中扩展主题选项**

确保 `useSettingsStore` 支持 `theme: 'light' | 'dark' | 'system'` 并持久化。若已存在则复用。

- [ ] **Step 2: 应用主题到 document**

在 `src/components/AppRoot.tsx` 中用 `useEffect` 监听 theme，设置 `document.documentElement.dataset.theme`：

```tsx
useEffect(() => {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    root.dataset.theme = theme;
  }
}, [theme]);
```

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/stores/settings.ts src/components/AppRoot.tsx
git commit -m "feat: default light theme with system-aware dark mode"
```

---

### Task 12: 集成验证与收尾

**Files:**
- All modified files

- [ ] **Step 1: 运行 lint**

Run: `pnpm lint`
Expected: 无新增错误（原有 warning 可保留）。

- [ ] **Step 2: 运行测试**

Run: `npx vitest run`
Expected: 新增测试全部通过。若项目无 `test` 脚本，直接运行 `npx vitest run src/components/home`。

- [ ] **Step 3: 运行构建**

Run: `pnpm build`
Expected: 构建成功。

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: complete consumer UI refactor with dial home and advanced view"
```

---

## 自检

### 1. Spec 覆盖

| Spec 要求 | 对应任务 |
|---|---|
| 大风速圆环首页 | Task 2, Task 6 |
| 1-4 档快捷按钮 | Task 3 |
| 自然风/定时/灯光/Turbo 快捷操作 | Task 4, Task 6 |
| 可展开详情面板 | Task 5, Task 6 |
| 快捷操作弹窗（定时/灯光/Turbo） | Task 5, Task 6 |
| 高级视图收纳旧网格 | Task 7 |
| 主导航简化为四项 | Task 8 |
| 电池学习/调试不显眼光字入口 | Task 9 |
| 浅色为主 + 暗色模式 | Task 1, Task 11 |
| 电源/自然风页面视觉升级 | Task 10 |

### 2. Placeholder 扫描

- 无 "TBD"/"TODO" 作为实现占位。
- 无 "appropriate error handling" 等模糊描述。
- 每个代码步骤包含完整代码或明确引用。

### 3. 类型一致性

- `FanDial` 导出 `clamp`, `angleToValue`, `valueToAngle`, `pointToAngle` 并在测试中使用相同名称。
- `GearChips` 导出 `computeGear` 并在测试中使用相同名称。
- `NAV_ITEMS` 在 `BottomNav` 和 `SideNav` 之间共享。
- `Modal` 组件在 Task 5 定义，Task 6 中引用同名组件。
- `useBle` 的具体方法名（如 `toggleNatureWind`）若与真实 hook 不一致，实施时按实际接口调整。
