import { useDeviceStore } from '../../stores/device';
import { fmtTimer, fmtShutdown } from '../../lib/format';

interface SummaryItem {
  label: string;
  value: string;
  accent?: string;
}

export function StatusSummary() {
  const timerRemainingSec = useDeviceStore((s) => s.timerRemainingSec);
  const shutdownDelaySec = useDeviceStore((s) => s.shutdownDelaySec);
  const gearDownMode = useDeviceStore((s) => s.gearDownMode);
  const powerStatus = useDeviceStore((s) => s.powerStatus);
  const motor = useDeviceStore((s) => s.motor);
  const serialNumber = useDeviceStore((s) => s.serialNumber);
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);

  const isCharging = powerStatus?.powSta === 1;
  const vbusConnected = powerStatus?.vbusConnected ?? false;
  const isStalled = motor?.block === true;

  const items: SummaryItem[] = [
    {
      label: '序列号',
      value: serialNumber ?? '--',
      accent: serialNumber ? undefined : 'var(--color-text-muted)',
    },
    {
      label: '固件',
      value: firmwareVersion ? `v${firmwareVersion}` : '--',
      accent: firmwareVersion ? undefined : 'var(--color-text-muted)',
    },
    {
      label: '定时',
      value: fmtTimer(timerRemainingSec),
      accent: timerRemainingSec > 0 ? 'var(--color-success)' : 'var(--color-text-muted)',
    },
    { label: '休眠', value: fmtShutdown(shutdownDelaySec) },
    { label: '减档', value: gearDownMode === 0 ? '逐级' : '直接' },
    {
      label: '充电',
      value: vbusConnected ? (isCharging ? '充电中' : '放电中') : '未连接',
      accent: isCharging ? 'var(--color-success)' : 'var(--color-text-muted)',
    },
    {
      label: '堵转',
      value: isStalled ? '堵转' : '正常',
      accent: isStalled ? 'var(--color-danger)' : 'var(--color-text-muted)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{item.label}</span>
          <span
            style={{
              fontSize: '11px',
              color: item.accent || 'var(--color-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
