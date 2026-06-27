import { useState, type ReactNode } from 'react';
import { DashboardGrid } from './DashboardGrid';
import type { ResponsiveLayouts } from 'react-grid-layout';

interface PageGridProps {
  /** 页面唯一标识，用于 localStorage 隔离布局 */
  pageKey: string;
  /** 页面显示名称，用于工具栏标题和按钮文案 */
  pageName: string;
  /** 默认布局 */
  defaultLayouts: ResponsiveLayouts;
  /** 列数（按断点） */
  cols?: { lg: number; md: number; sm: number; xs: number };
  /** 行高 px */
  rowHeight?: number;
  children: ReactNode;
}

export function PageGrid({
  pageKey,
  pageName,
  defaultLayouts,
  cols,
  rowHeight,
  children,
}: PageGridProps) {
  const [editMode, setEditMode] = useState(false);
  const [gridKey, setGridKey] = useState(0);

  const resetLayout = () => {
    localStorage.removeItem(`w96p-layout-${pageKey}`);
    setGridKey((k) => k + 1);
  };

  return (
    <div>
      <div style={toolbarStyle}>
        <span style={titleStyle}>{pageName}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editMode && (
            <button onClick={resetLayout} style={btnStyle}>
              重置布局
            </button>
          )}
          <button
            onClick={() => setEditMode((v) => !v)}
            style={editMode ? activeBtnStyle : btnStyle}
          >
            {editMode ? '完成' : `编辑${pageName}布局`}
          </button>
        </div>
      </div>
      <DashboardGrid
        key={gridKey}
        pageKey={pageKey}
        defaultLayouts={defaultLayouts}
        cols={cols}
        rowHeight={rowHeight}
        editable={editMode}
      >
        {children}
      </DashboardGrid>
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '0.5px',
  color: 'var(--color-text)',
};

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '6px',
  padding: '6px 12px',
  color: 'var(--color-text-muted)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const activeBtnStyle: React.CSSProperties = {
  ...btnStyle,
  color: 'var(--color-accent)',
  borderColor: 'var(--color-accent)',
};
