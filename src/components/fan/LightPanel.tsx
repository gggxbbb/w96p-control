import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { getFeatures } from '../../ble/features';

const LEVELS = [
  { value: 0, label: '临时关灯', emoji: '🌑' },
  { value: 1, label: '低亮度', emoji: '🌒' },
  { value: 2, label: '中低', emoji: '🌓' },
  { value: 3, label: '中高', emoji: '🌔' },
  { value: 4, label: '最高', emoji: '🌕' },
] as const;

export function LightPanel() {
  const { lightOff } = useBle();
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const show = useToastStore((s) => s.show);

  const features = getFeatures(firmwareVersion);
  if (!features.has('lightOff')) return null;

  const handleLevel = (level: number) => {
    lightOff(); // 当前仍是写 0x00，后续可扩展 writeLightLevel
    if (level === 0) {
      show('灯光已临时关闭，操作按键或蓝牙控制后将恢复');
    } else {
      show(`${LEVELS[level].label}，操作按键或蓝牙控制后将恢复`);
    }
  };

  return (
    <Card title="灯光控制" subtitle="v1.3+">
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
        设置 LED 亮度。临时关灯后，操作按键或蓝牙控制将自动恢复至最低亮度。
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => handleLevel(l.value)}
            style={{
              flex: 1,
              background: 'var(--color-bg-page)',
              color: l.value === 0 ? 'var(--color-text-dim)' : 'var(--color-text-muted)',
              border: '0.5px solid var(--color-border-strong)',
              borderRadius: '4px',
              padding: '8px 4px',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '16px' }}>{l.emoji}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
