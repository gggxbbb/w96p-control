import { motion } from 'framer-motion';
import { GlassCard } from '../../components/ui/GlassCard';
import { RingGauge } from '../../components/ui/RingGauge';
import { useDeviceStore } from '../../stores/device';

export default function PowerPage() {
  const battery = useDeviceStore((s) => s.battery);
  const motor = useDeviceStore((s) => s.motor);
  const powerStatus = useDeviceStore((s) => s.powerStatus);

  const isCharging = battery ? battery.currentMa > 0 : false;
  const battVolt = battery ? battery.voltageMv : null;
  const battCurr = battery ? battery.currentMa : null;
  const battPower =
    battery ? Math.round((battery.voltageMv * Math.abs(battery.currentMa)) / 1000) : null;
  const motorCurr = motor ? motor.currentMa : null;
  const motorVolt = motor ? motor.voltageMv : null;
  const motorPower =
    motor ? Math.round((motor.voltageMv * motor.currentMa) / 1000) : null;
  const coreTemp = powerStatus ? powerStatus.powC : null;

  // 用电池电压估算电量百分比（3.0V = 0%, 4.2V = 100%）
  const battPct = battVolt
    ? Math.round(
        Math.max(0, Math.min(100, ((battVolt / 1000 - 3.0) / 1.2) * 100)),
      )
    : 0;

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '40px 24px 100px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <RingGauge
          value={battPct}
          max={100}
          label={battVolt != null ? `${battPct}%` : '--'}
          subtitle={isCharging ? '充电中' : '电池'}
          colorStart={
            isCharging
              ? 'var(--color-success)'
              : 'var(--color-accent-start)'
          }
          colorEnd={
            isCharging
              ? 'var(--color-success)'
              : 'var(--color-accent-end)'
          }
          size={200}
        />
      </motion.div>

      {/* 电池详情 */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 16,
          }}
        >
          电池详情
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <FillBar
            label="电压"
            value={battVolt}
            unit="mV"
            max={4200}
            color="var(--color-accent-start)"
            format={(v) => (v ? (v / 1000).toFixed(2) + 'V' : '--')}
          />
          <FillBar
            label="电流"
            value={battCurr ? Math.abs(battCurr) : null}
            unit="mA"
            max={3000}
            color="var(--color-accent-end)"
            format={(v) => (v != null ? `${v}mA` : '--')}
          />
          <FillBar
            label="功率"
            value={battPower}
            unit="W"
            max={15}
            color="var(--color-success)"
          />
        </div>
      </GlassCard>

      {/* 电机与芯片 */}
      <GlassCard>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 16,
          }}
        >
          电机与芯片
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <FillBar
            label="电机电流"
            value={motorCurr}
            unit="mA"
            max={5000}
            color="var(--color-warning)"
          />
          <FillBar
            label="电机电压"
            value={motorVolt}
            unit="mV"
            max={12000}
            color="var(--color-warning)"
            format={(v) => (v ? (v / 1000).toFixed(1) + 'V' : '--')}
          />
          <FillBar
            label="电机功率"
            value={motorPower}
            unit="W"
            max={60}
            color="var(--color-danger)"
          />
          <FillBar
            label="芯片温度"
            value={coreTemp}
            unit="°C"
            max={80}
            color="var(--color-danger)"
            dangerThreshold={60}
          />
        </div>
      </GlassCard>
    </div>
  );
}

function FillBar({
  label,
  value,
  unit,
  max,
  color,
  dangerThreshold,
  format,
}: {
  label: string;
  value: number | null;
  unit: string;
  max: number;
  color: string;
  dangerThreshold?: number;
  format?: (v: number | null) => string;
}) {
  const pct = value != null ? Math.min(value / max, 1) : 0;
  const isDanger =
    dangerThreshold != null && value != null && value >= dangerThreshold;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        <span
          style={{
            color: isDanger ? 'var(--color-danger)' : 'var(--color-text)',
            fontWeight: 500,
          }}
        >
          {format ? format(value) : value != null ? `${value} ${unit}` : '--'}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 2,
            background: isDanger ? 'var(--color-danger)' : color,
          }}
        />
      </div>
    </div>
  );
}
