import { useBle } from '../../hooks/useBle';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';

const LABELS = ['关灯', '低亮', '中低', '中高', '最高'] as const;

export function LightPanel() {
  const { setLight } = useBle();
  const show = useToastStore((s) => s.show);

  const handleSet = (v: number) => {
    setLight(v);
    if (v === 0) show('灯光已关闭，操作按键或蓝牙控制后将恢复');
    else show(`灯光已设为 ${LABELS[v]}`);
  };

  return (
    <Card variant="new" title="灯光控制">
      <div style={{ display: 'flex', gap: '4px' }}>
        {LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => handleSet(i)}
            style={{
              flex: 1,
              background: i === 0 ? 'var(--color-bg-page)' : 'var(--color-accent)',
              color: i === 0 ? 'var(--color-text-muted)' : '#fff',
              border: `0.5px solid ${i === 0 ? 'var(--color-border-strong)' : 'var(--color-accent)'}`,
              borderRadius: '4px',
              padding: '7px 0',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              lineHeight: '1.2',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}
