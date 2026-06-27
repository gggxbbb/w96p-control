import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { StatusPill } from '../ui/StatusPill';
import { fmtVoltage, fmtCurrent, fmtPower } from '../../lib/format';

export function MotorPanel() {
  const { profile } = useBle();
  const motor = useDeviceStore((s) => s.motor);
  const battery = useDeviceStore((s) => s.battery);

  const motorPower = motor
    ? profile?.motorPowerUsesMotorVoltage
      ? (motor.voltageMv * motor.currentMa) / 1e6
      : battery
        ? (battery.voltageMv * motor.currentMa) / 1e6
        : 0
    : 0;

  return (
    <Card title="电机信息">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <MetricCard label="电机电流" value={motor ? fmtCurrent(motor.currentMa) : '--'} />
        {profile?.parseMotorFull && (
          <>
            <MetricCard label="电机电压" value={motor && motor.voltageMv > 0 ? fmtVoltage(motor.voltageMv) : '--'} />
            <MetricCard label="电机功率" value={fmtPower(motorPower)} />
          </>
        )}
        {!profile?.motorPowerUsesMotorVoltage && (
          <MetricCard label="电机功率（近似）" value={fmtPower(motorPower)} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {motor?.block ? <StatusPill status="danger" label="堵转" /> : <StatusPill status="default" label="正常" />}
        </div>
      </div>
      {!profile?.parseMotorFull && (
        <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
          当前 profile 不支持电机电压/堵转解析，功率按电池电压近似计算
        </div>
      )}
    </Card>
  );
}
