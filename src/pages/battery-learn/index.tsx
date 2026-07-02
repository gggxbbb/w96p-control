import { useDeviceStore } from '../../stores/device';
import { useBatteryLearnStore, type DeviceLearnData } from '../../stores/batteryLearn';
import { voltageToSoc, SOC_TABLE } from '../../utils/battery';
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

  if (!serialNumber) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>电池学习</h2>
        <div style={{ opacity: 0.4, fontSize: 12, padding: 8 }}>未连接设备</div>
      </div>
    );
  }

  const data: DeviceLearnData | undefined = devices[serialNumber];
  const voltSoc = battery ? voltageToSoc(battery.voltageMv) : null;
  const trackedSoc = data && data.configuredCapacityMwh > 0
    ? Math.round(data.trackedRemainingMwh / data.configuredCapacityMwh * 100)
    : null;
  const deviation = (voltSoc != null && trackedSoc != null) ? trackedSoc - voltSoc : null;

  const handleReset = () => {
    if (confirm('确定重置该设备的学习数据？')) {
      resetDevice(serialNumber);
    }
  };

  const handleEffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0.5 && v <= 1.0) {
      setChargeEfficiency(serialNumber, v);
    }
  };

  const handleExport = () => {
    const json = exportData(serialNumber);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `w96p-battery-learn-${serialNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (op: 'replace' | 'merge') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const fn = op === 'replace' ? importData : mergeImportData;
        const result = fn(serialNumber, reader.result as string);
        if (result.ok) {
          alert(op === 'replace' ? '导入成功' : '合并导入成功');
        } else {
          alert('导入失败: ' + (result.error ?? '未知错误'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>电池学习</h2>

      {/* 设备信息 */}
      <Section label="设备">
        <div style={rowStyle}>
          <KV label="序列号" value={serialNumber} />
          <KV label="容量" value={data ? `${data.configuredCapacityMwh} mWh` : '--'} />
        </div>
        <div style={rowStyle}>
          <KV label="充电效率" value={
            data
              ? <input type="number" min={0.5} max={1.0} step={0.01} value={data.chargeEfficiency}
                  onChange={handleEffChange}
                  style={inputStyle} />
              : '--'
          } />
          <KV label="当前电压" value={battery ? `${(battery.voltageMv / 1000).toFixed(2)}V` : '--'} />
          <KV label="学习容量" value={data ? `${data.trackedRemainingMwh} mWh` : '--'} />
          <KV label="健康度" value={
            data && data.configuredCapacityMwh > 0
              ? `${Math.round(data.trackedRemainingMwh / data.configuredCapacityMwh * 100)}%`
              : '--'
          } accent />
        </div>
      </Section>

      {/* SOC 对比 */}
      <Section label="SOC 跟踪">
        <div style={rowStyle}>
          <KV label="电压估算" value={voltSoc != null ? `${voltSoc}%` : '--'} />
          <KV label="学习跟踪" value={trackedSoc != null ? `${trackedSoc}%` : '--'} accent />
          <KV
            label={data?.calibrated ? '● 已校准' : '○ 未校准'}
            value={deviation != null ? `${deviation > 0 ? '+' : ''}${deviation}%` : '--'}
            accent
          />
          <KV label="可信度" value={<CredibilityBadge serial={serialNumber} />} accent />
        </div>
      </Section>

      {/* 采样统计 */}
      <Section label="采样数据">
        <div style={rowStyle}>
          <KV label="充电采样" value={data ? String(data.currentCharge.length) : '--'} />
          <KV label="放电采样" value={data ? String(data.currentDischarge.length) : '--'} />
          <KV label="已完成循环" value={data ? String(data.completedCycles.length) : '--'} />
        </div>
      </Section>

      {/* 最后一帧 */}
      {data && battery && (
        <Section label="最后一帧">
          <div style={rowStyle}>
            <KV label="电压" value={`${(battery.voltageMv / 1000).toFixed(2)}V`} />
            <KV label="电流" value={`${battery.currentMa} mA`} />
            <KV label="Δ能量" value={`${data.lastDeltaMwh > 0 ? '+' : ''}${Math.round(data.lastDeltaMwh * 1000) / 1000} mWh`} accent />
          </div>
        </Section>
      )}

      {/* 原始数据（可折叠） */}
      {data && <RawDataSection data={data} serial={serialNumber} />}

      {/* 电压→剩余容量散点图 */}
      {data && (data.currentDischarge.length > 0 || data.currentCharge.length > 0) && (
        <Section label="采样曲线 (电压 → 剩余容量)">
          <SampleScatter data={data} capacityMwh={data.configuredCapacityMwh} />
        </Section>
      )}

      {/* 导入/导出/清除 */}
      <div style={{ marginTop: 16, borderTop: '0.5px solid var(--color-border)', paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 8 }}>数据管理</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={actionBtnStyle}>导出</button>
          <button onClick={() => handleImport('replace')} style={actionBtnStyle}>导入</button>
          <button onClick={() => handleImport('merge')} style={actionBtnStyle}>合并导入</button>
          <div style={{ flex: 1 }} />
          <button onClick={handleReset} style={dangerBtnStyle}>清除</button>
        </div>
      </div>
    </div>
  );
}

/* ── 原始数据面板 ── */

function RawDataSection({ data, serial }: { data: DeviceLearnData; serial: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setOpen(true)} style={toggleLinkStyle}>▶ 显示原始数据</button>
      </div>
    );
  }
  const allSamples = [
    ...data.currentCharge.map((s) => ({ ...s, type: '充电' as const })),
    ...data.currentDischarge.map((s) => ({ ...s, type: '放电' as const })),
  ].sort((a, b) => a.ts - b.ts);
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(false)} style={toggleLinkStyle}>▼ 隐藏原始数据</button>
      <div style={{ marginTop: 8, maxHeight: 300, overflow: 'auto', background: 'var(--color-bg-inset)', borderRadius: 6, padding: 10, fontSize: 10, fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', lineHeight: '1.7' }}>
        <div style={{ color: 'var(--color-text-dim)', marginBottom: 6 }}>
          设备: {serial} · 容量: {data.configuredCapacityMwh}mWh · 跟踪剩余: {data.trackedRemainingMwh}mWh · 效率: {data.chargeEfficiency}<br />
          已校准: {String(data.calibrated)} · 循环: {data.cycleCount} · 状态: {data.state} · 上次 tick: {data.lastTickTs ? new Date(data.lastTickTs).toLocaleString() : '--'}<br />
        </div>
        <div style={{ color: 'var(--color-text-dim)', marginBottom: 4 }}>
          已完成循环 {data.completedCycles.length} 个
          {data.completedCycles.map((c, i) => (
            <span key={i}> · #{i + 1}: 充电{c.charge.length}点/放电{c.discharge.length}点</span>
          ))}
        </div>
        {allSamples.length > 0 && (
          <>
            <div style={{ color: 'var(--color-text-dim)', marginBottom: 4 }}>
              当前采样 {allSamples.length} 点 (最新 20):
            </div>
            {allSamples.slice(-20).map((s, i) => (
              <div key={i}>
                <span style={{ color: s.type === '充电' ? 'var(--color-success)' : 'var(--color-accent)' }}>
                  {s.type === '充电' ? '+' : '-'}
                </span>
                {' '}{s.voltageMv}mV → {s.remainingMwh}mWh
                {' '}<span style={{ color: 'var(--color-text-dim)' }}>{new Date(s.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CredibilityBadge({ serial }: { serial: string }) {
  const score = useBatteryLearnStore((s) => s.getCredibility(serial));
  const color = score >= 80 ? 'var(--color-success)'
    : score >= 50 ? 'var(--color-warning)'
    : 'var(--color-danger)';
  return <span style={{ color }}>{score}%</span>;
}

/* ── 简易散点图 ── */
function SampleScatter({ data, capacityMwh }: { data: DeviceLearnData; capacityMwh: number }) {
  const MAX_CYCLES = 5;
  const recentCycles = data.completedCycles.slice(-MAX_CYCLES);
  const allDischarge = [
    ...recentCycles.flatMap((c) => c.discharge),
    ...data.currentDischarge,
  ];
  const allCharge = [
    ...recentCycles.flatMap((c) => c.charge),
    ...data.currentCharge,
  ];

  // 每隔 5 个点显示一个避免太密
  const discharge = allDischarge.filter((_, i) => i % 5 === 0);
  const charge = allCharge.filter((_, i) => i % 5 === 0);

  const width = 500;
  const height = 180;
  const pad = { top: 10, right: 20, bottom: 24, left: 50 };

  // 从实际数据反算范围 + 10% 余量
  const allVolts = [...allDischarge, ...allCharge].map((s) => s.voltageMv);
  const allRmwh = [...allDischarge, ...allCharge].map((s) => s.remainingMwh);
  const dataVMin = allVolts.length > 0 ? Math.min(...allVolts) : 3000;
  const dataVMax = allVolts.length > 0 ? Math.max(...allVolts) : 4200;
  const dataCMin = allRmwh.length > 0 ? Math.min(...allRmwh) : 0;
  const dataCMax = allRmwh.length > 0 ? Math.max(...allRmwh) : capacityMwh;
  const vRange = dataVMax - dataVMin || 1;
  const cRange = dataCMax - dataCMin || 1;
  const vMin = Math.max(2500, dataVMin - vRange * 0.10);
  const vMax = Math.min(4250, dataVMax + vRange * 0.10);
  const cMin = Math.max(0, dataCMin - cRange * 0.10);
  const cMax = Math.min(capacityMwh * 1.05, dataCMax + cRange * 0.10);

  const toX = (vmv: number) => pad.left + ((vmv - vMin) / (vMax - vMin)) * (width - pad.left - pad.right);
  const toY = (rmwh: number) => height - pad.bottom - ((rmwh - cMin) / (cMax - cMin)) * (height - pad.top - pad.bottom);

  const vTicks = [vMin, Math.round((vMin + vMax) / 2), vMax].filter((v, i, a) => a.indexOf(v) === i);
  const cTicks = [cMin, Math.round((cMin + cMax) / 2), cMax].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: width, height: 'auto' }}>
        {/* 网格 */}
        {vTicks.map((v) => (
          <line key={`gv${v}`} x1={toX(v)} y1={pad.top} x2={toX(v)} y2={height - pad.bottom}
            stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="2,2" />
        ))}
        {cTicks.map((c) => (
          <line key={`gc${c}`} x1={pad.left} y1={toY(c)} x2={width - pad.right} y2={toY(c)}
            stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="2,2" />
        ))}
        {/* 轴 */}
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom}
          stroke="var(--color-text-dim)" strokeWidth={0.5} />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom}
          stroke="var(--color-text-dim)" strokeWidth={0.5} />
        {/* X 刻度 */}
        {vTicks.map((v) => (
          <text key={`tv${v}`} x={toX(v)} y={height - 6} textAnchor="middle"
            fill="var(--color-text-dim)" fontSize={8} fontFamily="var(--font-sans)">
            {v / 1000}V
          </text>
        ))}
        {/* Y 刻度 */}
        {cTicks.map((c) => (
          <text key={`tc${c}`} x={pad.left - 4} y={toY(c) + 3} textAnchor="end"
            fill="var(--color-text-dim)" fontSize={8} fontFamily="var(--font-sans)">
            {c >= 1000 ? `${(c / 1000).toFixed(1)}k` : c}
          </text>
        ))}
        {/* 参考曲线：VTC6 电压-容量查表 */}
        {capacityMwh > 0 && (() => {
          const pts = SOC_TABLE.map(([mv, pct]) => `${toX(mv)},${toY(Math.round(capacityMwh * pct / 100))}`).join(' ');
          return <polyline points={pts} fill="none" stroke="var(--color-text-dim)" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />;
        })()}
        {/* 学习曲线：放电采样点按电压排序连线 */}
        {allDischarge.length > 1 && (() => {
          const sorted = [...allDischarge].sort((a, b) => a.voltageMv - b.voltageMv);
          const pts = sorted.map((s) => `${toX(s.voltageMv)},${toY(s.remainingMwh)}`).join(' ');
          return <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} opacity={0.7} />;
        })()}
        {/* 放电点 */}
        {discharge.map((s, i) => (
          <circle key={`d${i}`} cx={toX(s.voltageMv)} cy={toY(s.remainingMwh)} r={2}
            fill="var(--color-accent)" opacity={0.6} />
        ))}
        {/* 充电点 */}
        {charge.map((s, i) => (
          <circle key={`c${i}`} cx={toX(s.voltageMv)} cy={toY(s.remainingMwh)} r={2}
            fill="var(--color-success)" opacity={0.6} />
        ))}
      </svg>
    </div>
  );
}

/* ── 子组件 ── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 6, letterSpacing: '0.05em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{
        fontSize: 12,
        fontWeight: accent ? 600 : undefined,
        color: accent ? 'var(--color-accent)' : 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}

/* ── 样式 ── */

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-inset)',
  border: '0.5px solid var(--color-border)',
  borderRadius: 3,
  color: 'var(--color-text)',
  padding: '2px 4px',
  fontSize: 11,
  width: 56,
  fontFamily: 'var(--font-sans)',
  fontVariantNumeric: 'tabular-nums',
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: 4,
  color: 'var(--color-text-muted)',
  padding: '4px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--color-danger)',
  borderRadius: 4,
  color: 'var(--color-danger)',
  padding: '4px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const toggleLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-dim)',
  fontSize: 10,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  padding: 0,
};
