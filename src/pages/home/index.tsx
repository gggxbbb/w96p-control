import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RingGauge } from '../../components/ui/RingGauge';
import { ArcSlider } from '../../components/ui/ArcSlider';
import { GlassButton } from '../../components/ui/GlassButton';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { GlassCard } from '../../components/ui/GlassCard';
import { useDeviceStore } from '../../stores/device';
import { useConnectionStore } from '../../stores/connection';
import { useSettingsStore } from '../../stores/settings';
import { useBle } from '../../hooks/useBle';

const GEAR_NAMES: Record<number, string> = {
  0: '关机',
  1: '轻柔',
  2: '舒适',
  3: '劲爽',
  4: '澎湃',
};

function getGearLabel(speed: number, calib: [number, number, number, number]): string {
  if (speed === 0) return '关机';
  let minDist = Infinity;
  let gear = 0;
  for (let i = 0; i < calib.length; i++) {
    const d = Math.abs(speed - calib[i]);
    if (d < minDist) {
      minDist = d;
      gear = i + 1;
    }
  }
  return `${gear}档 · ${GEAR_NAMES[gear]}`;
}

export default function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const isLongPressRef = useRef(false);

  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const turboCountdownSec = useDeviceStore((s) => s.turboCountdownSec);
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const battery = useDeviceStore((s) => s.battery);
  const powerStatus = useDeviceStore((s) => s.powerStatus);

  const { setFanSpeed, setTurbo, isConnected } = useBle();
  const deviceName = useConnectionStore((s) => s.deviceName);
  const state = useConnectionStore((s) => s.state);

  const turboActive = turboCountdownSec > 0;
  const battVoltage = battery ? (battery.voltageMv / 1000).toFixed(1) : '--';
  const coreTemp = powerStatus ? `${powerStatus.powC}` : '--';
  const isConnecting = state === 'connecting';

  const handleSpeedChange = useCallback(
    (v: number) => {
      void setFanSpeed(v);
    },
    [setFanSpeed],
  );

  // 长按触发 Turbo
  const handlePointerDown = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressRef.current = true;
      void setTurbo(true);
    }, 800);
  }, [setTurbo]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (isLongPressRef.current && turboActive) {
      void setTurbo(false);
    }
  }, [turboActive, setTurbo]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 24px 0',
      }}
    >
      {/* 顶部状态区 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: 'var(--color-text-secondary)',
            }}
          >
            {deviceName || 'Witrn 风扇'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              marginTop: 2,
            }}
          >
            电压 {battVoltage}V · 芯片 {coreTemp}°C
          </div>
        </div>
        {/* 连接状态指示点 */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected
              ? 'var(--color-success)'
              : isConnecting
                ? 'var(--color-warning)'
                : 'var(--color-text-tertiary)',
            boxShadow: isConnected
              ? '0 0 8px var(--color-success)'
              : isConnecting
                ? '0 0 8px var(--color-warning)'
                : 'none',
            transition: 'all 0.3s',
          }}
        />
      </motion.div>

      {/* 中央仪表区 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.2,
        }}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <RingGauge
          value={turboActive ? turboCountdownSec : fanSpeed}
          max={turboActive ? 30 : 100}
          label={
            turboActive
              ? String(Math.ceil(turboCountdownSec))
              : String(fanSpeed)
          }
          subtitle={
            turboActive ? 'TURBO' : getGearLabel(fanSpeed, speedCalib)
          }
          isTurbo={turboActive}
          size={240}
          strokeWidth={14}
        />
      </motion.div>

      {/* 底部控制区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ paddingBottom: 12, flexShrink: 0 }}
      >
        {/* 弧形滑块 */}
        <ArcSlider
          value={turboActive ? 100 : fanSpeed}
          min={0}
          max={100}
          onChange={handleSpeedChange}
          disabled={turboActive || !isConnected}
        />

        {/* +/- 按钮 + 控制中心 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
            marginTop: 16,
          }}
        >
          <GlassButton
            onClick={() =>
              handleSpeedChange(Math.max(0, fanSpeed - 5))
            }
            disabled={turboActive || !isConnected}
          >
            −
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={() => setSheetOpen(true)}
          >
            ☰
          </GlassButton>
          <GlassButton
            onClick={() =>
              handleSpeedChange(Math.min(100, fanSpeed + 5))
            }
            disabled={turboActive || !isConnected}
          >
            +
          </GlassButton>
        </div>
      </motion.div>

      {/* 控制中心面板 */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <ControlCenter />
      </BottomSheet>
    </div>
  );
}

/** 控制中心面板内容 */
function ControlCenter() {
  const { setFanSpeed, toggleNatureWind } = useBle();
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const serialNumber = useDeviceStore((s) => s.serialNumber);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const gears = speedCalib;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 档位预设 */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
          }}
        >
          档位预设
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}
        >
          {gears.map((spd, i) => (
            <GlassCard
              key={i}
              hoverable
              onClick={() => void setFanSpeed(spd)}
              style={{
                padding: 16,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 300,
                  color: 'var(--color-text)',
                }}
              >
                {spd}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  marginTop: 4,
                }}
              >
                {GEAR_NAMES[i + 1]}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
          }}
        >
          快捷操作
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* 自然风 */}
          <div
            style={{
              background: 'var(--color-surface)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => void toggleNatureWind(!natureWindOn)}
          >
            <span style={{ fontSize: 14 }}>🌊 自然风</span>
            <span
              style={{
                fontSize: 12,
                padding: '4px 12px',
                borderRadius: 12,
                background: natureWindOn
                  ? 'rgba(94,158,255,0.2)'
                  : 'rgba(255,255,255,0.05)',
                color: natureWindOn
                  ? 'var(--color-accent)'
                  : 'var(--color-text-tertiary)',
              }}
            >
              {natureWindOn ? '开' : '关'}
            </span>
          </div>
          {/* 主题切换 */}
          <div
            style={{
              background: 'var(--color-surface)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() =>
              setTheme(theme === 'dark' ? 'light' : 'dark')
            }
          >
            <span style={{ fontSize: 14 }}>🌓 外观</span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {theme === 'dark' ? '深色' : '浅色'}
            </span>
          </div>
        </div>
      </div>

      {/* 设备信息 */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
          }}
        >
          设备信息
        </div>
        <GlassCard
          style={{
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <InfoRow label="固件版本" value={firmwareVersion || '--'} />
          <InfoRow label="序列号" value={serialNumber || '--'} />
        </GlassCard>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
