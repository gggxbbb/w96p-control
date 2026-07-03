import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { getFeatures } from '../../ble/features';

export function BleNamePanel() {
  const { deviceName, setBleName } = useBle();
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const show = useToastStore((s) => s.show);

  const features = getFeatures(firmwareVersion);
  const hasBleName = features.has('bleName');

  if (!hasBleName) return null;

  const [name, setName] = useState('');

  const handleSetName = () => {
    if (!hasBleName) {
      show('需要固件 v1.3+，请升级');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      show('请输入蓝牙名称');
      return;
    }
    if (trimmed.length > 17) {
      show('蓝牙名称最长 17 字节');
      return;
    }
    setBleName(trimmed);
    show(`蓝牙名称已发送：${trimmed}`);
  };

  return (
    <Card title="蓝牙名称" subtitle="v1.3+">
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
        当前：<span style={{ color: 'var(--color-text)' }}>{deviceName ?? '未知'}</span>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
        最长 17 字节，建议仅使用字母、数字、横杠 -、下划线 _
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          maxLength={17}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入新名称"
          style={textInputStyle}
        />
        <button onClick={handleSetName} style={applyBtnStyle}>应用</button>
      </div>
    </Card>
  );
}

const textInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-bg-page)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
};

const applyBtnStyle: React.CSSProperties = {
  background: 'var(--color-success)',
  color: 'var(--color-bg-page)',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 14px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};
