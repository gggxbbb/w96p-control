import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { useSettingsStore, DASHBOARD_CARD_KEYS, DASHBOARD_CARD_LABELS, DASHBOARD_CARD_DEFAULTS, type DashboardCardKey } from '../../stores/settings';
import { DisconnectedScreen } from '../../components/connection/DisconnectedScreen';
import { Card } from '../../components/ui/Card';
import { PageGrid } from '../../components/ui/PageGrid';
import { MetricCard } from '../../components/ui/MetricCard';
import { DraggableCard } from '../../components/ui/DraggableCard';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { GearRow } from '../../components/fan/GearRow';
import { StatusSummary } from '../../components/dashboard/StatusSummary';
import { voltageToSoc } from '../../utils/battery';
import type { ResponsiveLayouts } from 'react-grid-layout';

const DASHBOARD_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'fan-gear', x: 0, y: 0, w: 3, h: 2 },
    { i: 'fan-speed', x: 3, y: 0, w: 3, h: 2 },
    { i: 'fan-timer', x: 6, y: 0, w: 3, h: 2 },
    { i: 'batt-power', x: 9, y: 0, w: 3, h: 2 },
    { i: 'motor-power', x: 0, y: 2, w: 3, h: 2 },
    { i: 'motor-cur', x: 3, y: 2, w: 3, h: 2 },
    { i: 'batt-volt', x: 6, y: 2, w: 3, h: 2 },
    { i: 'vbus-volt', x: 9, y: 2, w: 3, h: 2 },
    { i: 'motor-volt', x: 0, y: 4, w: 3, h: 2 },
    { i: 'batt-cur', x: 3, y: 4, w: 3, h: 2 },
    { i: 'batt-cap', x: 6, y: 4, w: 3, h: 2 },
    { i: 'vbus-cur', x: 9, y: 4, w: 3, h: 2 },
    { i: 'vbus-power', x: 0, y: 6, w: 3, h: 2 },
    { i: 'pow-core-temp', x: 3, y: 6, w: 3, h: 2 },
    { i: 'pow-level', x: 6, y: 6, w: 3, h: 2 },
    { i: 'batt-est-pct', x: 9, y: 6, w: 3, h: 2 },
    { i: 'batt-est-rem', x: 0, y: 8, w: 3, h: 2 },
    { i: 'batt-est-eta', x: 3, y: 8, w: 3, h: 2 },
    { i: 'turbo-countdown', x: 6, y: 8, w: 3, h: 2 },
    { i: 'fan-control', x: 0, y: 10, w: 8, h: 6 },
    { i: 'status', x: 8, y: 10, w: 4, h: 6 },
  ],
  md: [
    { i: 'fan-gear', x: 0, y: 0, w: 3, h: 2 },
    { i: 'fan-speed', x: 3, y: 0, w: 4, h: 2 },
    { i: 'fan-timer', x: 7, y: 0, w: 3, h: 2 },
    { i: 'batt-power', x: 0, y: 2, w: 5, h: 2 },
    { i: 'motor-power', x: 5, y: 2, w: 5, h: 2 },
    { i: 'motor-cur', x: 0, y: 4, w: 5, h: 2 },
    { i: 'batt-volt', x: 5, y: 4, w: 5, h: 2 },
    { i: 'vbus-volt', x: 0, y: 6, w: 5, h: 2 },
    { i: 'motor-volt', x: 5, y: 6, w: 5, h: 2 },
    { i: 'batt-cur', x: 0, y: 8, w: 5, h: 2 },
    { i: 'batt-cap', x: 5, y: 8, w: 5, h: 2 },
    { i: 'vbus-cur', x: 0, y: 10, w: 5, h: 2 },
    { i: 'vbus-power', x: 5, y: 10, w: 5, h: 2 },
    { i: 'pow-core-temp', x: 0, y: 12, w: 5, h: 2 },
    { i: 'pow-level', x: 5, y: 12, w: 5, h: 2 },
    { i: 'batt-est-pct', x: 0, y: 14, w: 5, h: 2 },
    { i: 'batt-est-rem', x: 5, y: 14, w: 5, h: 2 },
    { i: 'batt-est-eta', x: 0, y: 16, w: 5, h: 2 },
    { i: 'turbo-countdown', x: 5, y: 16, w: 5, h: 2 },
    { i: 'fan-control', x: 0, y: 18, w: 10, h: 6 },
    { i: 'status', x: 0, y: 24, w: 10, h: 6 },
  ],
  sm: [
    { i: 'fan-gear', x: 0, y: 0, w: 3, h: 2 },
    { i: 'fan-speed', x: 3, y: 0, w: 3, h: 2 },
    { i: 'fan-timer', x: 0, y: 2, w: 3, h: 2 },
    { i: 'batt-power', x: 3, y: 2, w: 3, h: 2 },
    { i: 'motor-power', x: 0, y: 4, w: 3, h: 2 },
    { i: 'motor-cur', x: 3, y: 4, w: 3, h: 2 },
    { i: 'batt-volt', x: 0, y: 6, w: 3, h: 2 },
    { i: 'vbus-volt', x: 3, y: 6, w: 3, h: 2 },
    { i: 'motor-volt', x: 0, y: 8, w: 3, h: 2 },
    { i: 'batt-cur', x: 3, y: 8, w: 3, h: 2 },
    { i: 'batt-cap', x: 0, y: 10, w: 3, h: 2 },
    { i: 'vbus-cur', x: 3, y: 10, w: 3, h: 2 },
    { i: 'vbus-power', x: 0, y: 12, w: 3, h: 2 },
    { i: 'pow-core-temp', x: 3, y: 12, w: 3, h: 2 },
    { i: 'pow-level', x: 0, y: 14, w: 3, h: 2 },
    { i: 'batt-est-pct', x: 3, y: 14, w: 3, h: 2 },
    { i: 'batt-est-rem', x: 0, y: 16, w: 3, h: 2 },
    { i: 'batt-est-eta', x: 3, y: 16, w: 3, h: 2 },
    { i: 'turbo-countdown', x: 0, y: 18, w: 3, h: 2 },
    { i: 'fan-control', x: 0, y: 20, w: 6, h: 6 },
    { i: 'status', x: 0, y: 26, w: 6, h: 6 },
  ],
  xs: [
    { i: 'fan-gear', x: 0, y: 0, w: 2, h: 2 },
    { i: 'fan-speed', x: 0, y: 2, w: 2, h: 2 },
    { i: 'fan-timer', x: 0, y: 4, w: 2, h: 2 },
    { i: 'batt-power', x: 0, y: 6, w: 2, h: 2 },
    { i: 'motor-power', x: 0, y: 8, w: 2, h: 2 },
    { i: 'motor-cur', x: 0, y: 10, w: 2, h: 2 },
    { i: 'batt-volt', x: 0, y: 12, w: 2, h: 2 },
    { i: 'vbus-volt', x: 0, y: 14, w: 2, h: 2 },
    { i: 'motor-volt', x: 0, y: 16, w: 2, h: 2 },
    { i: 'batt-cur', x: 0, y: 18, w: 2, h: 2 },
    { i: 'batt-cap', x: 0, y: 20, w: 2, h: 2 },
    { i: 'vbus-cur', x: 0, y: 22, w: 2, h: 2 },
    { i: 'vbus-power', x: 0, y: 24, w: 2, h: 2 },
    { i: 'pow-core-temp', x: 0, y: 26, w: 2, h: 2 },
    { i: 'pow-level', x: 0, y: 28, w: 2, h: 2 },
    { i: 'batt-est-pct', x: 2, y: 28, w: 2, h: 2 },
    { i: 'batt-est-rem', x: 0, y: 30, w: 2, h: 2 },
    { i: 'batt-est-eta', x: 2, y: 30, w: 2, h: 2 },
    { i: 'turbo-countdown', x: 0, y: 32, w: 2, h: 2 },
    { i: 'fan-control', x: 0, y: 34, w: 2, h: 6 },
    { i: 'status', x: 0, y: 40, w: 2, h: 6 },
  ],
};

