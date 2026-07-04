import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useConnectionStore } from '../../stores/connection';
import { getFeatures } from '../../ble/features';
import { Card } from '../../components/ui/Card';
import { PageGrid } from '../../components/ui/PageGrid';
import { DraggableCard } from '../../components/ui/DraggableCard';
import { SegBtn } from '../../components/ui/SegBtn';
import { SpeedControl } from '../../components/fan/SpeedControl';
import { TimerPanel } from '../../components/fan/TimerPanel';
import { SleepPanel } from '../../components/fan/SleepPanel';
import { SpeedCalibPanel } from '../../components/fan/SpeedCalibPanel';
import { TurboPanel } from '../../components/fan/TurboPanel';
import { LightPanel } from '../../components/fan/LightPanel';
import { BleNamePanel } from '../../components/fan/BleNamePanel';
import type { ResponsiveLayouts } from 'react-grid-layout';

const FAN_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'speed-control', x: 0, y: 0, w: 12, h: 8 },
    { i: 'timer', x: 0, y: 8, w: 6, h: 6 },
    { i: 'sleep', x: 6, y: 8, w: 6, h: 6 },
    { i: 'gear-down', x: 0, y: 14, w: 12, h: 3 },
    { i: 'speed-calib', x: 0, y: 17, w: 12, h: 6 },
    { i: 'turbo', x: 0, y: 23, w: 6, h: 6 },
    { i: 'light', x: 6, y: 23, w: 3, h: 6 },
    { i: 'ble-name', x: 9, y: 23, w: 3, h: 6 },
  ],
  md: [
    { i: 'speed-control', x: 0, y: 0, w: 10, h: 8 },
    { i: 'timer', x: 0, y: 8, w: 5, h: 6 },
    { i: 'sleep', x: 5, y: 8, w: 5, h: 6 },
    { i: 'gear-down', x: 0, y: 14, w: 10, h: 3 },
    { i: 'speed-calib', x: 0, y: 17, w: 10, h: 6 },
    { i: 'turbo', x: 0, y: 23, w: 5, h: 6 },
    { i: 'light', x: 5, y: 23, w: 5, h: 3 },
    { i: 'ble-name', x: 5, y: 26, w: 5, h: 3 },
  ],
  sm: [
    { i: 'speed-control', x: 0, y: 0, w: 6, h: 8 },
    { i: 'timer', x: 0, y: 8, w: 6, h: 6 },
    { i: 'sleep', x: 0, y: 14, w: 6, h: 6 },
    { i: 'gear-down', x: 0, y: 20, w: 6, h: 3 },
    { i: 'speed-calib', x: 0, y: 23, w: 6, h: 6 },
    { i: 'turbo', x: 0, y: 29, w: 6, h: 6 },
    { i: 'light', x: 0, y: 35, w: 6, h: 3 },
    { i: 'ble-name', x: 0, y: 38, w: 6, h: 3 },
  ],
  xs: [
    { i: 'speed-control', x: 0, y: 0, w: 2, h: 10 },
    { i: 'timer', x: 0, y: 10, w: 2, h: 7 },
    { i: 'sleep', x: 0, y: 17, w: 2, h: 7 },
    { i: 'gear-down', x: 0, y: 24, w: 2, h: 3 },
    { i: 'speed-calib', x: 0, y: 27, w: 2, h: 6 },
    { i: 'turbo', x: 0, y: 33, w: 2, h: 6 },
    { i: 'light', x: 0, y: 39, w: 2, h: 3 },
    { i: 'ble-name', x: 0, y: 42, w: 2, h: 3 },
  ],
};

export default function Fan() {
  const { setGearDownMode } = useBle();
  const gearDownMode = useDeviceStore((s) => s.gearDownMode);
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const isCompatMode = useConnectionStore((s) => s.isCompatMode);
  const features = getFeatures(firmwareVersion, isCompatMode);

  return (
    <PageGrid pageKey="fan" pageName="风扇" defaultLayouts={FAN_LAYOUTS}>
      <DraggableCard key="speed-control">
        <SpeedControl />
      </DraggableCard>
      <DraggableCard key="timer">
        <TimerPanel />
      </DraggableCard>
      <DraggableCard key="sleep">
        <SleepPanel />
      </DraggableCard>
      <DraggableCard key="gear-down">
        <Card title="减档模式">
          <SegBtn
            options={[
              { value: 0 as const, label: '逐级减档' },
              { value: 1 as const, label: '直接回 0' },
            ]}
            value={gearDownMode}
            onChange={(v) => setGearDownMode(v)}
          />
        </Card>
      </DraggableCard>
      <DraggableCard key="speed-calib">
        <SpeedCalibPanel />
      </DraggableCard>
      {features.has('turbo') && (
        <DraggableCard key="turbo">
          <TurboPanel />
        </DraggableCard>
      )}
      {features.has('lightOff') && (
        <DraggableCard key="light">
          <LightPanel />
        </DraggableCard>
      )}
      {(features.has('bleName') || features.has('bleSn')) && (
        <DraggableCard key="ble-name">
          <BleNamePanel mode={features.has('bleSn') ? 'sn' : 'name'} />
        </DraggableCard>
      )}
    </PageGrid>
  );
}
