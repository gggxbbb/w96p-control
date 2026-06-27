import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { Card } from '../../components/ui/Card';
import { SegBtn } from '../../components/ui/SegBtn';
import { SpeedControl } from '../../components/fan/SpeedControl';
import { TimerPanel } from '../../components/fan/TimerPanel';
import { SleepPanel } from '../../components/fan/SleepPanel';
import { SpeedCalibPanel } from '../../components/fan/SpeedCalibPanel';

export default function Fan() {
  const { setGearDownMode } = useBle();
  const gearDownMode = useDeviceStore((s) => s.gearDownMode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <SpeedControl />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
        <TimerPanel />
        <SleepPanel />
      </div>

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

      <SpeedCalibPanel />
    </div>
  );
}
