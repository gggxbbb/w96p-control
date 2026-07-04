# UI Redesign V5 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 W96P 控制面板从工业风仪表盘重构为 Apple Home / 戴森风格高端消费级体验

**Architecture:** 从 8 个路由页面缩减为 3 个顶层路由 + 1 个控制中心面板。引入 framer-motion 驱动全部动效，d3-shape 驱动自然风曲线。协议层（ble/, dfu/）零改动，Zustand store 数据层保留。

**Tech Stack:** React 19 + TypeScript + framer-motion + d3-shape + Tailwind CSS 4 (仅 CSS 变量) + Vite

**新增依赖:**
- `framer-motion` (^12.x) — spring 物理动画、手势、layout animation
- `d3-shape` (^3.x) — 自然风曲线平滑插值

**移除依赖:**
- `react-gauge-component` — 自建 SVG 圆环替代
- `react-grid-layout` — 新设计不再使用可拖拽网格

---

## Phase 0: 环境准备

### Task 0.1: 安装新依赖

**Files:** `package.json`

**Step 1: Install framer-motion + d3-shape**

```bash
cd w96p-control && pnpm add framer-motion d3-shape && pnpm add -D @types/d3-shape
```

**Step 2: Verify install**

```bash
node -e "require('framer-motion'); require('d3-shape'); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: add framer-motion, d3-shape"
```

---

## Phase 1: 设计系统地基

### Task 1.1: 重写 CSS 主题变量与全局样式

**Files:**
- Modify: `src/styles.css` (完全重写)

**背景：** 现有 `styles.css` 定义了工业风配色体系（#1A1A18 暖灰、0.5px 细线边框、react-grid-layout 覆盖样式）。全部替换为 Apple Home 风格系统。

**Step 1: 备份旧文件**

```bash
cp src/styles.css src/styles.css.v4-backup
```

**Step 2: 写入新 styles.css**

```css
@import "tailwindcss";
@import "misans/lib/Normal/MiSans-Regular.min.css";
@import "misans/lib/Normal/MiSans-Medium.min.css";
@import "misans/lib/Normal/MiSans-Light.min.css";

@theme {
  --font-sans: 'MiSans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'MiSans', ui-monospace, monospace;

  /* 暗色主题（默认） */
  --color-bg: #000000;
  --color-surface: rgba(255, 255, 255, 0.06);
  --color-surface-hover: rgba(255, 255, 255, 0.1);
  --color-surface-pressed: rgba(255, 255, 255, 0.04);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.14);
  --color-text: rgba(255, 255, 255, 0.92);
  --color-text-secondary: rgba(255, 255, 255, 0.55);
  --color-text-tertiary: rgba(255, 255, 255, 0.35);
  --color-accent-start: #5E9EFF;
  --color-accent-end: #A78BFA;
  --color-accent: #5E9EFF;
  --color-success: #34D399;
  --color-warning: #FBBF24;
  --color-danger: #F87171;

  /* Turbo 模式专用 */
  --color-turbo-start: #FF6B35;
  --color-turbo-end: #FF3366;
}

:root[data-theme="light"] {
  --color-bg: #F5F5F7;
  --color-surface: rgba(0, 0, 0, 0.04);
  --color-surface-hover: rgba(0, 0, 0, 0.07);
  --color-surface-pressed: rgba(0, 0, 0, 0.02);
  --color-border: rgba(0, 0, 0, 0.06);
  --color-border-strong: rgba(0, 0, 0, 0.12);
  --color-text: rgba(0, 0, 0, 0.88);
  --color-text-secondary: rgba(0, 0, 0, 0.45);
  --color-text-tertiary: rgba(0, 0, 0, 0.25);
  --color-accent-start: #3B82F6;
  --color-accent-end: #8B5CF6;
  --color-accent: #3B82F6;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-turbo-start: #F97316;
  --color-turbo-end: #DC2626;
}

/* ===== 全局重置 ===== */
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
  height: 100dvh;
}

#root {
  height: 100dvh;
  overflow: hidden;
}

:focus:not(:focus-visible) { outline: none; }
/* 移除所有 focus-visible 轮廓（用户偏好） */
:focus-visible { outline: none; }

/* ===== 玻璃材质 mixin（通过 CSS 变量复用） ===== */
.glass-surface {
  background: var(--color-surface);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid var(--color-border);
  border-radius: 18px;
}

.glass-surface-light {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}

/* ===== 动态氛围光晕 ===== */
.aura-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(94, 158, 255, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 30% 60%, rgba(167, 139, 250, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 70% 30%, rgba(94, 158, 255, 0.06) 0%, transparent 50%);
  animation: aura-drift 60s ease-in-out infinite alternate;
}

:root[data-theme="light"] .aura-layer {
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59, 130, 246, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 30% 60%, rgba(139, 92, 246, 0.04) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 70% 30%, rgba(59, 130, 246, 0.03) 0%, transparent 50%);
}

@keyframes aura-drift {
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(1%, -0.5%) scale(1.02); }
  66% { transform: translate(-0.5%, 1%) scale(0.98); }
  100% { transform: translate(0.5%, -0.2%) scale(1.01); }
}

/* ===== 自定义滚动条（暗色） ===== */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }

/* ===== 页面加载过渡 ===== */
.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-size: 14px;
  gap: 10px;
}
.page-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: gate-spin 0.7s linear infinite;
}
@keyframes gate-spin { to { transform: rotate(360deg); } }

/* ===== 文本选择 ===== */
::selection {
  background: rgba(94, 158, 255, 0.3);
  color: var(--color-text);
}
```

