import { useState, useRef, useCallback, useEffect } from 'react';
import { useConnectionStore } from '../../stores/connection';
import { useDeviceStore } from '../../stores/device';
import { useDfuStore, type DfuStep } from '../../stores/dfu';
import { parseFirmware, DfuManager, compareVersion } from '@gggxbbb/w96p-ble-sdk';
import { DfuStateMachine } from '../../dfu/dfuStateMachine';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

const STEP_ORDER: DfuStep[] = [
  'connecting',
  'get_version',
  'check_in_dfu',
  'enter_dfu',
  'wait_reboot',
  'scan_reconnect',
  'connect_reconnect',
  'get_page_size',
  'req_unlock',
  'start_up',
  'write_flash',
  'end_up',
  'reset',
  'success',
];

const STEP_LABELS: Record<DfuStep, string> = {
  idle: '等待开始',
  connecting: '连接设备',
  get_version: '查询版本',
  check_in_dfu: '检查 DFU 模式',
  enter_dfu: '进入 DFU 模式',
  wait_reboot: '等待设备重启',
  scan_reconnect: '搜索设备',
  connect_reconnect: '重新连接',
  get_page_size: '查询 Flash 参数',
  req_unlock: 'Flash 解锁',
  start_up: '开始升级',
  write_flash: '写入固件',
  end_up: '完成升级',
  reset: '复位设备',
  success: '升级成功',
  failed: '升级失败',
};

