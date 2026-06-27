import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface CurveChartProps {
  points: number[];
  min: number;
  max: number;
}

export function CurveChart({ points, min, max }: CurveChartProps) {
  const data = points.map((v, i) => ({ idx: i, value: v }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" />
        <XAxis dataKey="idx" hide domain={[0, 127]} />
        <YAxis hide domain={[min, max]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
