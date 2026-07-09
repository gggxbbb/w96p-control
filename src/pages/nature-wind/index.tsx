import { useState, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useSettingsStore } from '../../stores/settings';
import { useToastStore } from '../../stores/toast';
import { Card } from '../../components/ui/Card';
import { PageGrid } from '../../components/ui/PageGrid';
import { DraggableCard } from '../../components/ui/DraggableCard';
import { SegBtn } from '../../components/ui/SegBtn';
import { CurveCanvas } from '../../components/nature-wind/CurveCanvas';
import { CurveChart } from '../../components/nature-wind/CurveChart';
import { SignalGenerator } from '../../components/nature-wind/SignalGenerator';
import { DeviceCurve } from '../../components/nature-wind/DeviceCurve';
import { DEFAULT_CURVE } from '@gggxbbb/w96p-ble-sdk';
import type { ResponsiveLayouts } from 'react-grid-layout';

const NW_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'generator', x: 0, y: 0, w: 4, h: 12 },
    { i: 'editor', x: 4, y: 0, w: 8, h: 8 },
    { i: 'preview', x: 4, y: 8, w: 4, h: 4 },
    { i: 'device', x: 8, y: 8, w: 4, h: 4 },
    { i: 'actions', x: 0, y: 12, w: 12, h: 4 },
  ],
  md: [
    { i: 'generator', x: 0, y: 0, w: 4, h: 12 },
    { i: 'editor', x: 4, y: 0, w: 6, h: 8 },
    { i: 'preview', x: 4, y: 8, w: 3, h: 4 },
    { i: 'device', x: 7, y: 8, w: 3, h: 4 },
    { i: 'actions', x: 0, y: 12, w: 10, h: 4 },
  ],
  sm: [
    { i: 'generator', x: 0, y: 0, w: 6, h: 8 },
    { i: 'editor', x: 0, y: 8, w: 6, h: 8 },
    { i: 'preview', x: 0, y: 16, w: 3, h: 4 },
    { i: 'device', x: 3, y: 16, w: 3, h: 4 },
    { i: 'actions', x: 0, y: 20, w: 6, h: 4 },
  ],
  xs: [
    { i: 'generator', x: 0, y: 0, w: 2, h: 10 },
    { i: 'editor', x: 0, y: 10, w: 2, h: 10 },
    { i: 'preview', x: 0, y: 20, w: 2, h: 4 },
    { i: 'device', x: 0, y: 24, w: 2, h: 4 },
    { i: 'actions', x: 0, y: 28, w: 2, h: 4 },
  ],
};

