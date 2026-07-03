import { useBle } from '../../hooks/useBle';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';

export function LightPanel() {
  const { lightOff } = useBle();
  const show = useToastStore((s) => s.show);

  const handleOff = () => {
    lightOff();
    show('灯光已临时关闭，操作按键或蓝牙控制后将恢复');
  };

  return (
    <Card title="灯光控制">
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
        临时关闭 LED 灯光。操作按键或蓝牙控制后将自动恢复。
      </div>
      <button onClick={handleOff} style={btnStyle}>
        临时关灯
      </button>
    </Card>
  );
}

const btnStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-page)',
  color: 'var(--color-text-muted)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '8px 0',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};
