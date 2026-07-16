/**
 * w96p-ble-sdk — W96P/W66D BLE 风扇协议 SDK
 *
 * @module
 */

// ── Types ──
export type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './ble/parsers.js';
export type { BleState, BleSnapshot, IBleManager } from './ble/types.js';
export type { PowReg } from './ble/commands.js';
export type { PowSwitchDef, PowSegDef } from './ble/powSwitches.js';
export type { OpRecord, SchedulerSnapshot } from './ble/metrics.js';

// ── Transport abstraction ──
export type { GattTransport, GattDevice, GattServer, GattService, GattCharacteristic, GattCharacteristicProperties } from './ble/transport.js';
export { WebBluetoothTransport } from './ble/webTransport.js';
export { SERVICES, CHARS, OPTIONAL_CHARS, ALL_OPTIONAL_SERVICES, MAIN_SERVICE, DFU_SERVICE, DFU_WRITE, DFU_NOTIFY } from './ble/uuids.js';

// ── Commands ──
export { cmd, encodeCmd } from './ble/commands.js';

// ── Parsers ──
export { parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig } from './ble/parsers.js';

// ── Features ──
export { compareVersion, getFeatures, FEATURE_BASE, FEATURE_DELTAS } from './ble/features.js';
export type { FeatureDelta } from './ble/features.js';

// ── Profiles ──
export { isCompatModel, defaultSpeeds, SPEED_RANGE, DEFAULT_SPEEDS_FULL, DEFAULT_SPEEDS_COMPAT } from './ble/profiles.js';

// ── Power Switches ──
export { POW_SWITCHES, POW_SEGS, REG_TITLES } from './ble/powSwitches.js';

// ── BLE Infrastructure ──
export { BleManager } from './ble/manager.js';
export { VirtualManager } from './ble/virtualManager.js';
export { WriteQueue } from './ble/writer.js';
export { GattScheduler } from './ble/scheduler.js';

// ── DFU (deprecated — will be removed in a future version) ──
/** @deprecated DFU 模块将于未来版本移除 */
export { BlePackageProtocol } from './dfu/packageProtocol.js';
/** @deprecated DFU 模块将于未来版本移除 */
export {
  buildControlPayload, buildWriteFlashPayload, buildUnlockPayload,
  alignTo4, parseVersion, parseSnLittleEndian, parsePageSize,
  CTRL_GET_VERSION, CTRL_GET_SN, CTRL_CHECK_IN_DFU, CTRL_ENTER_DFU,
  CTRL_GET_PAGE_SIZE, CTRL_START_UP, CTRL_END_UP, CTRL_RESET, CTRL_OK,
} from './dfu/dfuProtocol.js';
/** @deprecated DFU 模块将于未来版本移除 */
export { calcCrc8, updateCrc8, CRC8_TABLE, CRC8_INIT } from './dfu/crc8.js';
/** @deprecated DFU 模块将于未来版本移除 */
export { DfuManager } from './dfu/dfuManager.js';
/** @deprecated DFU 模块将于未来版本移除 */
export type { DfuLogFn } from './dfu/dfuManager.js';
/** @deprecated DFU 模块将于未来版本移除 */
export type { FirmwareInfo } from './dfu/firmware.js';
/** @deprecated DFU 模块将于未来版本移除 */
export { parseFirmware, matchesDevice, FLASH_OFFSET } from './dfu/firmware.js';

// ── Metrics collector ──
export type { BleMetricsCollector } from './ble/metrics.js';
export { NoOpMetricsCollector } from './ble/metrics.js';
export { DEFAULT_CURVE, PRESETS, randomCurve, DEFAULT_LAYER, LAYER_OFF, DEFAULT_ENVELOPE } from './lib/curvePresets.js';
export { generateWaveSample, generateLayer, synthesizeLayers, applyEnvelope, synthesizeWithEnvelope } from './lib/curvePresets.js';
export type { LayerConfig, EnvelopeConfig, WaveformType } from './lib/curvePresets.js';
