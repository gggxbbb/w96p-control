import { motion } from 'framer-motion';

interface RingGaugeProps {
  /** 当前值（0-100%），或 Turbo 剩余秒数 */
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
}: RingGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(value / max, 1));
  const offset = circumference * (1 - progress);
  const center = size / 2;

  const cs = isTurbo ? 'var(--color-turbo-start)' : colorStart;
  const ce = isTurbo ? 'var(--color-turbo-end)' : colorEnd;
  const gradientId = `ring-grad-${isTurbo ? 'turbo' : 'normal'}`;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
      }}
    >
      {/* 背景光晕 */}
      <div
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cs}22, transparent 70%)`,
          opacity: 0.5,
        }}
      />

      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
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
          stroke={`url(#${gradientId})`}
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
            fontSize: isTurbo ? 48 : 64,
            fontWeight: 300,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text)',
            lineHeight: 1,
          }}
        >
          {label ?? Math.round(value)}
        </motion.span>
        {subtitle && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--color-text-secondary)',
              marginTop: 6,
              letterSpacing: '0.05em',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
