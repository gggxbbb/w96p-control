import { useMemo, useCallback, type ReactNode } from 'react';
import { Responsive, WidthProvider, type Layout, type ResponsiveLayouts } from 'react-grid-layout/legacy';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  /** 页面唯一标识，用于 localStorage 隔离布局 */
  pageKey: string;
  /** 默认布局（首次加载/无缓存时使用），按断点提供 */
  defaultLayouts?: ResponsiveLayouts;
  /** 列数（按断点），默认 lg=12 md=10 sm=6 xs=2 */
  cols?: { lg: number; md: number; sm: number; xs: number };
  /** 行高 px，默认 36 */
  rowHeight?: number;
  children: ReactNode;
}

const DEFAULT_COLS = { lg: 12, md: 10, sm: 6, xs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 };

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

export function DashboardGrid({
  pageKey,
  defaultLayouts,
  cols = DEFAULT_COLS,
  rowHeight = 36,
  children,
}: DashboardGridProps) {
  const layouts = useMemo(() => {
    const saved = loadLayout(pageKey);
    return saved ?? defaultLayouts ?? {};
  }, [pageKey, defaultLayouts]);

  const onLayoutChange = useCallback(
    (_current: Layout, allLayouts: ResponsiveLayouts) => {
      saveLayout(pageKey, allLayouts);
    },
    [pageKey],
  );

  return (
    <ResponsiveGridLayout
      className="w96p-grid"
      layouts={layouts}
      cols={cols}
      breakpoints={BREAKPOINTS}
      rowHeight={rowHeight}
      margin={[10, 10]}
      containerPadding={[0, 0]}
      draggableHandle=".drag-handle"
      draggableCancel="input, textarea, button, select, .no-drag"
      onLayoutChange={onLayoutChange}
      compactType="vertical"
      preventCollision={false}
      isDraggable
      isResizable
    >
      {children}
    </ResponsiveGridLayout>
  );
}
