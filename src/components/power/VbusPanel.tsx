import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { StatusPill } from '../ui/StatusPill';
import { Toggle } from '../ui/Toggle';
import { fmtVoltage, fmtCurrent, fmtPower } from '../../lib/format';

export function VbusPanel() {
  const { setPowCOut, setPowCIn } = useBle();
  const powerStatus = useDeviceStore((s) => s.powerStatus);
  const battery = useDeviceStore((s) => s.battery);
  const show = useToastStore((s) => s.show);

  const isCharging = powerStatus?.powSta === 1;
  const vbusConnected = powerStatus?.vbusConnected ?? false;
  const vbusPower = powerStatus && battery
    ? (powerStatus.vbusVmV * powerStatus.vbusCurMa) / 1e6
    : 0;

  return (
    <Card title="VBUS / 电源状态">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <MetricCard label="VBUS 电压" value={powerStatus ? fmtVoltage(powerStatus.vbusVmV) : '--'} />
        <MetricCard label="VBUS 电流" value={powerStatus ? fmtCurrent(powerStatus.vbusCurMa) : '--'} />
        <MetricCard label="VBUS 功率" value={fmtPower(vbusPower)} accent={vbusPower > 0 ? 'success' : 'default'} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {vbusConnected
            ? (isCharging ? <StatusPill status="success" label="充电中" /> : <StatusPill status="default" label="放电中" />)
            : <StatusPill status="muted" label="未连接" />}
        </div>
      </div>
      <div style={{ paddingTop: '10px', borderTop: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Toggle
          checked={powerStatus?.powCOut ?? false}
          onChange={(on) => { setPowCOut(on); show(`C 口输出快充已${on ? '使能' : '关闭'}`); }}
          label="C 口输出快充"
        />
        <Toggle
          checked={powerStatus?.powCIn ?? false}
          onChange={(on) => { setPowCIn(on); show(`C 口输入快充已${on ? '使能' : '关闭'}`); }}
          label="C 口输入快充"
        />
      </div>
    </Card>
  );
}
