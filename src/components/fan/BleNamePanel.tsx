import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useToastStore } from '../../stores/toast';
import { useDeviceStore } from '../../stores/device';
import { Card } from '../ui/Card';

interface Props {
  mode?: 'name' | 'sn';
}

export function BleNamePanel({ mode = 'name' }: Props) {
  const { deviceName, setBleName, setBleSn } = useBle();
  const bleSnEnabled = useDeviceStore((s) => s.bleSnEnabled);
  const show = useToastStore((s) => s.show);
  const [name, setName] = useState('');

  // --- SN 模式：序列号显示开关 ---
  if (mode === 'sn') {
    const handleToggle = () => {
      const next = !bleSnEnabled;
      setBleSn(next);
      show(next ? 'BLE 名称将显示序列号' : 'BLE 名称将隐藏序列号');
    };

    return (
      <Card title="序列号显示">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            广播名中显示序列号后缀
          </span>
          <Toggle enabled={bleSnEnabled} onToggle={handleToggle} />
        </div>
        <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
          {bleSnEnabled
            ? '已开启 — 蓝牙名称将附带序列号后缀'
            : '已关闭 — 蓝牙名称仅显示 W96P'}
        </div>
      </Card>
    );
  }

  // --- 原有 name 模式 ---
  const handleSetName = () => {
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
    <Card title="蓝牙名称">
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

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: enabled ? 'var(--color-success)' : 'var(--color-border-strong)',
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: enabled ? '18px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'var(--color-bg-page)',
          transition: 'left 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
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
