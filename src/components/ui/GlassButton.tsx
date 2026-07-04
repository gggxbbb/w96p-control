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
  style,
  ...rest
}: GlassButtonProps) {
  const sizeMap: Record<string, { w: number; h: number; fs: number }> = {
    sm: { w: 32, h: 32, fs: 16 },
    md: { w: 42, h: 42, fs: 20 },
    lg: { w: 56, h: 56, fs: 24 },
  };
  const s = sizeMap[size];

  const variantBg: Record<string, string> = {
    default: 'var(--color-surface)',
    primary:
      'linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end))',
    danger: 'var(--color-danger)',
  };

  const variantShadow: Record<string, string> = {
    default: '0 2px 8px rgba(0,0,0,0.15)',
    primary: '0 4px 16px rgba(94,158,255,0.35)',
    danger: '0 4px 16px rgba(248,113,113,0.35)',
  };

  return (
    <motion.button
      style={{
        width: s.w,
        height: s.h,
        borderRadius: '50%',
        border:
          variant === 'default'
            ? '0.5px solid var(--color-border)'
            : 'none',
        background: variantBg[variant],
        backdropFilter: variant === 'default' ? 'blur(10px)' : undefined,
        WebkitBackdropFilter: variant === 'default' ? 'blur(10px)' : undefined,
        color: variant === 'default' ? 'var(--color-text)' : '#fff',
        fontSize: s.fs,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: variantShadow[variant],
        ...style,
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
