import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { DisconnectedScreen } from '../../components/connection/DisconnectedScreen';
import { Card } from '../../components/ui/Card';
import { PageGrid } from '../../components/ui/PageGrid';
import { MetricCard } from '../../components/ui/MetricCard';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { GearRow } from '../../components/fan/GearRow';
import { StatusSummary } from '../../components/dashboard/StatusSummary';
import { fmtVoltage, fmtPower } from '../../lib/format';
import type { ResponsiveLayouts } from 'react-grid-layout';

interface CurvePreviewProps {
  points: number[];
  min: number;
  max: number;
}

function CurvePreview({ points, min, max }: CurvePreviewProps) {
  const w = 600;
  const h = 60;
  const range = max - min || 1;
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const avg = points.reduce((a, b) => a + b, 0) / points.length;
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <pattern id="curve-grid" width="20" height="16" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 16" fill="none" stroke="var(--color-bg-page)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={w} height={h} fill="url(#curve-grid)" />
          <polyline
            points={coords}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          paddingTop: '6px',
        }}
      >
        <span>最小 {minVal}</span>
        <span>最大 {maxVal}</span>
        <span>平均 {avg.toFixed(1)}</span>
      </div>
    </div>
  );
}

const DASHBOARD_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'speed', x: 0, y: 0, w: 3, h: 2 },
    { i: 'batt-power', x: 3, y: 0, w: 3, h: 2 },
    { i: 'motor-power', x: 6, y: 0, w: 3, h: 2 },
    { i: 'motor-cur', x: 9, y: 0, w: 3, h: 2 },
    { i: 'batt-volt', x: 0, y: 2, w: 3, h: 2 },
    { i: 'vbus-volt', x: 3, y: 2, w: 3, h: 2 },
    { i: 'motor-volt', x: 6, y: 2, w: 3, h: 2 },
    { i: 'fan-control', x: 0, y: 4, w: 8, h: 6 },
    { i: 'status', x: 8, y: 4, w: 4, h: 6 },
    { i: 'curve', x: 0, y: 10, w: 12, h: 6 },
  ],
  md: [
    { i: 'speed', x: 0, y: 0, w: 5, h: 2 },
    { i: 'batt-power', x: 5, y: 0, w: 5, h: 2 },
    { i: 'motor-power', x: 0, y: 2, w: 5, h: 2 },
    { i: 'motor-cur', x: 5, y: 2, w: 5, h: 2 },
    { i: 'batt-volt', x: 0, y: 4, w: 5, h: 2 },
    { i: 'vbus-volt', x: 5, y: 4, w: 5, h: 2 },
    { i: 'motor-volt', x: 0, y: 6, w: 5, h: 2 },
    { i: 'fan-control', x: 0, y: 8, w: 10, h: 6 },
    { i: 'status', x: 0, y: 14, w: 10, h: 6 },
    { i: 'curve', x: 0, y: 20, w: 10, h: 6 },
  ],
  sm: [
    { i: 'speed', x: 0, y: 0, w: 3, h: 2 },
    { i: 'batt-power', x: 3, y: 0, w: 3, h: 2 },
    { i: 'motor-power', x: 0, y: 2, w: 3, h: 2 },
    { i: 'motor-cur', x: 3, y: 2, w: 3, h: 2 },
    { i: 'batt-volt', x: 0, y: 4, w: 3, h: 2 },
    { i: 'vbus-volt', x: 3, y: 4, w: 3, h: 2 },
    { i: 'motor-volt', x: 0, y: 6, w: 3, h: 2 },
    { i: 'fan-control', x: 0, y: 8, w: 6, h: 6 },
    { i: 'status', x: 0, y: 14, w: 6, h: 6 },
    { i: 'curve', x: 0, y: 20, w: 6, h: 6 },
  ],
  xs: [
    { i: 'speed', x: 0, y: 0, w: 2, h: 2 },
    { i: 'batt-power', x: 0, y: 2, w: 2, h: 2 },
    { i: 'motor-power', x: 0, y: 4, w: 2, h: 2 },
    { i: 'motor-cur', x: 0, y: 6, w: 2, h: 2 },
    { i: 'batt-volt', x: 0, y: 8, w: 2, h: 2 },
    { i: 'vbus-volt', x: 0, y: 10, w: 2, h: 2 },
    { i: 'motor-volt', x: 0, y: 12, w: 2, h: 2 },
    { i: 'fan-control', x: 0, y: 14, w: 2, h: 6 },
    { i: 'status', x: 0, y: 20, w: 2, h: 6 },
    { i: 'curve', x: 0, y: 26, w: 2, h: 6 },
  ],
};

