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
import { CurvePresets } from '../../components/nature-wind/CurvePresets';
import { DEFAULT_CURVE } from '../../lib/curvePresets';
import type { ResponsiveLayouts } from 'react-grid-layout';

const NW_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'editor', x: 0, y: 0, w: 12, h: 8 },
    { i: 'presets', x: 0, y: 8, w: 4, h: 4 },
    { i: 'preview', x: 4, y: 8, w: 8, h: 4 },
    { i: 'actions', x: 0, y: 12, w: 12, h: 3 },
  ],
  md: [
    { i: 'editor', x: 0, y: 0, w: 10, h: 8 },
    { i: 'presets', x: 0, y: 8, w: 4, h: 4 },
    { i: 'preview', x: 4, y: 8, w: 6, h: 4 },
    { i: 'actions', x: 0, y: 12, w: 10, h: 3 },
  ],
  sm: [
    { i: 'editor', x: 0, y: 0, w: 6, h: 8 },
    { i: 'presets', x: 0, y: 8, w: 6, h: 3 },
    { i: 'preview', x: 0, y: 11, w: 6, h: 4 },
    { i: 'actions', x: 0, y: 15, w: 6, h: 3 },
  ],
  xs: [
    { i: 'editor', x: 0, y: 0, w: 2, h: 10 },
    { i: 'presets', x: 0, y: 10, w: 2, h: 3 },
    { i: 'preview', x: 0, y: 13, w: 2, h: 4 },
    { i: 'actions', x: 0, y: 17, w: 2, h: 3 },
  ],
};

export default function NatureWind() {
  const { profile, readNatureCurve, setNatureCurve } = useBle();
  const storedCurve = useDeviceStore((s) => s.natureCurve);
  const editorMode = useSettingsStore((s) => s.curveEditorMode);
  const setCurveMode = useSettingsStore((s) => s.setCurveMode);
  const show = useToastStore((s) => s.show);

  const min = profile?.minSpeed ?? 0;
  const max = profile?.maxSpeed ?? 100;

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

  const handlePresetApply = (pts: number[]) => {
    // 钳制到 profile 范围
    const clamped = pts.map((v) => Math.max(min, Math.min(max, v)));
    setEditPoints(clamped);
    show('已加载预设，点击"应用"写入设备');
  };

  const handleApply = () => {
    if (editPoints.length !== 128) {
      show('曲线必须 128 点');
      return;
    }
    setNatureCurve(editPoints);
    show('自然风曲线已写入设备');
  };

  const handleRead = async () => {
    try {
      const pts = await readNatureCurve();
      setEditPoints(pts);
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
    <PageGrid pageKey="nature-wind" pageName="自然风" defaultLayouts={NW_LAYOUTS}>
      <DraggableCard key="editor">
        <Card title="自然风曲线编辑器">
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

      <DraggableCard key="presets">
        <Card title="预设曲线">
          <CurvePresets min={min} max={max} onApply={handlePresetApply} />
        </Card>
      </DraggableCard>

      <DraggableCard key="preview">
        <Card title="只读预览">
          <CurveChart points={editPoints} min={min} max={max} />
        </Card>
      </DraggableCard>

      <DraggableCard key="actions">
        <Card title="操作">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              background: 'var(--color-success)',
              color: 'var(--color-bg-page)',
              border: 'none',
              borderRadius: '4px',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            应用到设备
          </button>
          <button
            onClick={handleRead}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '0.5px solid var(--color-border-strong)',
              borderRadius: '4px',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            读取设备曲线
          </button>
        </div>
        </Card>
      </DraggableCard>
    </PageGrid>
  );
}
