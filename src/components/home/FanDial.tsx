import { useRef, useCallback, type PointerEvent, type KeyboardEvent } from 'react';
import { clamp, valueToAngle, angleToValue, pointToAngle } from './FanDial/math';

interface FanDialProps {
  value: number;
  min?: number;
  max?: number;
  'aria-label'?: string;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}

export function FanDial({ value, min = 0, max = 100, 'aria-label': ariaLabel, onChange, onCommit }: FanDialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const latestValueRef = useRef(value);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mapped = pointToAngle(clientX, clientY, rect);
    const next = angleToValue(mapped, min, max);
    latestValueRef.current = next;
    onChange?.(next);
  }, [min, max, onChange]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    ref.current?.setPointerCapture(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    ref.current?.releasePointerCapture(e.pointerId);
    onCommit?.(latestValueRef.current);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = value;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = clamp(value + 5, min, max);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        next = clamp(value - 5, min, max);
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    latestValueRef.current = next;
    onChange?.(next);
    onCommit?.(next);
  };

  const angle = valueToAngle(value, min, max);
  const radius = 92; // outer ring inner radius: 110 - 18
  const theta = (225 + angle) * (Math.PI / 180);
  const indicatorX = 110 + radius * Math.sin(theta);
  const indicatorY = 110 - radius * Math.cos(theta); // flip y for screen coords

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onKeyDown={handleKeyDown}
      style={{
        width: 220,
        height: 220,
        borderRadius: '50%',
        background: `conic-gradient(from 225deg, var(--color-new-accent-track) 0deg, var(--color-new-accent) ${angle}deg, var(--color-new-border) ${angle}deg)`,
        boxShadow: 'inset 0 0 0 18px var(--color-new-bg-page), 0 12px 32px rgba(255,140,66,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'none',
        position: 'relative',
      }}
    >
      <div style={{
        width: 154,
        height: 154,
        borderRadius: '50%',
        background: 'var(--color-new-bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 56, fontWeight: 600, color: 'var(--color-new-text)', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 14, color: 'var(--color-new-text-muted)' }}>% 转速</span>
      </div>
      <div style={{
        position: 'absolute',
        left: indicatorX,
        top: indicatorY,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--color-new-accent)',
        boxShadow: '0 2px 8px rgba(255,140,66,0.5)',
        transform: 'translate(-50%, -50%)',
      }} />
    </div>
  );
}