**Step 3: 验证 dev server 可启动**

```bash
pnpm dev
```

Expected: localhost 可访问，无 CSS 编译错误

**Step 4: Commit**

```bash
git add src/styles.css && git commit -m "feat: rewrite CSS theme to Apple Home glass system"
```

---

## Phase 2: 核心 UI 组件

### Task 2.1: GlassCard 组件

**Files:**
- Create: `src/components/ui/GlassCard.tsx`

玻璃磨砂卡片——所有新 UI 的基础容器。

```tsx
import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  /** 更明显的玻璃效果（用于弹窗/面板） */
  prominent?: boolean;
  /** 启用 hover 浮起效果 */
  hoverable?: boolean;
}

export function GlassCard({
  children,
  prominent = false,
  hoverable = false,
  style,
  ...rest
}: GlassCardProps) {
  return (
    <motion.div
      style={{
        background: prominent
          ? 'rgba(255,255,255,0.08)'
          : 'var(--color-surface)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 18,
        padding: 20,
        boxShadow: prominent
          ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
        ...style,
      }}
      whileHover={hoverable ? { y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)' } : undefined}
      transition={{ duration: 0.2 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/ui/GlassCard.tsx && git commit -m "feat: add GlassCard component"
```

### Task 2.2: RingGauge 组件

**Files:**
- Create: `src/components/ui/RingGauge.tsx`

SVG 玻璃圆环仪表——替代 react-gauge-component。支持 wind%、Turbo 倒计时两种模式。自建 SVG 实现，framer-motion 驱动动画。

