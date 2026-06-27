import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { DisconnectedScreen } from '../../components/connection/DisconnectedScreen';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { GearRow } from '../../components/fan/GearRow';
import { StatusSummary } from '../../components/dashboard/StatusSummary';
import { fmtVoltage, fmtPower } from '../../lib/format';

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
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '60px', display: 'block' }}
      >
        <defs>
          <pattern id="grid" width="20" height="16" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 16" fill="none" stroke="var(--color-bg-page)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#grid)" />
        <polyline
          points={coords}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '4px',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>最小 {minVal}</span>
        <span>最大 {maxVal}</span>
        <span>平均 {avg.toFixed(1)}</span>
      </div>
    </div>
  );
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 概览派生指标 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
        }}
      >
        <MetricCard
          label="转速"
          value={fanSpeed}
          unit="%"
          accent={fanSpeed > 0 ? 'success' : 'default'}
        />
        <MetricCard
          label="电池功率"
          value={fmtPower(batteryPower)}
          accent={batteryPower > 0 ? 'success' : 'default'}
        />
        <MetricCard
          label="电机功率"
          value={fmtPower(motorPower)}
          accent={motorPower > 0 ? 'default' : 'default'}
        />
        <MetricCard label="电机电流" value={motor ? motor.currentMa : '--'} unit="mA" />
        <MetricCard label="电池电压" value={battery ? fmtVoltage(battery.voltageMv) : '--'} />
        <MetricCard
          label="VBUS 电压"
          value={powerStatus ? fmtVoltage(powerStatus.vbusVmV) : '--'}
        />
        <MetricCard
          label="电机电压"
          value={motor && motor.voltageMv > 0 ? fmtVoltage(motor.voltageMv) : '--'}
        />
      </div>

      {/* 风扇控制 + 状态 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '10px',
        }}
      >
        <Card title="风扇控制" subtitle={natureWindOn ? '自然风模式' : '手动模式'}>
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

        <Card title="状态">
          <StatusSummary />
        </Card>
      </div>

      {/* 自然风曲线预览 */}
      {curvePoints.length > 0 && (
        <Card title="自然风曲线" subtitle={`${curvePoints.length} 点`}>
          <CurvePreview points={curvePoints} min={minSpeed} max={maxSpeed} />
        </Card>
      )}
    </div>
  );
}
