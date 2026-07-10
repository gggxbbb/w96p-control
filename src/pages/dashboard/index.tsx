import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { DisconnectedScreen } from '../../components/connection/DisconnectedScreen';
import { FanDial } from '../../components/home/FanDial';
import { GearChips } from '../../components/home/GearChips';
import { QuickActions } from '../../components/home/QuickActions';
import { DetailPanel } from '../../components/home/DetailPanel';
import { MetricRow } from '../../components/home/MetricRow';
import { Modal } from '../../components/ui/Modal';
import { TimerPanel } from '../../components/fan/TimerPanel';
import { LightPanel } from '../../components/fan/LightPanel';
import { TurboPanel } from '../../components/fan/TurboPanel';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isConnected, setFanSpeed, toggleNatureWind } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const calibration = useDeviceStore((s) => s.speedCalib);
  const battery = useDeviceStore((s) => s.battery);
  const powerConfig = useDeviceStore((s) => s.powerConfig);

  const [dragSpeed, setDragSpeed] = useState<number | null>(null);
  const [modal, setModal] = useState<'timer' | 'light' | 'turbo' | null>(null);
  const displaySpeed = dragSpeed ?? fanSpeed;

  if (!isConnected) {
    return <DisconnectedScreen />;
  }

  const batteryPower = battery ? (battery.voltageMv * battery.currentMa) / 1e6 : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: '16px 16px 32px',
      minHeight: '100%',
      background: 'var(--color-new-bg-page)',
      color: 'var(--color-new-text)',
    }}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>总览</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-new-text-muted)' }}>已连接</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FanDial
          value={displaySpeed}
          aria-label="风速"
          onChange={setDragSpeed}
          onCommit={(v) => { setDragSpeed(null); setFanSpeed(v); }}
        />
      </div>

      <GearChips
        speed={fanSpeed}
        calibration={calibration}
        natureWindOn={natureWindOn}
        onGear={(g) => setFanSpeed(calibration[g - 1] ?? 0)}
      />

      <QuickActions
        actions={[
          {
            key: 'nature',
            icon: '🍃',
            label: '自然风',
            active: natureWindOn,
            accent: 'var(--color-new-accent-nature)',
            onClick: () => toggleNatureWind(!natureWindOn),
          },
          {
            key: 'timer',
            icon: '⏱',
            label: '定时',
            onClick: () => setModal('timer'),
          },
          {
            key: 'light',
            icon: '💡',
            label: '灯光',
            onClick: () => setModal('light'),
          },
          {
            key: 'turbo',
            icon: '⚡',
            label: 'Turbo',
            accent: 'var(--color-new-accent-dark)',
            onClick: () => setModal('turbo'),
          },
        ]}
      />

      <DetailPanel onOpenAdvanced={() => navigate('/advanced')}>
        <MetricRow label="电池功率" value={batteryPower.toFixed(2)} unit="W" />
        <MetricRow label="电池电压" value={battery ? (battery.voltageMv / 1000).toFixed(2) : '--'} unit="V" />
        <MetricRow label="芯片温度" value={powerConfig?.powCoreTemp ?? '--'} unit="℃" />
      </DetailPanel>

      <Modal open={modal === 'timer'} onClose={() => setModal(null)} title="定时关机">
        <TimerPanel />
      </Modal>
      <Modal open={modal === 'light'} onClose={() => setModal(null)} title="灯光控制">
        <LightPanel />
      </Modal>
      <Modal open={modal === 'turbo'} onClose={() => setModal(null)} title="Turbo 模式">
        <TurboPanel />
      </Modal>
    </div>
  );
}
