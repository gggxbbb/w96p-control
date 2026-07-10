import { useDeviceStore } from '../../stores/device';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';

export function PowerInfoCard() {
  const powerConfig = useDeviceStore((s) => s.powerConfig);
  const battery = useDeviceStore((s) => s.battery);

  const power = battery ? (battery.voltageMv * battery.currentMa) / 1e6 : 0;
  const remainingMwh = (powerConfig && battery?.capacityMwh)
    ? Math.round(battery.capacityMwh * powerConfig.powLevel / 100)
    : null;
  const etaMin = (remainingMwh != null && power > 0)
    ? Math.round(remainingMwh / (power * 1000) * 60)
    : null;

  return (
    <Card title="芯片状态">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        <MetricCard
          label="电量 (powLevel)"
          value={powerConfig ? powerConfig.powLevel : '--'}
          unit="%"
          range={{ min: 0, max: 100, dangerLow: true }}
          persistKey="power-info-电量"
          noGauge
        />
        <MetricCard
          label="芯片温度 (powCoreTemp)"
          value={powerConfig ? powerConfig.powCoreTemp : '--'}
          unit="℃"
          range={{ min: 0, max: 120 }}
          persistKey="power-info-芯片温度"
          noGauge
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        <MetricCard
          label="剩余容量(芯片)"
          value={remainingMwh ?? '--'}
          unit="mWh"
        />
        <MetricCard
          label="预计续航(芯片)"
          value={etaMin ?? '--'}
          unit="min"
        />
      </div>
    </Card>
  );
}
