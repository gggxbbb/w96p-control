import { useBle } from '../../hooks/useBle';
import { useSettingsStore } from '../../stores/settings';
import { Card } from '../../components/ui/Card';
import { SegBtn } from '../../components/ui/SegBtn';

export default function Settings() {
  const { isConnected, deviceName, profile, disconnect } = useBle();
  const { theme, pollIntervalMs, curveEditorMode, historyRetentionMin, setTheme, setPollInterval, setCurveMode, setHistoryRetentionMin } = useSettingsStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Card title="设备信息">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <Row label="连接状态" value={isConnected ? '已连接' : '未连接'} accent={isConnected ? 'var(--color-success)' : 'var(--color-text-muted)'} />
          <Row label="设备名称" value={deviceName ?? '--'} />
          <Row label="设备档案" value={profile?.name ?? '--'} />
          {isConnected && (
            <button
              onClick={disconnect}
              style={{
                marginTop: '8px',
                background: 'transparent',
                color: 'var(--color-danger)',
                border: '0.5px solid var(--color-danger)',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '11px',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              断开连接
            </button>
          )}
        </div>
      </Card>

      <Card title="外观">
        <SettingRow label="主题">
          <SegBtn
            options={[{ value: 'dark' as const, label: '深色' }, { value: 'light' as const, label: '浅色' }]}
            value={theme}
            onChange={(v) => {
              setTheme(v);
              document.documentElement.dataset.theme = v;
            }}
          />
        </SettingRow>
      </Card>

      <Card title="数据采集">
        <SettingRow label="轮询周期">
          <SegBtn
            options={[
              { value: 500 as const, label: '500ms' },
              { value: 1000 as const, label: '1s' },
              { value: 2000 as const, label: '2s' },
            ]}
            value={pollIntervalMs as 500 | 1000 | 2000}
            onChange={(v) => setPollInterval(v)}
          />
        </SettingRow>
        <SettingRow label="历史保留时长">
          <SegBtn
            options={[
              { value: 15 as const, label: '15 分钟' },
              { value: 30 as const, label: '30 分钟' },
              { value: 60 as const, label: '60 分钟' },
            ]}
            value={historyRetentionMin as 15 | 30 | 60}
            onChange={(v) => setHistoryRetentionMin(v)}
          />
        </SettingRow>
      </Card>

      <Card title="自然风曲线编辑器">
        <SettingRow label="默认编辑模式">
          <SegBtn
            options={[{ value: 'canvas' as const, label: 'Canvas 拖拽' }, { value: 'textarea' as const, label: '文本编辑' }]}
            value={curveEditorMode}
            onChange={(v) => setCurveMode(v)}
          />
        </SettingRow>
      </Card>

      <Card title="关于">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <Row label="应用" value="W96P 控制 v1.0" />
          <Row label="协议" value="BLE GATT (FFF0/FFD0/FFE0)" />
          <Row label="支持设备" value="W96P / W66D" />
          <Row label="字体" value="MiSans" />
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--color-text-dim)' }}>
            Web Bluetooth API · Chrome 56+ / Edge 79+
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: accent || 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  );
}
