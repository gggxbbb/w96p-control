import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { StatusPill } from '../ui/StatusPill';

export function MotorPanel() {
  const { isCompatMode } = useBle();
  const motor = useDeviceStore((s) => s.motor);
  const battery = useDeviceStore((s) => s.battery);

  const motorPower = motor
    ? !isCompatMode
      ? (motor.voltageMv * motor.currentMa) / 1e6
      : battery
        ? (battery.voltageMv * motor.currentMa) / 1e6
        : 0
    : 0;

  return (
    <Card title="电机信息">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <MetricCard label="电机电流" value={motor ? motor.currentMa : '--'} unit="mA" noGauge />
        {!isCompatMode && (
          <>
            <MetricCard label="电机电压" value={motor && motor.voltageMv > 0 ? motor.voltageMv / 1000 : '--'} unit="V" decimals={2} noGauge />
            <MetricCard label="电机功率" value={motorPower} unit="W" decimals={2} noGauge />
          </>
        )}
        {isCompatMode && (
          <MetricCard label="电机功率（近似）" value={motorPower} unit="W" decimals={2} noGauge />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {motor?.block ? <StatusPill status="danger" label="堵转" /> : <StatusPill status="default" label="正常" />}
        </div>
      </div>
      {isCompatMode && (
        <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
          兼容模式下不支持电机电压/堵转解析，功率按电池电压近似计算
        </div>
      )}
    </Card>
  );
}