```tsx
import { motion } from 'framer-motion';

interface RingGaugeProps {
  /** 当前值（0-100），或 Turbo 剩余秒数 */
  value: number;
  /** 最大值 */
  max: number;
  /** 环直径（px） */
  size?: number;
  /** 环宽度（px） */
  strokeWidth?: number;
  /** 显示的文字 */
  label?: string;
  /** 副标题（如档位名） */
  subtitle?: string;
  /** 渐变开始色 */
  colorStart?: string;
  /** 渐变结束色 */
  colorEnd?: string;
  /** Turbo 模式 */
  isTurbo?: boolean;
  /** 长按回调 */
  onLongPress?: () => void;
}

export function RingGauge({
  value,
  max,
  size = 220,
  strokeWidth = 12,
  label,
  subtitle,
  colorStart = 'var(--color-accent-start)',
  colorEnd = 'var(--color-accent-end)',
  isTurbo = false,
  onLongPress,
}: RingGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);
  const center = size / 2;

  const turboColors = {
    start: 'var(--color-turbo-start)',
    end: 'var(--color-turbo-end)',
  };
  const cs = isTurbo ? turboColors.start : colorStart;
  const ce = isTurbo ? turboColors.end : colorEnd;

  // 光环发光强度随值变化
  const glowIntensity = isTurbo ? 0.4 + progress * 0.3 : 0.15 + progress * 0.15;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      {/* 背景光晕 */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cs}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
          opacity: 0.6,
        }}
        animate={{ scale: [1, 1.02, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
        <defs>
          <linearGradient id={`ring-gradient-${isTurbo ? 'turbo' : 'normal'}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={cs} />
            <stop offset="100%" stopColor={ce} />
          </linearGradient>
        </defs>
        {/* 背景轨道 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* 进度弧 */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#ring-gradient-${isTurbo ? 'turbo' : 'normal'})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>

      {/* 中央文字 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: isTurbo ? 52 : 64,
            fontWeight: 300,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text)',
            lineHeight: 1,
          }}
        >
          {label ?? value}
        </motion.span>
        {subtitle && (
          <span style={{
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--color-text-secondary)',
            marginTop: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/ui/RingGauge.tsx && git commit -m "feat: add RingGauge SVG component"
```

### Task 2.3: ArcSlider 组件

**Files:**
- Create: `src/components/ui/ArcSlider.tsx`

弧形渐变滑块——替代原生 range input。使用 SVG arc path + framer-motion 拖拽。

```tsx
import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface ArcSliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

const ARC_WIDTH = 280;
const ARC_HEIGHT = 60;
const ARC_RADIUS = 160;
const STROKE_WIDTH = 6;
const THUMB_SIZE = 32;

export function ArcSlider({ value, min = 0, max = 100, onChange, disabled }: ArcSliderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragX = useMotionValue(0);

  const handlePointer = useCallback((clientX: number) => {
    if (!svgRef.current || disabled) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onChange(Math.round(min + pct * (max - min)));
  }, [min, max, onChange, disabled]);

  const progress = (value - min) / (max - min);
  const thumbX = progress * ARC_WIDTH;

  return (
    <div style={{ width: ARC_WIDTH, margin: '0 auto', position: 'relative', height: ARC_HEIGHT + 20 }}>
      <svg
        ref={svgRef}
        width={ARC_WIDTH}
        height={ARC_HEIGHT + 20}
        style={{ overflow: 'visible', cursor: disabled ? 'default' : 'pointer' }}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e.clientX);
        }}
      >
        <defs>
          <linearGradient id="arc-slider-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent-start)" />
            <stop offset="100%" stopColor="var(--color-accent-end)" />
          </linearGradient>
        </defs>
        {/* 背景轨道 */}
        <path
          d={`M 0 ${ARC_HEIGHT} Q ${ARC_WIDTH / 2} -${ARC_RADIUS - ARC_HEIGHT} ${ARC_WIDTH} ${ARC_HEIGHT}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        {/* 激活轨道 */}
        <motion.path
          d={`M 0 ${ARC_HEIGHT} Q ${ARC_WIDTH / 2} -${ARC_RADIUS - ARC_HEIGHT} ${ARC_WIDTH} ${ARC_HEIGHT}`}
          fill="none"
          stroke="url(#arc-slider-grad)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${progress * ARC_WIDTH * 1.4} ${ARC_WIDTH * 1.4}`}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      {/* 拖拽点 */}
      <motion.div
        animate={{ left: thumbX - THUMB_SIZE / 2 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: ARC_HEIGHT / 2,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
    </div>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/ui/ArcSlider.tsx && git commit -m "feat: add ArcSlider component"
```

### Task 2.4: GlassButton 组件

**Files:**
- Create: `src/components/ui/GlassButton.tsx`

玻璃质感按钮，带涟漪效果。

```tsx
import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  disabled,
  ...rest
}: GlassButtonProps) {
  const sizeMap = { sm: { w: 32, h: 32, fs: 16 }, md: { w: 42, h: 42, fs: 20 }, lg: { w: 56, h: 56, fs: 24 } };
  const s = sizeMap[size];

  const variantBg = {
    default: 'var(--color-surface)',
    primary: 'linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end))',
    danger: 'var(--color-danger)',
  };

  return (
    <motion.button
      style={{
        width: s.w,
        height: s.h,
        borderRadius: '50%',
        border: variant === 'default' ? '0.5px solid var(--color-border)' : 'none',
        background: variantBg[variant],
        backdropFilter: variant === 'default' ? 'blur(10px)' : undefined,
        color: variant === 'default' ? 'var(--color-text)' : '#fff',
        fontSize: s.fs,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: variant === 'primary'
          ? '0 4px 16px rgba(94,158,255,0.35)'
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/ui/GlassButton.tsx && git commit -m "feat: add GlassButton component"
```

### Task 2.5: NavCapsule 底部导航胶囊

**Files:**
- Create: `src/components/ui/NavCapsule.tsx`

底部悬浮毛玻璃胶囊导航条。

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  key: string;
  icon: string;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', icon: '🌀', label: '风扇', path: '/' },
  { key: 'power', icon: '⚡', label: '电源', path: '/power' },
  { key: 'nature', icon: '🌊', label: '自然风', path: '/nature-wind' },
];

export function NavCapsule() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        const isActive = i === activeIndex;
        return (
          <motion.button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              position: 'relative',
              width: 52,
              height: 40,
              borderRadius: 20,
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-tertiary)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              fontFamily: 'var(--font-sans)',
            }}
            whileTap={{ scale: 0.9 }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
            <AnimatePresence>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, fontSize: 0 }}
                  animate={{ opacity: 1, fontSize: 9 }}
                  exit={{ opacity: 0, fontSize: 0 }}
                  style={{
                    fontWeight: 500,
                    color: 'var(--color-accent)',
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: 'absolute',
                  inset: 2,
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.08)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/ui/NavCapsule.tsx && git commit -m "feat: add NavCapsule bottom navigation"
```

### Task 2.6: BottomSheet 控制中心面板

**Files:**
- Create: `src/components/ui/BottomSheet.tsx`

底部滑出的控制中心面板（占 70% 屏幕高度）。

```tsx
import { type ReactNode } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
            onClick={onClose}
          />
          {/* 面板 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              if (info.velocity.y > 300 || info.offset.y > 100) onClose();
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '70%',
              background: 'rgba(28,28,30,0.95)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderTop: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '24px 24px 0 0',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {/* 抓取条 */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '10px 0 6px',
              flexShrink: 0,
            }}>
              <div style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.2)',
              }} />
            </div>
            {/* 内容区 */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '0 20px 40px',
            }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/ui/BottomSheet.tsx && git commit -m "feat: add BottomSheet control center panel"
```

### Task 2.7: DeviceCard 连接弹窗

**Files:**
- Create: `src/components/connection/DeviceCard.tsx`

AirPods 式设备连接弹窗卡片。

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectionStore } from '../../stores/connection';

interface DeviceCardProps {
  open: boolean;
  onConnect: () => void;
}

export function DeviceCard({ open, onConnect }: DeviceCardProps) {
  const deviceName = useConnectionStore((s) => s.deviceName);
  const status = useConnectionStore((s) => s.status);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{
              width: 280,
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(30px) saturate(200%)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 24,
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* 设备图标 */}
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}>
              🌀
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
                {deviceName || 'Witrn 风扇'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {status === 'connecting' ? '正在连接…' : '轻触连接'}
              </div>
            </div>
            <motion.button
              onClick={onConnect}
              disabled={status === 'connecting'}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: 24,
                cursor: status === 'connecting' ? 'default' : 'pointer',
                opacity: status === 'connecting' ? 0.6 : 1,
                boxShadow: '0 4px 20px rgba(94,158,255,0.4)',
              }}
            >
              {status === 'connecting' ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block' }}
                >
                  ⏳
                </motion.span>
              ) : (
                '🔗'
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/connection/DeviceCard.tsx && git commit -m "feat: add DeviceCard connection modal"
```

---

## Phase 3: 页面布局与路由

### Task 3.1: 新建 AppShell 布局组件

**Files:**
- Create: `src/components/layout/AppShell.tsx`

新布局：全屏沉浸式，仅包含动态光晕背景 + 内容区 + 底部导航胶囊。

```tsx
import { Outlet } from 'react-router-dom';
import { NavCapsule } from '../ui/NavCapsule';

export function AppShell() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
      overflow: 'hidden',
    }}>
      {/* 动态氛围光晕 */}
      <div className="aura-layer" />
      {/* 内容区 */}
      <div style={{
        flex: 1,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        paddingBottom: 80, // 给底部导航留空间
      }}>
        <Outlet />
      </div>
      {/* 底部导航胶囊 */}
      <NavCapsule />
    </div>
  );
}
```

**Step 1: Commit**

```bash
git add src/components/layout/AppShell.tsx && git commit -m "feat: add AppShell immersive layout"
```

### Task 3.2: 重写路由配置

**Files:**
- Modify: `src/app/router.tsx`

删除旧路由，替换为新 3 路由结构。新版路由表：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | HomePage | 主控页（圆环仪表 + 弧形滑块 + 控制中心） |
| `/power` | PowerPage | 电源页（电池环 + 电机/芯片数据） |
| `/nature-wind` | NatureWindPage | 自然风页（飘带曲线 + 预制场景） |
| `/battery-learn` | BatteryLearnPage | 保留（稍作样式适配） |
| `/debug/ble` | DebugBlePage | 保留（稍作样式适配） |

**新 router.tsx 内容：**

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

const HomePage = lazy(() => import('../pages/home'));
const PowerPage = lazy(() => import('../pages/power-v2'));
const NatureWindPage = lazy(() => import('../pages/nature-wind-v2'));
const BatteryLearnPage = lazy(() => import('../pages/battery-learn'));
const DebugBlePage = lazy(() => import('../pages/debug-ble'));

function Loading() {
  return (
    <div className="page-loading">
      <span className="page-spinner" />
      <span>加载中…</span>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><HomePage /></Suspense> },
      { path: 'power', element: <Suspense fallback={<Loading />}><PowerPage /></Suspense> },
      { path: 'nature-wind', element: <Suspense fallback={<Loading />}><NatureWindPage /></Suspense> },
      { path: 'battery-learn', element: <Suspense fallback={<Loading />}><BatteryLearnPage /></Suspense> },
      { path: 'debug/ble', element: <Suspense fallback={<Loading />}><DebugBlePage /></Suspense> },
    ],
  },
]);
```

