import { useDeviceStore } from '../../stores/device';
import {
  useBatteryLearnStore,
  buildCumulativeCurve,
  type DeviceLearnData,
} from '../../stores/batteryLearn';
import { SOC_TABLE } from '../../utils/battery';
import { useState } from 'react';

export default function BatteryLearnPage() {
  const battery = useDeviceStore((s) => s.battery);
  const serialNumber = useDeviceStore((s) => s.serialNumber);
  const devices = useBatteryLearnStore((s) => s.devices);
  const resetDevice = useBatteryLearnStore((s) => s.resetDevice);
  const setChargeEfficiency = useBatteryLearnStore((s) => s.setChargeEfficiency);
  const exportData = useBatteryLearnStore((s) => s.exportData);
  const importData = useBatteryLearnStore((s) => s.importData);
  const mergeImportData = useBatteryLearnStore((s) => s.mergeImportData);
  const getRemainingMwh = useBatteryLearnStore((s) => s.getRemainingMwh);

  if (!serialNumber) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>电池学习</h2>
        <div style={{ opacity: 0.4, fontSize: 12, padding: 8 }}>未连接设备</div>
      </div>
    );
  }

  const data: DeviceLearnData | undefined = devices[serialNumber];
  const capacityMwh = data?.configuredCapacityMwh ?? 18000;
  const transitions = data?.dischargeTransitions ?? [];
  const voltSoc = battery ? voltageToSoc(battery.voltageMv) : null;

  const learnedSoc = data && battery
    ? (() => { const mwh = getRemainingMwh(serialNumber, battery.voltageMv); return mwh != null ? Math.round(mwh / capacityMwh * 100) : null; })()
    : null;

  const allMv = transitions.flatMap((t) => [t.fromMv, t.toMv]);
  const coverage = allMv.length > 0
    ? Math.round((Math.max(...allMv) - Math.min(...allMv)) / 12)
    : 0;

  const handleReset = () => { if (confirm('确定重置？')) resetDevice(serialNumber); };
  const handleEffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0.5 && v <= 1.0) setChargeEfficiency(serialNumber, v);
  };
  const handleExport = () => {
    const json = exportData(serialNumber);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `w96p-battery-${serialNumber}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (op: 'replace' | 'merge') => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        const fn = op === 'replace' ? importData : mergeImportData;
        const res = fn(serialNumber, r.result as string);
        alert(res.ok ? (op === 'replace' ? '导入成功' : '合并导入成功') : '失败: ' + (res.error ?? '?'));
      };
      r.readAsText(file);
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>电池学习</h2>
      <Section label="设备">
        <div style={row}>
          <KV label="序列号" value={serialNumber} />
          <KV label="容量" value={data ? `${data.configuredCapacityMwh} mWh` : '--'} />
        </div>
        <div style={row}>
          <KV label="充电效率" value={data ? <input type="number" min={0.5} max={1} step={0.01} value={data.chargeEfficiency} onChange={handleEffChange} style={inp} /> : '--'} />
          <KV label="当前电压" value={battery ? `${(battery.voltageMv / 1000).toFixed(2)}V` : '--'} />
          <KV label="学习容量" value={data ? `${Math.round(data.learnedCapacityMwh)} mWh` : '--'} />
          <KV label="健康度" value={data && data.configuredCapacityMwh > 0 ? `${Math.round(coverage >= 80 ? data.learnedCapacityMwh / data.configuredCapacityMwh * 100 : 100)}%` : '--'} accent />
        </div>
      </Section>
      <Section label="SOC 跟踪">
        <div style={row}>
          <KV label="电压估算" value={voltSoc != null ? `${voltSoc}%` : '--'} />
          <KV label="学习跟踪" value={learnedSoc != null ? `${learnedSoc}%` : '--'} accent />
          <KV label="数据覆盖" value={coverage > 0 ? `${coverage}%` : '--'} accent />
          <KV label="可信度" value={<CredibilityBadge serial={serialNumber} />} accent />
        </div>
      </Section>
      <Section label="转移记录">
        <div style={row}>
          <KV label="放电转移" value={String(transitions.length)} />
          <KV label="满充次数" value={data ? String(data.cycleCount) : '--'} />
        </div>
      </Section>
      {data && battery && (
        <Section label="最后一帧">
          <div style={row}>
            <KV label="电压" value={`${(battery.voltageMv / 1000).toFixed(2)}V`} />
            <KV label="电流" value={`${battery.currentMa} mA`} />
            <KV label="Δ能量" value={`${data.lastDeltaMwh > 0 ? '+' : ''}${Math.round(data.lastDeltaMwh * 1000) / 1000} mWh`} accent />
          </div>
        </Section>
      )}
      {data && transitions.length > 0 && (
        <Section label="累积曲线 (电压 → 累计消耗)">
          <CurveChart data={data} />
        </Section>
      )}
      {data && transitions.length > 0 && <TransitionTable data={data} />}
      <div style={{ marginTop: 16, borderTop: '0.5px solid var(--color-border)', paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 8 }}>数据管理</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={abtn}>导出</button>
          <button onClick={() => handleImport('replace')} style={abtn}>导入</button>
          <button onClick={() => handleImport('merge')} style={abtn}>合并导入</button>
          <div style={{ flex: 1 }} />
          <button onClick={handleReset} style={dbtn}>清除</button>
        </div>
      </div>
    </div>
  );
}

function voltageToSoc(mv: number): number {
  for (let i = 0; i < SOC_TABLE.length - 1; i++) {
    const [vHi, sHi] = SOC_TABLE[i]!;
    const [vLo, sLo] = SOC_TABLE[i + 1]!;
    if (mv <= vHi && mv >= vLo) return Math.round(sLo + ((mv - vLo) / (vHi - vLo)) * (sHi - sLo));
  }
  return mv > SOC_TABLE[0]![0] ? SOC_TABLE[0]![1] : SOC_TABLE[SOC_TABLE.length - 1]![1]!;
}

function CurveChart({ data }: { data: DeviceLearnData }) {
  const cap = data.configuredCapacityMwh;
  const curve = buildCumulativeCurve(data.dischargeTransitions, cap);
  if (curve.length < 2) return null;
  const W = 560, H = 200, l = 55, r = 20, t = 10, b = 24;
  const vMin = curve[0]!.voltageMv, vMax = curve[curve.length - 1]!.voltageMv;
  const cMax = curve[curve.length - 1]!.remainingMwh;
  const tx = (mv: number) => l + ((mv - vMin) / (vMax - vMin)) * (W - l - r);
  const ty = (mwh: number) => H - b - (mwh / cMax) * (H - t - b);

  const refPts: string[] = [];
  let rc = 0;
  const asc = [...SOC_TABLE].reverse();
  for (let i = 0; i < asc.length - 1; i++) {
    const [vLo] = asc[i]!;
    const [vHi, sHi] = asc[i + 1]!;
    for (let mv = vLo; mv < vHi; mv++) {
      rc += ((sHi - asc[i]![1]) / 100 * cap) / (vHi - vLo);
      refPts.push(`${tx(mv + 1)},${ty(rc)}`);
    }
  }
  const dp = curve.map((p) => `${tx(p.voltageMv)},${ty(p.remainingMwh)}`).join(' ');
  const vTks = [vMin, Math.round((vMin + vMax) / 2), vMax];
  const cTks = [0, Math.round(cMax / 2), Math.round(cMax)];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
        {vTks.map((v) => <line key={`gv${v}`} x1={tx(v)} y1={t} x2={tx(v)} y2={H - b} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="2,2" />)}
        {cTks.map((c) => <line key={`gc${c}`} x1={l} y1={ty(c)} x2={W - r} y2={ty(c)} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="2,2" />)}
        <line x1={l} y1={H - b} x2={W - r} y2={H - b} stroke="var(--color-text-dim)" strokeWidth={0.5} />
        <line x1={l} y1={t} x2={l} y2={H - b} stroke="var(--color-text-dim)" strokeWidth={0.5} />
        {vTks.map((v) => <text key={`tv${v}`} x={tx(v)} y={H - 6} textAnchor="middle" fill="var(--color-text-dim)" fontSize={8}>{v / 1000}V</text>)}
        {cTks.map((c) => <text key={`tc${c}`} x={l - 4} y={ty(c) + 3} textAnchor="end" fill="var(--color-text-dim)" fontSize={8}>{c >= 1000 ? `${(c / 1000).toFixed(1)}k` : c}</text>)}
        <polyline points={refPts.join(' ')} fill="none" stroke="var(--color-text-dim)" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
        <polyline points={dp} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} opacity={0.8} />
        {curve.filter((_, i) => i % 50 === 0).map((p, i) => (
          <circle key={i} cx={tx(p.voltageMv)} cy={ty(p.remainingMwh)} r={p.fromData ? 2 : 1} fill={p.fromData ? 'var(--color-accent)' : 'var(--color-text-dim)'} opacity={p.fromData ? 0.7 : 0.3} />
        ))}
      </svg>
    </div>
  );
}

function TransitionTable({ data }: { data: DeviceLearnData }) {
  const [open, setOpen] = useState(false);
  if (!open) return <div style={{ marginBottom: 12 }}><button onClick={() => setOpen(true)} style={tgl}>▶ 显示转移记录</button></div>;
  const ts = data.dischargeTransitions ?? [];
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(false)} style={tgl}>▼ 隐藏转移记录</button>
      <div style={{ marginTop: 8, maxHeight: 300, overflow: 'auto', background: 'var(--color-bg-inset)', borderRadius: 6, padding: 10, fontSize: 10, fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.7 }}>
        <div style={{ color: 'var(--color-text-dim)', marginBottom: 6 }}>{ts.length} 条放电转移 · 学习容量: {Math.round(data.learnedCapacityMwh)}mWh · 效率: {data.chargeEfficiency}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ opacity: 0.5, textAlign: 'left' }}><th style={{ padding: '2px 6px' }}>from</th><th style={{ padding: '2px 6px' }}>to</th><th style={{ padding: '2px 6px' }}>ΔmV</th><th style={{ padding: '2px 6px' }}>mWh</th><th style={{ padding: '2px 6px' }}>mWh/mV</th></tr></thead>
          <tbody>{ts.map((e, i) => (
            <tr key={i} style={{ borderTop: '0.5px solid var(--color-border)' }}>
              <td style={{ padding: '2px 6px' }}>{e.fromMv}</td>
              <td style={{ padding: '2px 6px' }}>{e.toMv}</td>
              <td style={{ padding: '2px 6px' }}>{Math.abs(e.toMv - e.fromMv)}</td>
              <td style={{ padding: '2px 6px' }}>{Math.round(e.mwh * 1000) / 1000}</td>
              <td style={{ padding: '2px 6px', opacity: 0.7 }}>{Math.round(e.mwh / Math.abs(e.toMv - e.fromMv) * 1000) / 1000}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function CredibilityBadge({ serial }: { serial: string }) {
  const score = useBatteryLearnStore((s) => s.getCredibility(serial));
  const c = score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
  return <span style={{ color: c }}>{score}%</span>;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</div>{children}</div>;
}

function KV({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</div><div style={{ fontSize: 12, fontWeight: accent ? 600 : undefined, color: accent ? 'var(--color-accent)' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div></div>;
}

const row: React.CSSProperties = { display: 'flex', gap: 12 };
const inp: React.CSSProperties = { background: 'var(--color-bg-inset)', border: '0.5px solid var(--color-border)', borderRadius: 3, color: 'var(--color-text)', padding: '2px 4px', fontSize: 11, width: 56, fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' };
const abtn: React.CSSProperties = { background: 'transparent', border: '0.5px solid var(--color-border-strong)', borderRadius: 4, color: 'var(--color-text-muted)', padding: '4px 10px', fontSize: 11, fontFamily: 'var(--font-sans)', cursor: 'pointer' };
const dbtn: React.CSSProperties = { background: 'transparent', border: '0.5px solid var(--color-danger)', borderRadius: 4, color: 'var(--color-danger)', padding: '4px 10px', fontSize: 11, fontFamily: 'var(--font-sans)', cursor: 'pointer' };
const tgl: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--color-text-dim)', fontSize: 10, fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: 0 };
