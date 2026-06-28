import { useMemo, useCallback, type ReactNode } from 'react';
import {
  Responsive,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from 'react-grid-layout';

const DEFAULT_COLS = { lg: 12, md: 10, sm: 6, xs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 };

/** 根据容器宽度确定当前断点列数 */
function getActiveCols(width: number, cols: { lg: number; md: number; sm: number; xs: number }): number {
  if (width >= 1200) return cols.lg;
  if (width >= 996) return cols.md;
  if (width >= 768) return cols.sm;
  return cols.xs;
}

/** 编辑模式网格叠加层 */
function GridOverlay({ width, cols, rowHeight, margin }: { width: number; cols: number; rowHeight: number; margin: [number, number] }) {
  const [mgX, mgY] = margin;
  if (width <= 0 || cols <= 0) return null;

  const colW = (width - (cols - 1) * mgX) / cols;
  const rowH = rowHeight + mgY;
  // 预估行数：撑满视口
  const rows = 40;

  const lines: ReactNode[] = [];

  // 竖线
  for (let c = 0; c <= cols; c++) {
    const x = c * (colW + mgX) - (c === cols ? mgX : 0);
    lines.push(
      <line key={`v${c}`} x1={x} y1={0} x2={x} y2={rows * rowH} stroke="var(--color-border)" strokeWidth="0.5" />,
    );
  }

  // 横线
  for (let r = 0; r <= rows; r++) {
    const y = r * rowH;
    lines.push(
      <line key={`h${r}`} x1={0} y1={y} x2={width} y2={y} stroke="var(--color-border)" strokeWidth="0.5" />,
    );
  }

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.15,
      }}
    >
      {lines}
    </svg>
  );
}

interface DashboardGridProps {
  pageKey: string;
  defaultLayouts?: ResponsiveLayouts;
  cols?: { lg: number; md: number; sm: number; xs: number };
  rowHeight?: number;
  editable?: boolean;
  children: ReactNode;
}

function loadLayout(pageKey: string): ResponsiveLayouts | null {
  try {
    const raw = localStorage.getItem(`w96p-layout-${pageKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLayout(pageKey: string, layouts: ResponsiveLayouts): void {
  try {
    localStorage.setItem(`w96p-layout-${pageKey}`, JSON.stringify(layouts));
  } catch {
    /* ignore quota errors */
  }
}

function mergeLayouts(saved: ResponsiveLayouts, defaults: ResponsiveLayouts): ResponsiveLayouts {
  const result: ResponsiveLayouts = {};
  const breakpoints = Object.keys(defaults) as Array<keyof ResponsiveLayouts>;

  for (const bp of breakpoints) {
    const savedItems = saved[bp] ?? [];
    const defaultItems = defaults[bp] ?? [];
    const savedMap = new Map(savedItems.map((item) => [item.i, item]));

    const merged: LayoutItem[] = [];
    for (const defItem of defaultItems) {
      const savedItem = savedMap.get(defItem.i);
      merged.push(savedItem ?? defItem);
    }
    result[bp] = merged;
  }

  return result;
}

export function DashboardGrid({
  pageKey,
  defaultLayouts,
  cols = DEFAULT_COLS,
  rowHeight = 36,
  editable = false,
  children,
}: DashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();

  const layouts = useMemo(() => {
    const saved = loadLayout(pageKey);
    if (saved && defaultLayouts) {
      return mergeLayouts(saved, defaultLayouts);
    }
    return saved ?? defaultLayouts ?? {};
  }, [pageKey, defaultLayouts]);

  const onLayoutChange = useCallback(
    (_current: Layout, allLayouts: ResponsiveLayouts) => {
      saveLayout(pageKey, allLayouts);
    },
    [pageKey],
  );

  const activeCols = getActiveCols(width, cols);

  return (
    <div ref={containerRef} className={`w96p-grid ${editable ? 'editable' : 'locked'}`} style={{ position: 'relative' }}>
      {editable && mounted && (
        <GridOverlay width={width} cols={activeCols} rowHeight={rowHeight} margin={[10, 10]} />
      )}
      {mounted && (
        <Responsive
          width={width}
          layouts={layouts}
          cols={cols}
          breakpoints={BREAKPOINTS}
          rowHeight={rowHeight}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: editable,
            bounded: false,
            cancel: '.react-resizable-handle, input, textarea, button, select',
            threshold: 3,
          }}
          resizeConfig={{
            enabled: editable,
            handles: ['se'],
          }}
          onLayoutChange={onLayoutChange}
        >
          {children}
        </Responsive>
      )}
    </div>
  );
}