**Step 1: Write new router.tsx**

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 会有 errors（新页面尚未创建）——记下 errors，Phase 4 创建页面后解决。

**Step 3: Commit**

```bash
git add src/app/router.tsx src/components/layout/AppShell.tsx && git commit -m "feat: rewrite router to 3-route structure with AppShell"
```

---

## Phase 4: 三大页面

### Task 4.1: 主控页 HomePage

**Files:**
- Create: `src/pages/home/index.tsx`

主控页——应用的灵魂。包含：顶部状态区 + 中央圆环仪表 + 弧形滑块 + 控制中心触发按钮 + 控制中心面板内容。

**完整实现：**

```tsx
import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RingGauge } from '../../components/ui/RingGauge';
import { ArcSlider } from '../../components/ui/ArcSlider';
import { GlassButton } from '../../components/ui/GlassButton';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { GlassCard } from '../../components/ui/GlassCard';
import { useDeviceStore } from '../../stores/device';
import { useConnectionStore } from '../../stores/connection';
import { useBle } from '../../hooks/useBle';

const GEAR_NAMES: Record<number, string> = {
  0: '关机',
  1: '轻柔',
  2: '舒适',
  3: '劲爽',
  4: '澎湃',
};

const GEAR_SPEEDS = [0, 10, 35, 70, 100];

function getGearLabel(speed: number): string {
  if (speed === 0) return '关机';
  // 找最近的档位
  let minDist = Infinity;
  let gear = 0;
  for (let i = 1; i < GEAR_SPEEDS.length; i++) {
    const d = Math.abs(speed - GEAR_SPEEDS[i]);
    if (d < minDist) { minDist = d; gear = i; }
  }
  return `${gear}档 · ${GEAR_NAMES[gear]}`;
}

export default function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const isLongPress = useRef(false);

  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const turboActive = useDeviceStore((s) => s.turboActive);
  const turboRemaining = useDeviceStore((s) => s.turboRemaining);
  const battPercent = useDeviceStore((s) => s.battPercent);
  const coreTemp = useDeviceStore((s) => s.coreTemp);
  const setFanSpeed = useBle((b) => b.setFanSpeed);
  const setTurbo = useBle((b) => b.setTurbo);
  const deviceName = useConnectionStore((s) => s.deviceName);
  const isConnected = useConnectionStore((s) => s.isConnected);

  const handleSpeedChange = useCallback((v: number) => {
    setFanSpeed(v);
  }, [setFanSpeed]);

  // 长按触发 Turbo
  const handlePointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setTurbo(true);
    }, 800);
  }, [setTurbo]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (isLongPress.current && turboActive) {
      setTurbo(false);
    }
  }, [turboActive, setTurbo]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 24px 0',
    }}>
      {/* 顶部状态区 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--color-text-secondary)' }}>
            {deviceName || 'Witrn 风扇'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            电量 {battPercent ?? '--'}%  ·  芯片 {coreTemp ?? '--'}°C
          </div>
        </div>
        {/* 连接状态指示点 */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isConnected ? 'var(--color-success)' : 'var(--color-text-tertiary)',
          boxShadow: isConnected ? '0 0 8px var(--color-success)' : 'none',
          transition: 'all 0.3s',
        }} />
      </motion.div>

      {/* 中央仪表区 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <RingGauge
          value={turboActive ? turboRemaining : fanSpeed}
          max={turboActive ? 30 : 100}
          label={turboActive
            ? String(Math.ceil(turboRemaining))
            : String(fanSpeed)}
          subtitle={turboActive ? 'TURBO' : getGearLabel(fanSpeed)}
          isTurbo={turboActive}
          size={240}
          strokeWidth={14}
        />
      </motion.div>

      {/* 底部控制区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ paddingBottom: 12 }}
      >
        {/* 弧形滑块 */}
        <ArcSlider
          value={turboActive ? 100 : fanSpeed}
          min={0}
          max={100}
          onChange={handleSpeedChange}
          disabled={turboActive}
        />

        {/* +/- 按钮 + 控制中心 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
          marginTop: 16,
        }}>
          <GlassButton onClick={() => handleSpeedChange(Math.max(0, fanSpeed - 5))} disabled={turboActive}>−</GlassButton>
          <GlassButton variant="primary" onClick={() => setSheetOpen(true)}>☰</GlassButton>
          <GlassButton onClick={() => handleSpeedChange(Math.min(100, fanSpeed + 5))} disabled={turboActive}>+</GlassButton>
        </div>
      </motion.div>

      {/* 控制中心面板 */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <ControlCenter />
      </BottomSheet>
    </div>
  );
}

/** 控制中心面板内容 */
function ControlCenter() {
  const setFanSpeed = useBle((b) => b.setFanSpeed);
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const setNatureWind = useBle((b) => b.setNatureWind);
  const fwVersion = useDeviceStore((s) => s.fwVersion);
  const serialNumber = useDeviceStore((s) => s.serialNumber);
  const bleLatency = useConnectionStore((s) => s.latencyMs);
  const toggleTheme = useSettingsStore((s) => () => s.setTheme(s.theme === 'dark' ? 'light' : 'dark'));
  const theme = useSettingsStore((s) => s.theme);

  const gears = speedCalib?.length === 4 ? speedCalib : [10, 35, 70, 100];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 档位预设 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          档位预设
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {gears.map((spd, i) => (
            <GlassCard key={i} hoverable onClick={() => setFanSpeed(spd)} style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 24, fontWeight: 300, color: 'var(--color-text)' }}>{spd}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                {GEAR_NAMES[i + 1]}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          快捷操作
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 自然风 */}
          <GlassCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }} onClick={() => setNatureWind(!natureWindOn)}>
            <span style={{ fontSize: 14 }}>🌊 自然风</span>
            <span style={{
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 12,
              background: natureWindOn ? 'rgba(94,158,255,0.2)' : 'rgba(255,255,255,0.05)',
              color: natureWindOn ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            }}>
              {natureWindOn ? '开' : '关'}
            </span>
          </GlassCard>
          {/* 主题切换 */}
          <GlassCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }} onClick={toggleTheme}>
            <span style={{ fontSize: 14 }}>🌓 外观</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {theme === 'dark' ? '深色' : '浅色'}
            </span>
          </GlassCard>
        </div>
      </div>

      {/* 设备信息 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          设备信息
        </div>
        <GlassCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InfoRow label="固件版本" value={fwVersion || '--'} />
          <InfoRow label="序列号" value={serialNumber || '--'} />
          <InfoRow label="BLE 延迟" value={bleLatency != null ? `${bleLatency}ms` : '--'} />
        </GlassCard>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
```

