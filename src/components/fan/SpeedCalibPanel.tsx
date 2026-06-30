import { useState, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';

function isNonDecreasing(nums: number[]): boolean {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < nums[i - 1]) return false;
  }
  return true;
}

/** 连锁传播保证非递减：向右拉平、向左压平 */
function enforceOrder(nums: number[]): number[] {
  const next = [...nums];
  for (let i = 1; i < next.length; i++) {
    if (next[i] < next[i - 1]) next[i] = next[i - 1];
  }
  for (let i = next.length - 2; i >= 0; i--) {
    if (next[i] > next[i + 1]) next[i] = next[i + 1];
  }
  return next;
}

export function SpeedCalibPanel() {
  const { profile, setSpeedCalib } = useBle();
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const show = useToastStore((s) => s.show);

  const [inputs, setInputs] = useState<string[]>(['', '', '', '']);
  const [advanced, setAdvanced] = useState(false);

  // 从设备同步到 inputs（设备值永远是合法的数字）
  useEffect(() => {
    setInputs(speedCalib.map(String));
  }, [speedCalib]);

  const nums = inputs.map((s) => {
    const v = parseInt(s, 10);
    return isNaN(v) ? 0 : v;
  });

  const disordered = !isNonDecreasing(nums);

  // 检测到乱序自动进入高级模式
  useEffect(() => {
    if (disordered && !advanced) setAdvanced(true);
  }, [disordered, advanced]);

  const defaults = profile?.defaultSpeeds ?? [30, 50, 70, 100];

  const handleChange = (i: number, raw: string) => {
    const nextInputs = [...inputs];
    nextInputs[i] = raw;

    if (advanced) {
      setInputs(nextInputs);
      return;
    }

    // 正常模式：parse 后连锁传播
    const nextNums = nextInputs.map((s) => {
      const v = parseInt(s, 10);
      return isNaN(v) ? 0 : v;
    });
    const ordered = enforceOrder(nextNums);
    setInputs(ordered.map(String));
  };

  const apply = () => {
    const clamped = nums.map((v) => Math.max(0, Math.min(100, v)));
    setSpeedCalib(clamped as [number, number, number, number]);
    show('档位风速已应用');
  };

  const reset = () => {
    setInputs(defaults.map(String));
    setSpeedCalib(defaults as [number, number, number, number]);
    setAdvanced(false);
    show('已恢复默认档位风速');
  };

  const tryExitAdvanced = () => {
    if (isNonDecreasing(nums)) {
      setAdvanced(false);
    } else {
      show('档位顺序不正确，无法退出高级模式');
    }
  };

  const toggleAdvanced = () => {
    if (advanced) {
      tryExitAdvanced();
    } else {
      setAdvanced(true);
    }
  };

  return (
    <Card
      title="档位风速校准"
      actions={advanced ? <span style={{ fontSize: '10px', color: 'var(--color-warning)' }}>高级</span> : undefined}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', minWidth: '32px' }}>{i + 1}档</span>
            <input
              type="number"
              min={0}
              max={100}
              value={inputs[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              style={numberInputStyle}
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>%</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={apply} style={primaryBtnStyle}>应用</button>
        <button onClick={reset} style={presetBtnStyle}>恢复默认</button>
        <div style={{ flex: 1 }} />
        <button onClick={toggleAdvanced} style={presetBtnStyle}>
          {advanced ? '退出高级模式' : '高级编辑'}
        </button>
      </div>
    </Card>
  );
}

const numberInputStyle: React.CSSProperties = {
  width: '60px',
  background: 'var(--color-bg-page)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--color-success)',
  color: 'var(--color-bg-page)',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const presetBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};
