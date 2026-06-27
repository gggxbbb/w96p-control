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

  return (
    <div ref={containerRef} className={`w96p-grid ${editable ? 'editable' : 'locked'}`}>
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
            cancel: '.react-resizable-handle, input, textarea, button, select, .no-drag',
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
