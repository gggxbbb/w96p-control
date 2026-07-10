import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useSettingsStore } from '../../stores/settings';
import { Card } from '../../components/ui/Card';
import { PageGrid } from '../../components/ui/PageGrid';
import { DraggableCard } from '../../components/ui/DraggableCard';
import { SegBtn } from '../../components/ui/SegBtn';
import { isControlledBySW } from '../../lib/forceRefresh';
import { checkAndUpdate } from '../../components/UpdatePrompt';
import type { ResponsiveLayouts } from 'react-grid-layout';

const SETTINGS_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'device', x: 0, y: 0, w: 6, h: 5 },
    { i: 'appearance', x: 6, y: 0, w: 6, h: 3 },
    { i: 'data', x: 0, y: 5, w: 6, h: 5 },
    { i: 'curve', x: 6, y: 3, w: 6, h: 3 },
    { i: 'cache', x: 6, y: 6, w: 6, h: 4 },
    { i: 'about', x: 0, y: 11, w: 12, h: 4 },
    { i: 'advanced', x: 0, y: 15, w: 12, h: 3 },
  ],
  md: [
    { i: 'device', x: 0, y: 0, w: 5, h: 5 },
    { i: 'appearance', x: 5, y: 0, w: 5, h: 3 },
    { i: 'data', x: 0, y: 5, w: 5, h: 5 },
    { i: 'curve', x: 5, y: 3, w: 5, h: 3 },
    { i: 'cache', x: 5, y: 6, w: 5, h: 4 },
    { i: 'about', x: 0, y: 11, w: 10, h: 4 },
    { i: 'advanced', x: 0, y: 15, w: 10, h: 3 },
  ],
  sm: [
    { i: 'device', x: 0, y: 0, w: 6, h: 5 },
    { i: 'appearance', x: 0, y: 5, w: 6, h: 3 },
    { i: 'data', x: 0, y: 8, w: 6, h: 5 },
    { i: 'curve', x: 0, y: 13, w: 6, h: 3 },
    { i: 'cache', x: 0, y: 16, w: 6, h: 4 },
    { i: 'about', x: 0, y: 20, w: 6, h: 4 },
    { i: 'advanced', x: 0, y: 24, w: 6, h: 3 },
  ],
  xs: [
    { i: 'device', x: 0, y: 0, w: 2, h: 6 },
    { i: 'appearance', x: 0, y: 6, w: 2, h: 4 },
    { i: 'data', x: 0, y: 10, w: 2, h: 6 },
    { i: 'curve', x: 0, y: 16, w: 2, h: 4 },
    { i: 'cache', x: 0, y: 20, w: 2, h: 5 },
    { i: 'about', x: 0, y: 25, w: 2, h: 5 },
    { i: 'advanced', x: 0, y: 30, w: 2, h: 4 },
  ],
};

export default function Settings() {
  const { isConnected, deviceName, disconnect } = useBle();
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const { theme, pollIntervalMs, curveEditorMode, historyRetentionMin, setTheme, setPollInterval, setCurveMode, setHistoryRetentionMin } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleForceRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 100));
    await checkAndUpdate();
  }, []);

  const swActive = isControlledBySW();

  return (
    <PageGrid pageKey="settings" pageName="设置" defaultLayouts={SETTINGS_LAYOUTS}>
      <DraggableCard key="device">
        <Card title="设备信息">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <Row label="连接状态" value={isConnected ? '已连接' : '未连接'} accent={isConnected ? 'var(--color-success)' : 'var(--color-text-muted)'} />
            <Row label="设备名称" value={deviceName ?? '--'} />
            <Row label="设备档案" value={firmwareVersion ? `v${firmwareVersion}` : '--'} />
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
      </DraggableCard>

      <DraggableCard key="appearance">
        <Card title="外观">
            <SettingRow label="主题">
              <SegBtn
                options={[{ value: 'dark' as const, label: '深色' }, { value: 'light' as const, label: '浅色' }, { value: 'system' as const, label: '跟随系统' }]}
                value={theme}
                onChange={(v) => setTheme(v)}
              />
            </SettingRow>
        </Card>
      </DraggableCard>

      <DraggableCard key="data">
        <Card title="数据采集">
            <SettingRow label="轮询周期">
              <SegBtn
                options={[
                  { value: 500 as const, label: '500ms' },
                  { value: 1000 as const, label: '1s' },
                  { value: 2000 as const, label: '2s' },
                ]}
                value={pollIntervalMs}
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
                value={historyRetentionMin}
                onChange={(v) => setHistoryRetentionMin(v)}
              />
            </SettingRow>
        </Card>
      </DraggableCard>

      <DraggableCard key="curve">
        <Card title="自然风曲线编辑器">
            <SettingRow label="默认编辑模式">
              <SegBtn
                options={[{ value: 'canvas' as const, label: 'Canvas 拖拽' }, { value: 'textarea' as const, label: '文本编辑' }]}
                value={curveEditorMode}
                onChange={(v) => setCurveMode(v)}
              />
            </SettingRow>
        </Card>
      </DraggableCard>

      <DraggableCard key="cache">
        <Card title="缓存">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Service Worker</span>
              <span style={{
                color: swActive ? 'var(--color-success)' : 'var(--color-text-dim)',
                fontSize: '11px',
              }}>
                {swActive ? '已激活' : '未激活'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', lineHeight: '1.5' }}>
              强制刷新将清除所有本地缓存并重新加载，确保获取最新版本的应用。
            </div>
            <button
              onClick={handleForceRefresh}
              disabled={refreshing}
              style={{
                marginTop: '4px',
                background: refreshing ? 'var(--color-bg-hover)' : 'transparent',
                color: 'var(--color-warning)',
                border: '0.5px solid var(--color-warning)',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? '刷新中...' : '强制刷新'}
            </button>
          </div>
        </Card>
      </DraggableCard>

      <DraggableCard key="about">
        <Card title="关于">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <Row label="应用" value="W96P 控制 v1.0" />
              <Row label="提交" value={import.meta.env.VITE_COMMIT_HASH ?? 'unknown'} />
              <Row label="构建" value={new Date(import.meta.env.VITE_BUILD_TIME ?? Date.now()).toLocaleString('zh-CN')} />
              <Row label="协议" value="BLE GATT (FFF0/FFD0/FFE0)" />
              <Row label="支持设备" value="W96P / W66D" />
              <Row label="字体" value="MiSans" />
              <div style={{ marginTop: '4px' }}>
                <a
                  href="https://github.com/gggxbbb/w96p-control"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    fontSize: '12px',
                  }}
                >
                  GitHub ↗
                </a>
              </div>
              <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--color-text-dim)' }}>
                Web Bluetooth API · Chrome 56+ / Edge 79+
              </div>
            </div>
        </Card>
      </DraggableCard>

      <DraggableCard key="advanced">
        <Card title="高级">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AdvancedLink to="/advanced">高级视图</AdvancedLink>
            <AdvancedLink to="/battery-learn">电池学习</AdvancedLink>
            <AdvancedLink to="/debug-ble">BLE 调试</AdvancedLink>
          </div>
        </Card>
      </DraggableCard>
    </PageGrid>
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

function AdvancedLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="advanced-link">
      <span>{children}</span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}
