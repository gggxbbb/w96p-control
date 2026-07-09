import { useRef, useCallback, type PointerEvent } from 'react';

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function valueToAngle(value: number, min: number, max: number): number {
  const ratio = (value - min) / (max - min || 1);
  return ratio * 270;
}

export function angleToValue(angle: number, min: number, max: number): number {
  const ratio = clamp(angle, 0, 270) / 270;
  return Math.round(min + ratio * (max - min));
}

/** Convert pointer position to 0-270 degrees. Active arc runs from bottom-left (135°)
 *  clockwise through top (270°) to bottom-right (45°). */
export function pointToAngle(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const a = (Math.atan2(dy, dx) * (180 / Math.PI) + 360) % 360;
  let mapped: number;
  if (a >= 135) {
    mapped = a - 135;
  } else if (a <= 45) {
    mapped = a + 225;
  } else {
    // In the inactive lower-right quadrant, snap to nearest endpoint
    mapped = a < 90 ? 270 : 0;
  }
  return mapped;
}

interface FanDialProps {
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}

export function FanDial({ value, min = 0, max = 100, onChange, onCommit }: FanDialProps) {
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

  const angle = valueToAngle(value, min, max);
  const radius = 92; // outer ring inner radius: 110 - 18
  const theta = (135 + angle) * (Math.PI / 180);
  const indicatorX = 110 + radius * Math.cos(theta);
  const indicatorY = 110 - radius * Math.sin(theta); // flip y for screen coords

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        width: 220,
        height: 220,
        borderRadius: '50%',
        background: `conic-gradient(from 135deg, #FFE8D6 0deg, var(--color-new-accent) ${angle}deg, var(--color-new-border) ${angle}deg)`,
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
        boxShadow: '0 2px 8px rgba(255,107,53,0.5)',
        transform: 'translate(-50%, -50%)',
      }} />
    </div>
  );
}
