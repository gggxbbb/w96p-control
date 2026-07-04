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
      whileHover={
        hoverable
          ? {
              y: -2,
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
            }
          : undefined
      }
      transition={{ duration: 0.2 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
