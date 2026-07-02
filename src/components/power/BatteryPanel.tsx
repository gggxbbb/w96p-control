import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { voltageToSoc } from '../../utils/battery';

export function BatteryPanel() {
  const { readBatteryCapacity, setBatteryCapacity, writeBatteryClr } = useBle();
  const battery = useDeviceStore((s) => s.battery);
  const show = useToastStore((s) => s.show);
  const [mah, setMah] = useState('5000');
  const [voltage, setVoltage] = useState('3.6');

  const power = battery ? (battery.voltageMv * battery.currentMa) / 1e6 : 0;
  const soc = battery ? voltageToSoc(battery.voltageMv) : null;
  const remainingMwh = (soc != null && battery?.capacityMwh) ? Math.round(battery.capacityMwh * soc / 100) : null;
  const etaMin = (remainingMwh != null && power > 0) ? Math.round(remainingMwh / (power * 1000) * 60) : null;

  const apply = () => {
    const m = parseInt(mah, 10);
    const v = parseFloat(voltage);
    if (isNaN(m) || m < 100 || m > 50000) { show('容量范围 100-50000 mAh'); return; }
    if (isNaN(v) || v < 3 || v > 30) { show('电压范围 3-30 V'); return; }
    setBatteryCapacity(m, v);
    show(`已设置电池容量 ${m}mAh × ${v}V = ${Math.round(m * v)}mWh`);
  };

  const read = async () => {
    try {
      const mwh = await readBatteryCapacity();
      show(`当前电池容量 ${mwh}mWh`);
    } catch { show('读取失败'); }
  };

  return (
    <Card title="电池信息">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        <MetricCard label="电压" value={battery ? battery.voltageMv / 1000 : '--'} unit="V" decimals={2} noGauge />
        <MetricCard label="电流" value={battery ? battery.currentMa : '--'} unit="mA" noGauge />
        <MetricCard label="容量" value={battery ? battery.capacityMwh : '--'} unit="mWh" noGauge />
        <MetricCard label="功率" value={power} unit="W" decimals={2} noGauge />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <MetricCard label="电量(电压估算)" value={soc ?? '--'} unit="%" gaugeMin={0} gaugeMax={100} noGauge />
        <MetricCard label="剩余容量(估算)" value={remainingMwh ?? '--'} unit="mWh" noGauge />
        <MetricCard label="预计续航(估算)" value={etaMin ?? '--'} unit="min" noGauge />
      </div>
      <div style={{ paddingTop: '10px', borderTop: '0.5px solid var(--color-border)' }}>
        <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '8px', lineHeight: '1.6' }}>
          累计充电 {battery ? `${battery.chgMwh} mWh` : '--'} · 累计放电 {battery ? `${battery.dchgMwh} mWh` : '--'}<br />
          充电时间 {battery ? `${battery.chgTimeS} s` : '--'} · 放电时间 {battery ? `${battery.dchgTimeS} s` : '--'}<br />
          剩余估算 {battery ? `${battery.rcapMwh} mWh` : '--'} · 电池温度 {battery ? `${battery.tempC} ℃` : '--'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>容量设置</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="number" min={100} max={50000} value={mah} onChange={(e) => setMah(e.target.value)} style={inputStyle} />
          <span style={unitStyle}>mAh</span>
          <span style={{ color: 'var(--color-text-dim)' }}>×</span>
          <input type="number" min={3} max={30} step={0.1} value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle} />
          <span style={unitStyle}>V</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            = {Math.round((parseInt(mah) || 0) * (parseFloat(voltage) || 0))} mWh
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={apply} style={primaryBtnStyle}>设置容量</button>
          <button onClick={read} style={presetBtnStyle}>读取容量</button>
          <button
            onClick={() => { writeBatteryClr(); show('已清除累计充放电记录'); }}
            style={presetBtnStyle}
          >
            清除统计
          </button>
        </div>
      </div>
    </Card>
  );
}

const inputStyle: React.CSSProperties = {
  width: '70px',
  background: 'var(--color-bg-page)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
};
const unitStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--color-text-muted)' };
const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--color-success)', color: 'var(--color-bg-page)', border: 'none',
  borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 1,
};
const presetBtnStyle: React.CSSProperties = {
  background: 'transparent', color: 'var(--color-text-muted)', border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 1,
};