export default function Dashboard() {
  const { isConnected, isCompatMode, setFanSpeed, toggleNatureWind } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const battery = useDeviceStore((s) => s.battery);
  const powerStatus = useDeviceStore((s) => s.powerStatus);
  const motor = useDeviceStore((s) => s.motor);
  const powerConfig = useDeviceStore((s) => s.powerConfig);
  const timerRemainingSec = useDeviceStore((s) => s.timerRemainingSec);
  const turboCountdownSec = useDeviceStore((s) => s.turboCountdownSec);
  const dashboardCards = useSettingsStore((s) => s.dashboardCards);
  const setDashboardCards = useSettingsStore((s) => s.setDashboardCards);
  const show = useToastStore((s) => s.show);

  const [dragSpeed, setDragSpeed] = useState<number | null>(null);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);

  if (!isConnected) {
    return <DisconnectedScreen />;
  }

  const batteryPower = battery ? (battery.voltageMv * battery.currentMa) / 1e6 : 0;
  const motorPower = motor
    ? !isCompatMode
      ? (motor.voltageMv * motor.currentMa) / 1e6
      : battery
        ? (battery.voltageMv * motor.currentMa) / 1e6
        : 0
    : 0;
  const vbusPower = powerStatus ? (powerStatus.vbusVmV * powerStatus.vbusCurMa) / 1e6 : 0;
  const estSoc = battery ? voltageToSoc(battery.voltageMv) : null;
  const estRemainMwh = (estSoc != null && battery?.capacityMwh) ? Math.round(battery.capacityMwh * estSoc / 100) : null;
  const estEtaMin = (estRemainMwh != null && batteryPower > 0) ? Math.round(estRemainMwh / (batteryPower * 1000) * 60) : null;

  const minSpeed = 0;
  const maxSpeed = 100;
  const displaySpeed = dragSpeed ?? fanSpeed;

  const toggleCard = (key: DashboardCardKey) => {
    const next = { ...dashboardCards, [key]: !dashboardCards[key] };
    setDashboardCards(next);
    if (!dashboardCards[key]) {
      show('新卡片默认为 1×1，请进入编辑模式调整布局');
    }
  };

  const resetCards = () => {
    const defaults: Record<string, boolean> = {};
    for (const k of DASHBOARD_CARD_KEYS) defaults[k] = false;
    for (const k of DASHBOARD_CARD_DEFAULTS) defaults[k] = true;
    setDashboardCards(defaults as typeof dashboardCards);
  };

  const renderToolbar = () => (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setCardPickerOpen((v) => !v)} style={cardBtnStyle}>
        状态卡片
      </button>
      {cardPickerOpen && (
        <>
          <div style={overlayStyle} onClick={() => setCardPickerOpen(false)} />
          <div style={popoverStyle}>
            <div style={popoverTitleStyle}>选择可见卡片</div>
            {DASHBOARD_CARD_KEYS.map((key) => (
              <label key={key} style={checkboxRowStyle}>
                <input type="checkbox" checked={dashboardCards[key]} onChange={() => toggleCard(key)} style={{ accentColor: 'var(--color-accent)' }} />
                <span>{DASHBOARD_CARD_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const gearNum: 0 | 1 | 2 | 3 | 4 = (() => {
    if (fanSpeed === 0 || natureWindOn) return 0;
    const calib = useDeviceStore.getState().speedCalib;
    let best: 0 | 1 | 2 | 3 | 4 = 0; let minDiff = Infinity;
    calib.forEach((sp, i) => { const d = Math.abs(sp - fanSpeed); if (d < minDiff) { minDiff = d; best = (i + 1) as 1 | 2 | 3 | 4; } });
    return best;
  })();

  const timerDisplay = (() => {
    const t = timerRemainingSec;
    if (t <= 0) return '--';
    return `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  })();

  return (
    <PageGrid pageKey="dashboard" pageName="总览" defaultLayouts={DASHBOARD_LAYOUTS} renderToolbar={renderToolbar} onReset={resetCards}>
      {dashboardCards['fan-gear'] && (
        <DraggableCard key="fan-gear">
          <MetricCard label="档位" value={gearNum} unit="档" gauge={{ min: 0, max: 4 }} />
        </DraggableCard>
      )}
      {dashboardCards['fan-speed'] && (
        <DraggableCard key="fan-speed">
          <MetricCard label="转速" value={fanSpeed} unit="%" />
        </DraggableCard>
      )}
      {dashboardCards['fan-timer'] && (
        <DraggableCard key="fan-timer">
          <MetricCard label="定时" value={timerDisplay} rawValue={timerRemainingSec} />
        </DraggableCard>
      )}
      {dashboardCards['batt-power'] && (
        <DraggableCard key="batt-power">
          <MetricCard label="电池功率" value={batteryPower} unit="W" decimals={2} />
        </DraggableCard>
      )}
      {dashboardCards['motor-power'] && (
        <DraggableCard key="motor-power">
          <MetricCard label="电机功率" value={motorPower} unit="W" decimals={2} />
        </DraggableCard>
      )}
      {dashboardCards['motor-cur'] && (
        <DraggableCard key="motor-cur">
          <MetricCard label="电机电流" value={motor ? motor.currentMa : '--'} unit="mA" />
        </DraggableCard>
      )}
      {dashboardCards['batt-volt'] && (
        <DraggableCard key="batt-volt">
          <MetricCard label="电池电压" value={battery ? battery.voltageMv / 1000 : '--'} unit="V" decimals={2} />
        </DraggableCard>
      )}
      {dashboardCards['vbus-volt'] && (
        <DraggableCard key="vbus-volt">
          <MetricCard label="VBUS 电压" value={powerStatus ? powerStatus.vbusVmV / 1000 : '--'} unit="V" decimals={2} />
        </DraggableCard>
      )}
      {dashboardCards['motor-volt'] && (
        <DraggableCard key="motor-volt">
          <MetricCard label="电机电压" value={motor && motor.voltageMv > 0 ? motor.voltageMv / 1000 : '--'} unit="V" decimals={2} />
        </DraggableCard>
      )}
      {dashboardCards['batt-cur'] && (
        <DraggableCard key="batt-cur">
          <MetricCard label="电池电流" value={battery ? battery.currentMa : '--'} unit="mA" />
        </DraggableCard>
      )}
      {dashboardCards['batt-cap'] && (
        <DraggableCard key="batt-cap">
          <MetricCard label="电池容量" value={battery ? battery.capacityMwh : '--'} unit="mWh" />
        </DraggableCard>
      )}
      {dashboardCards['vbus-cur'] && (
        <DraggableCard key="vbus-cur">
          <MetricCard label="VBUS 电流" value={powerStatus ? powerStatus.vbusCurMa : '--'} unit="mA" />
        </DraggableCard>
      )}
      {dashboardCards['vbus-power'] && (
        <DraggableCard key="vbus-power">
          <MetricCard label="VBUS 功率" value={vbusPower} unit="W" decimals={2} />
        </DraggableCard>
      )}
      {dashboardCards['pow-core-temp'] && (
        <DraggableCard key="pow-core-temp">
          <MetricCard label="芯片温度 (powCoreTemp)" value={powerConfig ? powerConfig.powCoreTemp : '--'} unit="℃" />
        </DraggableCard>
      )}
      {dashboardCards['pow-level'] && (
        <DraggableCard key="pow-level">
          <MetricCard label="电量 (powLevel)" value={powerConfig ? powerConfig.powLevel : '--'} unit="%" gauge={{ min: 0, max: 100 }} />
        </DraggableCard>
      )}
      {dashboardCards['batt-est-pct'] && (
        <DraggableCard key="batt-est-pct">
          <MetricCard
            label="电量(电压估算)"
            value={battery ? voltageToSoc(battery.voltageMv) : '--'}
            unit="%"
            gauge={{ min: 0, max: 100, dangerLow: true }}
          />
        </DraggableCard>
      )}
      {dashboardCards['batt-est-rem'] && (
        <DraggableCard key="batt-est-rem">
          <MetricCard label="剩余容量(估算)" value={estRemainMwh ?? '--'} unit="mWh" />
        </DraggableCard>
      )}
      {dashboardCards['batt-est-eta'] && (
        <DraggableCard key="batt-est-eta">
          <MetricCard label="预计续航(估算)" value={estEtaMin ?? '--'} unit="min" />
        </DraggableCard>
      )}
      {dashboardCards['turbo-countdown'] && (
        <DraggableCard key="turbo-countdown">
          <MetricCard
            label="Turbo 倒计时" 
            value={turboCountdownSec > 0 ? `${Math.floor(turboCountdownSec / 60)}:${String(turboCountdownSec % 60).padStart(2, '0')}` : '--'} 
            unit="" 
          />
        </DraggableCard>
      )}

      <DraggableCard key="fan-control">
        <Card title="风扇控制" subtitle={natureWindOn ? '自然风模式' : '手动模式'}>
          <GearRow />
          <Slider label="转速" value={displaySpeed} min={minSpeed} max={maxSpeed}
            onChange={(v) => setDragSpeed(v)}
            onCommit={(v) => { setDragSpeed(null); setFanSpeed(v); }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <Toggle checked={natureWindOn} onChange={(on) => toggleNatureWind(on)} label="自然风" />
          </div>
        </Card>
      </DraggableCard>

      <DraggableCard key="status">
        <Card title="状态"><StatusSummary /></Card>
      </DraggableCard>
    </PageGrid>
  );
}

const cardBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '0.5px solid var(--color-border-strong)', borderRadius: '6px',
  padding: '6px 12px', color: 'var(--color-text-muted)', fontSize: '12px', fontFamily: 'var(--font-sans)', cursor: 'pointer',
};
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 90 };
const popoverStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--color-bg-surface)',
  border: '0.5px solid var(--color-border-strong)', borderRadius: '8px', padding: '10px 14px',
  zIndex: 100, minWidth: '140px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
};
const popoverTitleStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--color-text-dim)', marginBottom: '8px', paddingBottom: '6px', borderBottom: '0.5px solid var(--color-border)',
};
const checkboxRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer',
};
