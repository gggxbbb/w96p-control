import { useMemo, useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { voltageToSoc } from '../../utils/battery';
import { fmtTimer } from '../../lib/format';
import './easy.css';

const GEARS = [0, 1, 2, 3, 4] as const;
const GEAR_LABELS = ['关', '1', '2', '3', '4'];
const TIMER_PRESETS = [0, 30, 60, 90, 120, 240] as const;

function inferGear(
  fanSpeed: number,
  natureWindOn: boolean,
  speedCalib: [number, number, number, number],
): 0 | 1 | 2 | 3 | 4 {
  if (fanSpeed === 0 || natureWindOn) return 0;
  let best: 0 | 1 | 2 | 3 | 4 = 0;
  let minDiff = Infinity;
  speedCalib.forEach((sp, i) => {
    const diff = Math.abs(sp - fanSpeed);
    if (diff < minDiff) {
      minDiff = diff;
      best = (i + 1) as 1 | 2 | 3 | 4;
    }
  });
  return best;
}

export default function Easy() {
  const {
    setGear,
    setFanSpeed,
    toggleNatureWind,
    setTimer,
    connectReal,
    disconnect,
    isConnected,
    state,
    deviceName,
  } = useBle();

  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const timerRemainingSec = useDeviceStore((s) => s.timerRemainingSec);
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const battery = useDeviceStore((s) => s.battery);

  const [dragSpeed, setDragSpeed] = useState<number | null>(null);

  const isOn = fanSpeed > 0 || natureWindOn;
  const displaySpeed = dragSpeed ?? fanSpeed;
  const currentGear = useMemo(
    () => inferGear(fanSpeed, natureWindOn, speedCalib),
    [fanSpeed, natureWindOn, speedCalib],
  );
  const batteryPct = battery ? voltageToSoc(battery.voltageMv) : null;

  const handlePower = () => {
    if (isOn) setGear(0);
    else setGear(1);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragSpeed(Number(e.target.value));
  };

  const commitSpeed = () => {
    if (dragSpeed !== null) {
      setFanSpeed(dragSpeed);
      setDragSpeed(null);
    }
  };

  const timerLabel = fmtTimer(timerRemainingSec);
  const activeTimerMin = timerRemainingSec > 0 ? Math.round(timerRemainingSec / 60) : 0;

  if (!isConnected) {
    return (
      <div className="easy-page">
        <div className="easy-card easy-connect-card">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="1">
            <path d="M12 2a10 10 0 0 0-10 10c0 4.42 3.58 8 8 8h4c4.42 0 8-3.58 8-8A10 10 0 0 0 12 2Z" />
            <path d="M12 6v6l4 2" />
          </svg>
          <p>
            设备尚未连接
            <br />
            连接后即可使用 Easy Mode
          </p>
          <button
            className="easy-connect-btn"
            onClick={connectReal}
            disabled={state === 'connecting'}
          >
            {state === 'connecting' ? '连接中…' : '连接设备'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="easy-page">
      <div className="easy-header">
        <div className="easy-device">{deviceName ?? 'W96P'}</div>
        <div className="easy-battery">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="7" width="18" height="10" rx="2" />
            <path d="M22 10v4" />
            <rect x="5" y="10" width="6" height="4" rx="1" fill="currentColor" />
          </svg>
          {batteryPct !== null ? `${batteryPct}%` : '—'}
          <button
            type="button"
            className="easy-disconnect"
            onClick={disconnect}
            aria-label="断开连接"
            title="断开连接"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <path d="M12 2v10" />
            </svg>
          </button>
        </div>
      </div>

      <div className="easy-card easy-power-wrap">
        <button
          type="button"
          className={`easy-power ${isOn ? 'on' : 'off'}`}
          onClick={handlePower}
          disabled={!isConnected}
          aria-label={isOn ? '关闭风扇' : '打开风扇'}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            stroke="#fff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isOn ? 'easy-fan-blade' : undefined}
          >
            <circle cx="32" cy="32" r="5" fill="#fff" stroke="none" />
            <path d="M32 27c0-10-8-18-8-18s-6 10-2 18c3 6 8 7 10 5" />
            <path d="M37 32c10 0 18-8 18-8s-10-6-18-2c-6 3-7 8-5 10" />
            <path d="M32 37c0 10 8 18 8 18s6-10 2-18c-3-6-8-7-10-5" />
            <path d="M27 32c-10 0-18 8-18 8s10 6 18 2c6-3 7-8 5-10" />
          </svg>
        </button>
        <div className="easy-power-label">{isOn ? '运行中' : '已关闭'}</div>
        <div className="easy-power-status">
          {natureWindOn ? '自然风模式' : `转速 ${fanSpeed}%`}
        </div>
      </div>

      <div className="easy-card">
        <div className="easy-section-title">档位</div>
        <div className="easy-gear-grid">
          {GEARS.map((g) => (
            <button
              key={g}
              type="button"
              className={`easy-gear-btn ${currentGear === g ? 'active' : ''}`}
              onClick={() => setGear(g)}
              disabled={!isConnected}
            >
              {GEAR_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="easy-card">
        <div className="easy-section-title">调速</div>
        <div className="easy-speed-body">
          <div className="easy-speed-top">
            <div>
              <span className="easy-speed-value">{displaySpeed}</span>
              <span className="easy-speed-unit">%</span>
            </div>
            <div className="easy-speed-label">{currentGear > 0 ? `当前档位 ${currentGear}` : '未运行'}</div>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={displaySpeed}
            onChange={handleSpeedChange}
            onMouseUp={commitSpeed}
            onTouchEnd={commitSpeed}
            onPointerUp={commitSpeed}
            onKeyUp={commitSpeed}
            disabled={!isConnected || natureWindOn}
            className="easy-speed-slider"
            style={{
              background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${displaySpeed}%, var(--color-bg-inset) ${displaySpeed}%, var(--color-bg-inset) 100%)`,
            }}
            aria-label="风扇转速"
          />
          <div className="easy-speed-ticks">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
      </div>

      <div className={`easy-card ${natureWindOn ? 'active' : ''}`}>
        <button
          type="button"
          className={`easy-nature ${natureWindOn ? 'active' : ''}`}
          onClick={() => toggleNatureWind(!natureWindOn)}
          disabled={!isConnected}
        >
          <div className="easy-nature-left">
            <div className="easy-nature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8h11a3 3 0 1 0-3-3" />
                <path d="M3 14h15a3 3 0 1 1-3 3" />
              </svg>
            </div>
            <div>
              <div className="easy-nature-title">自然风</div>
              <div className="easy-nature-subtitle">{natureWindOn ? '已开启 · 模拟自然风曲线' : '关闭'}</div>
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              border: '0.5px solid var(--color-border-strong)',
              background: natureWindOn ? 'var(--color-success)' : 'var(--color-bg-page)',
              position: 'relative',
              transition: 'background 0.15s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: natureWindOn ? '18px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--color-text)',
                transition: 'left 0.15s',
              }}
            />
          </div>
        </button>
      </div>

      <div className="easy-card">
        <div className="easy-section-title">定时关机</div>
        <div className="easy-timer-row">
          {TIMER_PRESETS.map((min) => (
            <button
              key={min}
              type="button"
              className={`easy-timer-chip ${activeTimerMin === min && min > 0 ? 'active' : ''}`}
              onClick={() => setTimer(min * 60)}
              disabled={!isConnected}
            >
              {min === 0 ? '关' : `${min}分`}
            </button>
          ))}
        </div>
        <div className="easy-timer-remaining">{timerLabel}</div>
      </div>
    </div>
  );
}
