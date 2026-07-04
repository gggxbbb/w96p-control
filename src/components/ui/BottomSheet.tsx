import { type ReactNode } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
            onClick={onClose}
          />
          {/* 面板 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(
              _e,
              info: PanInfo,
            ) => {
              if (info.velocity.y > 300 || info.offset.y > 100) onClose();
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '70%',
              background: 'rgba(28,28,30,0.95)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderTop: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '24px 24px 0 0',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {/* 抓取条 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 6px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.2)',
                }}
              />
            </div>
            {/* 内容区 */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '0 20px 40px',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