export default function Dashboard() {
  const { isConnected, profile, setFanSpeed, toggleNatureWind } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const battery = useDeviceStore((s) => s.battery);
  const powerStatus = useDeviceStore((s) => s.powerStatus);
  const motor = useDeviceStore((s) => s.motor);
  const natureCurve = useDeviceStore((s) => s.natureCurve);

  // 拖动时本地暂存转速，释放时才写蓝牙
  const [dragSpeed, setDragSpeed] = useState<number | null>(null);

  if (!isConnected || !profile) {
    return <DisconnectedScreen />;
  }

  // 派生计算
  const batteryPower = battery ? (battery.voltageMv * battery.currentMa) / 1e6 : 0;
  const motorPower = motor
    ? profile.motorPowerUsesMotorVoltage
      ? (motor.voltageMv * motor.currentMa) / 1e6
      : battery
        ? (battery.voltageMv * motor.currentMa) / 1e6
        : 0
    : 0;

  const minSpeed = profile.minSpeed;
  const maxSpeed = profile.maxSpeed;

  // 曲线预览数据（仅 128 点时显示）
  const curvePoints = natureCurve.length === 128 ? natureCurve : [];

  const displaySpeed = dragSpeed ?? fanSpeed;

  return (
    <PageGrid pageKey="dashboard" pageName="总览" defaultLayouts={DASHBOARD_LAYOUTS}>
      <MetricCard
        key="speed"
        label="转速"
        value={fanSpeed}
        unit="%"
        accent={fanSpeed > 0 ? 'success' : 'default'}
        variant="gauge"
      />
      <MetricCard
        key="batt-power"
        label="电池功率"
        value={fmtPower(batteryPower)}
        accent={batteryPower > 0 ? 'success' : 'default'}
      />
      <MetricCard
        key="motor-power"
        label="电机功率"
        value={fmtPower(motorPower)}
      />
      <MetricCard key="motor-cur" label="电机电流" value={motor ? motor.currentMa : '--'} unit="mA" />
      <MetricCard key="batt-volt" label="电池电压" value={battery ? fmtVoltage(battery.voltageMv) : '--'} />
      <MetricCard
        key="vbus-volt"
        label="VBUS 电压"
        value={powerStatus ? fmtVoltage(powerStatus.vbusVmV) : '--'}
      />
      <MetricCard
        key="motor-volt"
        label="电机电压"
        value={motor && motor.voltageMv > 0 ? fmtVoltage(motor.voltageMv) : '--'}
      />

      <Card key="fan-control" title="风扇控制" subtitle={natureWindOn ? '自然风模式' : '手动模式'} dragHandle>
        <GearRow />
        <Slider
          label="转速"
          value={displaySpeed}
          min={minSpeed}
          max={maxSpeed}
          onChange={(v) => setDragSpeed(v)}
          onCommit={(v) => {
            setDragSpeed(null);
            setFanSpeed(v);
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <Toggle
            checked={natureWindOn}
            onChange={(on) => toggleNatureWind(on)}
            label="自然风"
          />
        </div>
      </Card>

      <Card key="status" title="状态" dragHandle>
        <StatusSummary />
      </Card>

      <Card key="curve" title="自然风曲线" subtitle={curvePoints.length > 0 ? `${curvePoints.length} 点` : '等待数据'} dragHandle>
        {curvePoints.length > 0 ? (
          <CurvePreview points={curvePoints} min={minSpeed} max={maxSpeed} />
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', fontSize: '12px' }}>
            正在读取曲线数据…
          </div>
        )}
      </Card>
    </PageGrid>
  );
}