**Step 1: 创建目录和文件**

```bash
mkdir -p src/pages/home
```

**Step 2: 写入代码**

**Step 3: 修复 TypeScript 错误**——需要检查 `useBle` 返回值和 `useSettingsStore` 导入

**Step 4: Commit**

```bash
git add src/pages/home/ && git commit -m "feat: add HomePage with ring gauge, arc slider, control center"
```

### Task 4.2: 电源页 PowerPage

**Files:**
- Create: `src/pages/power-v2/index.tsx`

电池环形指示器 + 电机/芯片数据玻璃行。从旧 `src/pages/power/` 复用数据逻辑，UI 完全重写。

```tsx
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/ui/GlassCard';
import { RingGauge } from '../../components/ui/RingGauge';
import { useDeviceStore } from '../../stores/device';

export default function PowerPage() {
  const battPercent = useDeviceStore((s) => s.battPercent);
  const battVolt = useDeviceStore((s) => s.battVolt);
  const battCurr = useDeviceStore((s) => s.battCurr);
  const battPower = useDeviceStore((s) => s.battPower);
  const motorCurr = useDeviceStore((s) => s.motorCurr);
  const motorVolt = useDeviceStore((s) => s.motorVolt);
  const motorPower = useDeviceStore((s) => s.motorPower);
  const coreTemp = useDeviceStore((s) => s.coreTemp);
  const isCharging = useDeviceStore((s) => s.isCharging);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '40px 24px 100px' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        {/* 电池环 */}
        <RingGauge
          value={battPercent ?? 0}
          max={100}
          label={battPercent != null ? `${battPercent}%` : '--'}
          subtitle={isCharging ? '充电中' : '电池'}
          colorStart={isCharging ? 'var(--color-success)' : 'var(--color-accent-start)'}
          colorEnd={isCharging ? 'var(--color-success)' : 'var(--color-accent-end)'}
          size={200}
        />
      </motion.div>

      {/* 电池详情 */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          电池详情
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FillBar label="电压" value={battVolt} unit="V" max={5} color="var(--color-accent-start)" />
          <FillBar label="电流" value={battCurr} unit="mA" max={3000} color="var(--color-accent-end)" />
          <FillBar label="功率" value={battPower} unit="W" max={15} color="var(--color-success)" />
        </div>
      </GlassCard>

      {/* 电机与芯片 */}
      <GlassCard>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          电机与芯片
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FillBar label="电机电流" value={motorCurr} unit="mA" max={5000} color="var(--color-warning)" />
          <FillBar label="电机电压" value={motorVolt} unit="V" max={12} color="var(--color-warning)" />
          <FillBar label="电机功率" value={motorPower} unit="W" max={60} color="var(--color-danger)" />
          <FillBar label="芯片温度" value={coreTemp} unit="°C" max={80} color="var(--color-danger)" dangerThreshold={60} />
        </div>
      </GlassCard>
    </div>
  );
}

function FillBar({
  label, value, unit, max, color, dangerThreshold,
}: {
  label: string; value: number | null; unit: string; max: number;
  color: string; dangerThreshold?: number;
}) {
  const pct = value != null ? Math.min(value / max, 1) : 0;
  const isDanger = dangerThreshold != null && value != null && value >= dangerThreshold;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{
          color: isDanger ? 'var(--color-danger)' : 'var(--color-text)',
          fontWeight: 500,
        }}>
          {value != null ? `${value} ${unit}` : '--'}
        </span>
      </div>
      <div style={{
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 2,
            background: isDanger ? 'var(--color-danger)' : color,
          }}
        />
      </div>
    </div>
  );
}
```