export default function NatureWind() {
  const { readNatureCurve, setNatureCurve, writeNatureWindCtrl } = useBle();
  const storedCurve = useDeviceStore((s) => s.natureCurve);
  const editorMode = useSettingsStore((s) => s.curveEditorMode);
  const setCurveMode = useSettingsStore((s) => s.setCurveMode);
  const show = useToastStore((s) => s.show);
  const natureCurveReadAt = useDeviceStore((s) => s.natureCurveReadAt);
  const natureWindSum = useDeviceStore((s) => s.natureWindSum);
  const natureWindTime = useDeviceStore((s) => s.natureWindTime);

  const min = 0;
  const max = 100;

  // 本地编辑态
  const [editPoints, setEditPoints] = useState<number[]>(
    storedCurve.length === 128 ? storedCurve : [...DEFAULT_CURVE],
  );
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    if (storedCurve.length === 128) {
      setEditPoints([...storedCurve]);
      setTextValue(storedCurve.join(' '));
    }
  }, [storedCurve]);

  useEffect(() => {
    setTextValue(editPoints.join(' '));
  }, [editPoints]);

  const handleCanvasChange = (pts: number[]) => {
    setEditPoints(pts);
  };

  const handleSendToEditor = (pts: number[]) => {
    setEditPoints(pts);
    show('曲线已加载到编辑器，可手动微调');
  };

  const handleApply = async () => {
    if (editPoints.length !== 128) {
      show('请先在编辑器或信号发生器中生成曲线');
      return;
    }
    try {
      await setNatureCurve(editPoints);
      const readBack = await readNatureCurve();
      useDeviceStore.getState().setSnapshot({ natureCurveReadAt: Date.now(), natureCurve: readBack } as any);
      show('曲线已写入设备并读回确认');
    } catch {
      show('写入失败');
    }
  };

  const handleResetDefault = () => {
    setEditPoints([...DEFAULT_CURVE]);
    show('已恢复默认曲线');
  };

  const handleSaveToDevice = async () => {
    try {
      await writeNatureWindCtrl(1);
      show('已将当前曲线保存至设备');
    } catch {
      show('保存失败');
    }
  };

  const handleRestoreDefault = async () => {
    try {
      await writeNatureWindCtrl(2);
      show('已恢复设备默认曲线');
      // 读回设备曲线
      setTimeout(async () => {
        try {
          const pts = await readNatureCurve();
          setEditPoints(pts);
        } catch { /* 读取失败静默 */ }
      }, 300);
    } catch {
      show('恢复失败');
    }
  };

  const handleRead = async () => {
    try {
      const pts = await readNatureCurve();
      setEditPoints(pts);
      useDeviceStore.getState().setSnapshot({ natureCurveReadAt: Date.now() } as any);
      show(`已读取 ${pts.length} 点曲线`);
    } catch {
      show('读取失败');
    }
  };

  const handleTextSubmit = () => {
    const nums = textValue
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => parseInt(s, 10));
    if (nums.length !== 128) {
      show(`需要 128 个数值，当前 ${nums.length}`);
      return;
    }
    const clamped = nums.map((v) => Math.max(min, Math.min(max, isNaN(v) ? min : v)));
    setEditPoints(clamped);
    show('文本曲线已解析');
  };

  const minVal = editPoints.length ? Math.min(...editPoints) : 0;
  const maxVal = editPoints.length ? Math.max(...editPoints) : 0;
  const avgVal = editPoints.length ? editPoints.reduce((a, b) => a + b, 0) / editPoints.length : 0;

  return (
    <div className="new-page" style={{ minHeight: '100%' }}>
      <PageGrid pageKey="nature-wind" pageName="自然风" defaultLayouts={NW_LAYOUTS}>
        <DraggableCard key="editor">
          <Card title="自然风曲线编辑器" variant="new">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <SegBtn
                options={[
                  { value: 'canvas' as const, label: 'Canvas 拖拽' },
                  { value: 'textarea' as const, label: '文本编辑' },
                ]}
                value={editorMode}
                onChange={(v) => setCurveMode(v)}
              />
            </div>

            {editorMode === 'canvas' ? (
              <CurveCanvas points={editPoints} onChange={handleCanvasChange} min={min} max={max} />
            ) : (
              <div>
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onBlur={handleTextSubmit}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    background: 'var(--color-bg-page)',
                    border: '0.5px solid var(--color-border-strong)',
                    borderRadius: '4px',
                    padding: '8px',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    resize: 'vertical',
                  }}
                  placeholder="128 个数值，空格分隔（0-100）"
                />
                <button
                  onClick={handleTextSubmit}
                  style={{
                    marginTop: '6px',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    border: '0.5px solid var(--color-border-strong)',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  解析文本
                </button>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '8px',
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>最小 {minVal}</span>
              <span>最大 {maxVal}</span>
              <span>平均 {avgVal.toFixed(1)}</span>
              <span>范围 {min}-{max}</span>
            </div>
          </Card>
        </DraggableCard>

        <DraggableCard key="generator">
          <Card title="信号发生器" variant="new">
            <SignalGenerator
              onSendToEditor={handleSendToEditor}
            />
          </Card>
        </DraggableCard>

        <DraggableCard key="preview">
          <Card title="只读预览" variant="new">
            <CurveChart points={editPoints} min={min} max={max} />
          </Card>
        </DraggableCard>

        <DraggableCard key="device">
          <Card title="设备实际曲线" variant="new">
            <DeviceCurve
              points={storedCurve}
              min={min}
              max={max}
              readAt={natureCurveReadAt}
              pointCount={natureWindSum || undefined}
              totalTime={natureWindTime || undefined}
            />
          </Card>
        </DraggableCard>

        <DraggableCard key="actions">
          <Card title="操作" variant="new">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 曲线数据：读写设备 RAM */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '6px' }}>曲线数据 · 立即生效</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleRead} style={secondaryBtn}>
                    从设备读取
                  </button>
                  <button onClick={handleApply} style={primaryBtn}>
                    写入到设备
                  </button>
                </div>
              </div>
              {/* 配置持久化：设备闪存 */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '6px' }}>设备闪存 · 断电保留</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSaveToDevice} style={secondaryBtn}>
                    保存当前曲线
                  </button>
                  <button onClick={handleRestoreDefault} style={secondaryBtn}>
                    恢复出厂曲线
                  </button>
                </div>
              </div>
              {/* 编辑器内操作 */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '6px' }}>编辑器</div>
                <button onClick={handleResetDefault} style={{ ...secondaryBtn, flex: 1 }}>
                  载入预设曲线
                </button>
              </div>
            </div>
          </Card>
        </DraggableCard>
      </PageGrid>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-success)',
  color: 'var(--color-bg-page)',
  border: 'none',
  borderRadius: '4px',
  padding: '10px',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '10px',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};