export default function OtaPage() {
  const deviceName = useConnectionStore((s) => s.deviceName);
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const serialNumber = useDeviceStore((s) => s.serialNumber);
  const store = useDfuStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const machineRef = useRef<DfuStateMachine | null>(null);
  const managerRef = useRef<DfuManager | null>(null);

  const [firmware, setFirmware] = useState<any>(null);
  const [firmwareWarnings, setFirmwareWarnings] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dragover, setDragover] = useState(false);

  useEffect(() => {
    return () => {
      machineRef.current?.abort();
      void managerRef.current?.disconnect();
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const buf = await file.arrayBuffer();
      const fw = parseFirmware(buf);

      if (!fw) {
        store.appendLog('无法解析固件文件', 'error');
        return;
      }

      setFirmware(fw);
      store.setTargetVersion(fw.version);
      store.appendLog(
        `已选择固件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        'info',
      );
      store.appendLog(`产品名: ${fw.productName}, 版本: ${fw.version}`, 'info');

      const warnings: string[] = [];
      const productName = 'W96P';
      if (productName && fw.productName !== productName) {
        warnings.push(
          `固件产品名 "${fw.productName}" 与当前设备 "${productName}" 不匹配，刷入不匹配的固件极有可能导致设备变砖。`,
        );
      }
      if (
        store.currentVersion &&
        compareVersion(store.currentVersion, fw.version) <= 0
      ) {
        warnings.push(
          `所选固件版本 (${fw.version}) 不高于设备当前版本 (${store.currentVersion})，降级可能导致功能异常。`,
        );
      }
      setFirmwareWarnings(warnings);
    },
    [store, deviceName],
  );

  const startUpgrade = useCallback(async () => {
    if (!firmware) return;

    store.startUpgrade(firmware.version);
    setShowConfirm(false);

    const manager = new DfuManager((msg, level) => store.appendLog(msg, level));
    managerRef.current = manager;

    try {
      await manager.connect();
      const machine = new DfuStateMachine(manager, firmware);
      machineRef.current = machine;
      await machine.execute();
    } catch (err: any) {
      if (err.message !== 'aborted') {
        store.appendLog(`升级中断: ${err.message}`, 'error');
      }
      void manager.disconnect();
    }
  }, [firmware, store]);

  const cancel = () => {
    machineRef.current?.abort();
    void managerRef.current?.disconnect();
    store.reset();
    setFirmware(null);
    setShowConfirm(false);
    setConfirmed(false);
  };

  const stepIndex = STEP_ORDER.indexOf(store.step);
  const isFailed = store.step === 'failed';
  const isDone = store.step === 'success';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      {/* 警告横幅 */}
      <div
        style={{
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--color-danger-text)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
          🛑 非官方固件升级工具 —— 使用风险自负，不承诺可以正常工作
        </div>
        本工具与 Witrn 官方无关。固件升级操作不可逆，不当操作可能导致设备无法使用（变砖）。
        请确认您完全理解操作风险并自行承担所有后果。
        <div style={{ marginTop: 8, fontWeight: 600 }}>
          ⚠️ OTA 流程尚未完全跑通，暂时请勿使用。
        </div>
        建议优先使用官方软件或提供担保的固件升级工具。
      </div>

      {/* 设备信息 */}
      <Card title="设备信息" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div>
            <span style={{ opacity: 0.6 }}>设备名称</span>
            <br />
            {deviceName || '—'}
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>产品型号</span>
            <br />
            {'W96P'}
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>序列号</span>
            <br />
            {serialNumber || '—'}
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>当前固件</span>
            <br />
            {firmwareVersion || store.currentVersion || '—'}
          </div>
          {firmware && (
            <div>
              <span style={{ opacity: 0.6 }}>目标固件</span>
              <br />
              {firmware.version}
            </div>
          )}
        </div>
      </Card>

      {/* 文件选择 */}
      {!store.inProgress && !isDone && (
        <Card title="选择固件文件" style={{ marginBottom: 16 }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragover(true);
            }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragover(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragover ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 8,
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragover ? 'var(--color-primary-bg)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {firmware ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {firmware.productName} — {firmware.version}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                  {(firmware.fileSize / 1024).toFixed(1)} KB
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.4 }}>
                  点击更换文件
                </div>
              </div>
            ) : (
              <div style={{ opacity: 0.5 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div>拖放 .up 固件文件到此处，或点击选择</div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".up,.bin"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {firmwareWarnings.map((w, i) => (
            <div
              key={i}
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--color-warning-text)',
                lineHeight: 1.5,
              }}
            >
              ⚠️ {w}
            </div>
          ))}
        </Card>
      )}

      {/* 步骤指示器 */}
      {(store.inProgress || isDone || isFailed) && (
        <Card title="升级进度" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STEP_ORDER.slice(0, STEP_ORDER.indexOf('success') + 1).map((step, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex || (step === 'success' && isDone);
              const failed = step === 'failed' && isFailed;

              if (!active && !done && !failed && i > stepIndex + 1) return null;
              if (step === 'success' && !isDone && !done) return null;

              return (
                <div
                  key={step}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: active ? 'var(--color-primary-bg)' : 'transparent',
                    opacity: done && !active ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      background: failed
                        ? 'var(--color-danger)'
                        : done
                          ? 'var(--color-success)'
                          : active
                            ? 'var(--color-primary)'
                            : 'var(--color-border)',
                      color: active || done ? '#fff' : 'var(--color-text)',
                    }}
                  >
                    {failed ? '✕' : done ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    {STEP_LABELS[step]}
                    {step === 'write_flash' && active && (
                      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
                        {store.flashProgress}%
                      </span>
                    )}
                  </div>
                  {active && !failed && <StatusPill status="default" label="进行中" />}
                </div>
              );
            })}
          </div>

          {store.step === 'write_flash' && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  height: 6,
                  background: 'var(--color-border)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${store.flashProgress}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 3,
                    transition: 'width 0.1s',
                  }}
                />
              </div>
              <div
                style={{ textAlign: 'center', fontSize: 12, marginTop: 4, opacity: 0.6 }}
              >
                {store.flashProgress}%
              </div>
            </div>
          )}

          {isFailed && store.error && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--color-danger-text)',
              }}
            >
              ❌ {store.error}
            </div>
          )}

          {isDone && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--color-success-text)',
              }}
            >
              ✅ 固件升级成功！设备已重启。
            </div>
          )}
        </Card>
      )}

      {/* 日志面板 */}
      <Card title="日志" style={{ marginBottom: 16 }}>
        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            fontSize: 12,
            fontFamily: 'monospace',
            background: 'var(--color-surface2)',
            color: 'var(--color-text2)',
            borderRadius: 6,
            padding: '8px 12px',
            lineHeight: 1.6,
          }}
        >
          {store.logs.length === 0 && (
            <div style={{ opacity: 0.4 }}>等待操作...</div>
          )}
          {store.logs.map((entry, i) => (
            <div
              key={i}
              style={{
                color:
                  entry.level === 'error'
                    ? '#f87171'
                    : entry.level === 'warn'
                      ? '#fbbf24'
                      : entry.level === 'success'
                        ? '#4ade80'
                        : '#9ca3af',
              }}
            >
              [{entry.time}] {entry.message}
            </div>
          ))}
        </div>
      </Card>

      {/* 操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        {!store.inProgress && !isDone && (
          <>
            <button
              onClick={() => {
                if (firmwareWarnings.length > 0 && !confirmed) {
                  setShowConfirm(true);
                  return;
                }
                void startUpgrade();
              }}
              disabled={!firmware}
              style={{
                padding: '10px 32px',
                borderRadius: 8,
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                cursor: firmware ? 'pointer' : 'not-allowed',
                background: firmware ? 'var(--color-danger)' : 'var(--color-border)',
                color: '#fff',
                opacity: firmware ? 1 : 0.5,
              }}
            >
              {firmwareWarnings.length > 0 && !confirmed
                ? '确认风险后升级'
                : '开始升级'}
            </button>
            {firmware && (
              <button
                onClick={() => {
                  setFirmware(null);
                  setConfirmed(false);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  fontSize: 14,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--color-text)',
                }}
              >
                清除文件
              </button>
            )}
          </>
        )}

        {isDone && (
          <button
            onClick={cancel}
            style={{
              padding: '10px 32px',
              borderRadius: 8,
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--color-primary)',
              color: '#fff',
            }}
          >
            返回
          </button>
        )}

        {store.inProgress && !isFailed && (
          <button
            onClick={cancel}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid var(--color-danger)',
              fontSize: 14,
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--color-danger)',
            }}
          >
            ⚠️ 终止升级
          </button>
        )}

        {isFailed && (
          <>
            <button
              onClick={() => {
                store.reset();
                void startUpgrade();
              }}
              disabled={!firmware}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: firmware ? 'pointer' : 'not-allowed',
                background: 'var(--color-primary)',
                color: '#fff',
                opacity: firmware ? 1 : 0.5,
              }}
            >
              重试
            </button>
            <button
              onClick={cancel}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 14,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--color-text)',
              }}
            >
              取消
            </button>
          </>
        )}
      </div>

      {/* 底部警示 */}
      {store.inProgress && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            opacity: 0.4,
            padding: '8px 0',
          }}
        >
          ⚠️ 操作中请勿断开设备或关闭页面，否则可能导致固件损坏
        </div>
      )}

      {/* 确认弹窗 */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
              ⚠️ 风险确认
            </h3>
            <ul
              style={{
                padding: '0 0 0 20px',
                fontSize: 13,
                lineHeight: 1.8,
                opacity: 0.8,
                color: 'var(--color-text)',
              }}
            >
              <li>
                本工具为<strong>非官方</strong>项目，与 Witrn 无关
              </li>
              <li>
                升级过程中断开设备或关闭页面<strong>可能损坏设备</strong>
              </li>
              <li>
                刷入不匹配的固件<strong>可能导致设备变砖</strong>
              </li>
              <li>
                所有操作风险由您<strong>自行承担</strong>
              </li>
            </ul>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '16px 0',
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              我完全理解上述风险，并确认继续升级
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--color-text)',
                }}
              >
                取消
              </button>
              <button
                disabled={!confirmed}
                onClick={() => void startUpgrade()}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: confirmed ? 'pointer' : 'not-allowed',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  opacity: confirmed ? 1 : 0.5,
                }}
              >
                确认升级
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