**Step 1: 创建目录和文件**

```bash
mkdir -p src/pages/power-v2
```

**Step 2: 写入代码**

**Step 3: Commit**

```bash
git add src/pages/power-v2/ && git commit -m "feat: add PowerPage v2 with fill bars"
```

### Task 4.3: 自然风页 NatureWindPage

**Files:**
- Create: `src/pages/nature-wind-v2/index.tsx`

风之画卷：预制场景卡片 + Canvas 飘带曲线 + 自定义模式。

```tsx
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { line, curveCardinal } from 'd3-shape';
import { GlassCard } from '../../components/ui/GlassCard';
import { useDeviceStore } from '../../stores/device';
import { useBle } from '../../hooks/useBle';

// 预制风场景
const PRESETS: { name: string; description: string; curve: number[] }[] = [
  { name: '山林微风', description: '轻柔起伏，如林间清风', curve: generateCurve(128, 0.15, 0.3) },
  { name: '海边轻波', description: '规律波动，如潮汐般温柔', curve: generateCurve(128, 0.3, 1.5) },
  { name: '峡谷劲风', description: '强烈阵风，激情澎湃', curve: generateCurve(128, 0.6, 0.8) },
  { name: '草原阵风', description: '间歇性大风，草原的呼吸', curve: generateCurve(128, 0.45, 0.4) },
];

function generateCurve(points: number, amplitude: number, frequency: number): number[] {
  return Array.from({ length: points }, (_, i) => {
    const t = (i / points) * Math.PI * 2 * frequency;
    return 0.5 + Math.sin(t) * amplitude + Math.sin(t * 3) * amplitude * 0.3;
  }).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 100));
}

export default function NatureWindPage() {
  const [activePreset, setActivePreset] = useState<number | 'custom'>(0);
  const [customCurve, setCustomCurve] = useState<number[]>(PRESETS[0].curve);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 160 });

  const setNatureWindCurve = useBle((b) => b.setNatureWindCurve);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);

  const currentCurve = activePreset === 'custom' ? customCurve : PRESETS[activePreset as number].curve;

  // Canvas 绘制飘带曲线
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    const lineGen = line<number>()
      .x((_, i) => (i / (currentCurve.length - 1)) * canvasSize.w)
      .y((d) => canvasSize.h - (d / 100) * canvasSize.h)
      .curve(curveCardinal);

    // 填充
    const areaPath = new Path2D(
      lineGen.defined(() => true)(currentCurve)! +
      ` L ${canvasSize.w} ${canvasSize.h} L 0 ${canvasSize.h} Z`
    );
    const fillGrad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
    fillGrad.addColorStop(0, 'rgba(94,158,255,0.3)');
    fillGrad.addColorStop(1, 'rgba(94,158,255,0.02)');
    ctx.fillStyle = fillGrad;
    ctx.fill(areaPath);

    // 线条
    ctx.strokeStyle = 'rgba(94,158,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke(new Path2D(lineGen(currentCurve)!));
  }, [currentCurve, canvasSize]);

  const handlePresetSelect = useCallback((idx: number) => {
    setActivePreset(idx);
    setNatureWindCurve(PRESETS[idx].curve);
  }, [setNatureWindCurve]);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '40px 24px 100px' }}>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ fontSize: 20, fontWeight: 300, marginBottom: 8, color: 'var(--color-text)' }}
      >
        风之画卷
      </motion.h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        选择一种风，感受自然的呼吸
      </p>

      {/* Canvas 飘带 */}
      <GlassCard style={{ marginBottom: 24, padding: 16, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 160, display: 'block' }}
        />
      </GlassCard>

      {/* 预制场景 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {PRESETS.map((preset, i) => (
          <GlassCard
            key={i}
            hoverable
            onClick={() => handlePresetSelect(i)}
            style={{
              padding: 16,
              cursor: 'pointer',
              border: activePreset === i ? '1px solid var(--color-accent)' : undefined,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>
              {preset.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {preset.description}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
```

