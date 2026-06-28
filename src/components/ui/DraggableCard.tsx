import { forwardRef, type ReactNode, type CSSProperties } from 'react';

/**
 * 通用拖放/缩放宽——对接 react-grid-layout 的网格项。
 * - 整面可拖拽（无需手柄），仅右下角缩放手柄排除
 * - 直接嵌套内容组件，编辑模式通过 EditModeContext 向下传递
 * - 透传 RGL 注入的事件处理器（onMouseDown 等）到 DOM
 */
export const DraggableCard = forwardRef<HTMLDivElement, Record<string, unknown>>(
  function DraggableCard({ style, className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={className as string | undefined}
        style={{
          height: '100%',
          boxSizing: 'border-box',
          ...(style as CSSProperties | undefined),
        }}
        {...rest}
      >
        {children as ReactNode}
      </div>
    );
  },
);
