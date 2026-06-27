import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { Card } from '../../components/ui/Card';
import { DashboardGrid } from '../../components/ui/DashboardGrid';
import { SegBtn } from '../../components/ui/SegBtn';
import { SpeedControl } from '../../components/fan/SpeedControl';
import { TimerPanel } from '../../components/fan/TimerPanel';
import { SleepPanel } from '../../components/fan/SleepPanel';
import { SpeedCalibPanel } from '../../components/fan/SpeedCalibPanel';
import type { ResponsiveLayouts } from 'react-grid-layout';

const FAN_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'speed-control', x: 0, y: 0, w: 12, h: 8 },
    { i: 'timer', x: 0, y: 8, w: 6, h: 5 },
    { i: 'sleep', x: 6, y: 8, w: 6, h: 5 },
    { i: 'gear-down', x: 0, y: 13, w: 12, h: 3 },
    { i: 'speed-calib', x: 0, y: 16, w: 12, h: 6 },
  ],
  md: [
    { i: 'speed-control', x: 0, y: 0, w: 10, h: 8 },
    { i: 'timer', x: 0, y: 8, w: 5, h: 5 },
    { i: 'sleep', x: 5, y: 8, w: 5, h: 5 },
    { i: 'gear-down', x: 0, y: 13, w: 10, h: 3 },
    { i: 'speed-calib', x: 0, y: 16, w: 10, h: 6 },
  ],
  sm: [
    { i: 'speed-control', x: 0, y: 0, w: 6, h: 8 },
    { i: 'timer', x: 0, y: 8, w: 6, h: 5 },
    { i: 'sleep', x: 0, y: 13, w: 6, h: 5 },
    { i: 'gear-down', x: 0, y: 18, w: 6, h: 3 },
    { i: 'speed-calib', x: 0, y: 21, w: 6, h: 6 },
  ],
  xs: [
    { i: 'speed-control', x: 0, y: 0, w: 2, h: 10 },
    { i: 'timer', x: 0, y: 10, w: 2, h: 6 },
    { i: 'sleep', x: 0, y: 16, w: 2, h: 6 },
    { i: 'gear-down', x: 0, y: 22, w: 2, h: 3 },
    { i: 'speed-calib', x: 0, y: 25, w: 2, h: 6 },
  ],
};

export default function Fan() {
  const { setGearDownMode } = useBle();
  const gearDownMode = useDeviceStore((s) => s.gearDownMode);

  return (
    <DashboardGrid pageKey="fan" defaultLayouts={FAN_LAYOUTS}>
      <SpeedControl key="speed-control" dragHandle />
      <TimerPanel key="timer" dragHandle />
      <SleepPanel key="sleep" dragHandle />
      <Card key="gear-down" title="减档模式" dragHandle>
        <SegBtn
          options={[
            { value: 0 as const, label: '逐级减档' },
            { value: 1 as const, label: '直接回 0' },
          ]}
          value={gearDownMode}
          onChange={(v) => setGearDownMode(v)}
        />
      </Card>
      <SpeedCalibPanel key="speed-calib" dragHandle />
    </DashboardGrid>
  );
}