**Step 1: 创建目录和文件**

```bash
mkdir -p src/pages/nature-wind-v2
```

**Step 2: 写入代码**

**Step 3: Commit**

```bash
git add src/pages/nature-wind-v2/ && git commit -m "feat: add NatureWindPage v2 with d3 ribbon"
```

---

## Phase 5: 连接体验

### Task 5.1: 整合连接弹窗到 AppRoot

**Files:**
- Modify: `src/components/AppRoot.tsx`

在 AppRoot 中集成 DeviceCard 弹窗、自动重连逻辑和断连优雅降级。需要先读取现有 AppRoot。

```tsx
// 在 AppRoot 的 RouterProvider 外层包裹：
// 1. 初始自动重连逻辑（getDevices + gatt.connect）
// 2. DeviceCard 连接弹窗（仅在未连接且非自动重连时显示）
// 3. 断连状态驱动 RingGauge 暗化（通过 store 状态）
```

**具体步骤需要读取 AppRoot 后才能精确编写代码。**

**Step 1: 读取 AppRoot.tsx**

**Step 2: 编写连接逻辑**

**Step 3: Commit**

```bash
git add src/components/AppRoot.tsx src/components/connection/DeviceCard.tsx && git commit -m "feat: integrate DeviceCard with auto-reconnect"
```

---

## Phase 6: 大屏适配

### Task 6.1: PC 两栏布局适配

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/pages/home/index.tsx`
- Create: `src/hooks/useMediaQuery.ts`

**Step 1: 创建媒体查询 Hook**

```tsx
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

