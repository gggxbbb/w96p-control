import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { gmt8Now } from '../../lib/time';

interface DeviceCurveProps {
  points: number[];
  min: number;
  max: number;
  readAt: number | null; // epoch ms
  pointCount?: number;
  totalTime?: number; // seconds
}

export function DeviceCurve({ points, min, max, readAt, pointCount, totalTime }: DeviceCurveProps) {
  const hasData = points.length === 128;

  if (!hasData) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
          color: 'var(--color-text-muted)',
          fontSize: '12px',
        }}
      >
        尚未读取，点击下方按钮读取设备曲线
      </div>
    );
  }

  const data = points.map((v, i) => ({ idx: i, value: v }));
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const avgVal = points.reduce((a, b) => a + b, 0) / points.length;
  const timeStr = readAt ? gmt8Now(readAt) : '';

  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" />
          <XAxis dataKey="idx" hide domain={[0, 127]} />
          <YAxis hide domain={[min, max]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-positive, #22c55e)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '6px',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontVariantNumeric: 'tabular-nums',
          flexWrap: 'wrap',
        }}
      >
        <span>最小 {minVal}</span>
        <span>最大 {maxVal}</span>
        <span>平均 {avgVal.toFixed(1)}</span>
        {pointCount !== undefined && <span>点数 {pointCount}</span>}
        {totalTime !== undefined && <span>时长 {totalTime}s</span>}
        {timeStr && <span>读取于 {timeStr}</span>}
      </div>
    </div>
  );
}
