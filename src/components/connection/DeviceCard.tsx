import { motion, AnimatePresence } from 'framer-motion';
import { useConnectionStore } from '../../stores/connection';
import { useBle } from '../../hooks/useBle';

interface DeviceCardProps {
  open: boolean;
}

export function DeviceCard({ open }: DeviceCardProps) {
  const deviceName = useConnectionStore((s) => s.deviceName);
  const state = useConnectionStore((s) => s.state);
  const { connectReal, isConnected } = useBle();

  const isConnecting = state === 'connecting';

  return (
    <AnimatePresence>
      {open && !isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 25,
            }}
            style={{
              width: 280,
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(30px) saturate(200%)',
              WebkitBackdropFilter: 'blur(30px) saturate(200%)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 24,
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* 设备图标 */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              {isConnecting ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{ display: 'inline-block' }}
                >
                  🔄
                </motion.span>
              ) : (
                '🌀'
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  marginBottom: 4,
                }}
              >
                {deviceName || 'Witrn 风扇'}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {isConnecting ? '正在连接…' : '轻触连接'}
              </div>
            </div>
            <motion.button
              onClick={connectReal}
              disabled={isConnecting}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: 24,
                cursor: isConnecting ? 'default' : 'pointer',
                opacity: isConnecting ? 0.6 : 1,
                boxShadow: '0 4px 20px rgba(94,158,255,0.4)',
              }}
            >
              🔗
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