**Step 2: 修改 AppShell**——PC 端隐藏 NavCapsule，改为右上角设备指示

**Step 3: 修改 HomePage**——PC 端两栏：左 60% 核心控制 + 右 40% 固定控制中心

**Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx src/pages/home/index.tsx src/hooks/useMediaQuery.ts && git commit -m "feat: add PC two-column responsive layout"
```

---

## Phase 7: 清理旧代码

### Task 7.1: 移除旧依赖

**Files:** `package.json`

```bash
pnpm remove react-gauge-component react-grid-layout @types/react-grid-layout
```

**Commit:**

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: remove react-gauge-component, react-grid-layout"
```

### Task 7.2: 删除旧页面和组件

删除以下目录和文件：

```bash
# 旧页面
rm -rf src/pages/dashboard
rm -rf src/pages/fan
rm -rf src/pages/power        # 保留 power-v2 替代
rm -rf src/pages/power-config
rm -rf src/pages/ota
rm -rf src/pages/history
rm -rf src/pages/settings
rm -rf src/pages/nature-wind   # 保留 nature-wind-v2 替代

# 旧布局组件
rm -f src/components/layout/AppLayout.tsx
rm -f src/components/layout/AppBar.tsx
rm -f src/components/layout/SideNav.tsx
rm -f src/components/layout/Drawer.tsx
rm -f src/components/layout/StatusBar.tsx
rm -f src/components/layout/navItems.tsx

# 旧 UI 组件（被替代的）
rm -f src/components/ui/Card.tsx
rm -f src/components/ui/MetricCard.tsx
rm -f src/components/ui/Slider.tsx
rm -f src/components/ui/Toggle.tsx
rm -f src/components/ui/SegBtn.tsx
rm -f src/components/ui/DashboardGrid.tsx
rm -f src/components/ui/PageGrid.tsx
rm -f src/components/ui/DraggableCard.tsx
rm -f src/components/ui/EditModeContext.tsx

# 旧 fan 组件（被主控页替代）
rm -rf src/components/fan

# 旧 power 组件（被 power-v2 替代）
rm -rf src/components/power

# 旧 nature-wind 组件（被 nature-wind-v2 替代 - 保留 CurveCanvas 以备后用）
# 先保留，后续决定
```

**Commit:**

```bash
git add -A && git commit -m "chore: remove legacy pages, components, and routes"
```

### Task 7.3: 清理 styles.css 旧代码

从 `styles.css` 中移除不再需要的 react-grid-layout 样式覆盖和旧响应式导航代码。

**Commit:**

```bash
git add src/styles.css && git commit -m "chore: remove legacy CSS grid layout and nav styles"
```

### Task 7.4: 清理 main.tsx

移除 `import 'react-grid-layout/css/styles.css'` 引用。

**Commit:**

```bash
git add src/main.tsx && git commit -m "chore: remove react-grid-layout CSS import"
```

---

## Phase 8: 编译验证与修复

### Task 8.1: TypeScript 编译检查

```bash
npx tsc --noEmit
```

修复所有类型错误（可能的错误来源：新组件引用了旧 store 中已删除的字段、useBle hook 返回类型不匹配等）。

### Task 8.2: Vite build

```bash
pnpm build
```

修复所有构建错误。

### Task 8.3: OXLint 检查

```bash
pnpm lint
```

### Task 8.4: 最终提交

```bash
git add -A && git commit -m "fix: resolve TypeScript and build errors after redesign"
```

---

## 附录：文件变更总览

### 新增文件
- `src/styles.css` (重写)
- `src/components/ui/GlassCard.tsx`
- `src/components/ui/RingGauge.tsx`
- `src/components/ui/ArcSlider.tsx`
- `src/components/ui/GlassButton.tsx`
- `src/components/ui/NavCapsule.tsx`
- `src/components/ui/BottomSheet.tsx`
- `src/components/connection/DeviceCard.tsx`
- `src/components/layout/AppShell.tsx`
- `src/hooks/useMediaQuery.ts`
- `src/pages/home/index.tsx`
- `src/pages/power-v2/index.tsx`
- `src/pages/nature-wind-v2/index.tsx`

### 修改文件
- `package.json` — 添加 framer-motion/d3-shape，移除 react-gauge-component/react-grid-layout
- `src/main.tsx` — 移除 react-grid-layout CSS import
- `src/app/router.tsx` — 新路由配置
- `src/components/AppRoot.tsx` — 集成连接弹窗

### 删除文件（17+ 个）
- 旧页面: `dashboard/`, `fan/`, `power/`, `power-config/`, `ota/`, `history/`, `settings/`, `nature-wind/`
- 旧布局: `AppLayout`, `AppBar`, `SideNav`, `Drawer`, `StatusBar`, `navItems`
- 旧 UI: `Card`, `MetricCard`, `Slider`, `Toggle`, `SegBtn`, `DashboardGrid`, `PageGrid`, `DraggableCard`, `EditModeContext`
- 旧组件: `components/fan/`, `components/power/`
