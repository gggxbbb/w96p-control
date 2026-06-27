import { useMemo, useCallback, type ReactNode } from 'react';
import { Responsive, WidthProvider, type Layout, type LayoutItem, type ResponsiveLayouts } from 'react-grid-layout/legacy';

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
  /** 是否允许拖拽/缩放，默认 true */
  editable?: boolean;
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

/**
 * 将已保存的布局与默认布局合并：
 * - 已保存的条目保留用户自定义位置/大小
 * - 默认布局中有但已保存布局中缺失的条目（如新增的卡片），从默认布局补入
 * - 已保存布局中存在但默认布局中没有的条目（已删除的卡片），丢弃
 */
function mergeLayouts(saved: ResponsiveLayouts, defaults: ResponsiveLayouts): ResponsiveLayouts {
  const result: ResponsiveLayouts = {};
  const breakpoints = Object.keys(defaults) as Array<keyof ResponsiveLayouts>;

  for (const bp of breakpoints) {
    const savedItems = saved[bp] ?? [];
    const defaultItems = defaults[bp] ?? [];
    const savedMap = new Map(savedItems.map((item) => [item.i, item]));

    // 保留 saved 中仍然存在于 defaults 的条目；defaults 中缺失的从 defaults 补入
    const merged: LayoutItem[] = [];
    for (const defItem of defaultItems) {
      const savedItem = savedMap.get(defItem.i);
      merged.push(savedItem ?? defItem);
    }
    // saved 中有额外条目（已删除的）直接忽略
    result[bp] = merged;
  }

  return result;
}

export function DashboardGrid({
  pageKey,
  defaultLayouts,
  cols = DEFAULT_COLS,
  rowHeight = 36,
  editable = true,
  children,
}: DashboardGridProps) {
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

  return (
    <ResponsiveGridLayout
      className={`w96p-grid ${editable ? 'editable' : 'locked'}`}
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
      isDraggable={editable}
      isResizable={editable}
    >
      {children}
    </ResponsiveGridLayout>
  );
}
