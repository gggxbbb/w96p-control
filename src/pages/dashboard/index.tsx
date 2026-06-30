import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { DisconnectedScreen } from '../../components/connection/DisconnectedScreen';
import { Card } from '../../components/ui/Card';
import { PageGrid } from '../../components/ui/PageGrid';
import { MetricCard } from '../../components/ui/MetricCard';
import { DraggableCard } from '../../components/ui/DraggableCard';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { GearRow } from '../../components/fan/GearRow';
import { StatusSummary } from '../../components/dashboard/StatusSummary';
import type { ResponsiveLayouts } from 'react-grid-layout';

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
  ],
};

export default function Dashboard() {
  const { isConnected, profile, setFanSpeed, toggleNatureWind } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const battery = useDeviceStore((s) => s.battery);
  const powerStatus = useDeviceStore((s) => s.powerStatus);
  const motor = useDeviceStore((s) => s.motor);

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

  const displaySpeed = dragSpeed ?? fanSpeed;

  return (
    <PageGrid pageKey="dashboard" pageName="总览" defaultLayouts={DASHBOARD_LAYOUTS}>
      <DraggableCard key="speed">
        <MetricCard
          label="转速"
          value={fanSpeed}
          unit="%"
          accent={fanSpeed > 0 ? 'success' : 'default'}
        />
      </DraggableCard>
      <DraggableCard key="batt-power">
        <MetricCard
          label="电池功率"
          value={batteryPower}
          unit="W"
          accent={batteryPower > 0 ? 'success' : 'default'}
        />
      </DraggableCard>
      <DraggableCard key="motor-power">
        <MetricCard
          label="电机功率"
          value={motorPower}
          unit="W"
        />
      </DraggableCard>
      <DraggableCard key="motor-cur">
        <MetricCard label="电机电流" value={motor ? motor.currentMa : '--'} unit="mA" />
      </DraggableCard>
      <DraggableCard key="batt-volt">
        <MetricCard label="电池电压" value={battery ? battery.voltageMv / 1000 : '--'} unit="V" />
      </DraggableCard>
      <DraggableCard key="vbus-volt">
        <MetricCard
          label="VBUS 电压"
          value={powerStatus ? powerStatus.vbusVmV / 1000 : '--'}
          unit="V"
        />
      </DraggableCard>
      <DraggableCard key="motor-volt">
        <MetricCard
          label="电机电压"
          value={motor && motor.voltageMv > 0 ? motor.voltageMv / 1000 : '--'}
          unit="V"
        />
      </DraggableCard>

      <DraggableCard key="fan-control">
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
      </DraggableCard>

      <DraggableCard key="status">
        <Card title="状态">
          <StatusSummary />
        </Card>
      </DraggableCard>
    </PageGrid>
  );
}
