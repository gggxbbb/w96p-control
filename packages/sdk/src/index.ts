/**
 * w96p-ble-sdk — W96P/W66D BLE 风扇协议 SDK
 *
 * @module
 */

// ── Types ──
export type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './ble/parsers';
export type { BleState, BleSnapshot, IBleManager } from './ble/types';
export type { PowReg } from './ble/commands';
export type { PowSwitchDef, PowSegDef } from './ble/powSwitches';
export type { OpRecord, SchedulerSnapshot } from './stores/bleMetrics';
export type { DeviceState } from './stores/device';

// ── GATT UUIDs ──
export { SERVICES, CHARS, OPTIONAL_CHARS, ALL_OPTIONAL_SERVICES, MAIN_SERVICE, DFU_SERVICE, DFU_WRITE, DFU_NOTIFY } from './ble/uuids';

// ── Commands ──
export { cmd, encodeCmd } from './ble/commands';

// ── Parsers ──
export { parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig } from './ble/parsers';

// ── Features ──
export { compareVersion, getFeatures, FEATURE_BASE, FEATURE_DELTAS } from './ble/features';
export type { FeatureDelta } from './ble/features';

// ── Profiles ──
export { isCompatModel, defaultSpeeds, SPEED_RANGE, DEFAULT_SPEEDS_FULL, DEFAULT_SPEEDS_COMPAT } from './ble/profiles';

// ── Power Switches ──
export { POW_SWITCHES, POW_SEGS, REG_TITLES } from './ble/powSwitches';

// ── BLE Infrastructure ──
export { BleManager } from './ble/manager';
export { VirtualManager } from './ble/virtualManager';
export { WriteQueue } from './ble/writer';
export { GattScheduler } from './ble/scheduler';

// ── DFU (deprecated — will be removed in a future version) ──
/** @deprecated DFU 模块将于未来版本移除 */
export { BlePackageProtocol } from './dfu/packageProtocol';
/** @deprecated DFU 模块将于未来版本移除 */
export {
  buildControlPayload, buildWriteFlashPayload, buildUnlockPayload,
  alignTo4, parseVersion, parseSnLittleEndian, parsePageSize,
  CTRL_GET_VERSION, CTRL_GET_SN, CTRL_CHECK_IN_DFU, CTRL_ENTER_DFU,
  CTRL_GET_PAGE_SIZE, CTRL_START_UP, CTRL_END_UP, CTRL_RESET, CTRL_OK,
} from './dfu/dfuProtocol';
/** @deprecated DFU 模块将于未来版本移除 */
export { calcCrc8, updateCrc8, CRC8_TABLE, CRC8_INIT } from './dfu/crc8';
/** @deprecated DFU 模块将于未来版本移除 */
export { DfuManager } from './dfu/dfuManager';
/** @deprecated DFU 模块将于未来版本移除 */
export type { DfuLogFn } from './dfu/dfuManager';
/** @deprecated DFU 模块将于未来版本移除 */
export type { FirmwareInfo } from './dfu/firmware';
/** @deprecated DFU 模块将于未来版本移除 */
export { parseFirmware, matchesDevice, FLASH_OFFSET } from './dfu/firmware';

// ── Stores ──
export { useBleMetrics, BUCKETS } from './stores/bleMetrics';
export { useDeviceStore } from './stores/device';

// ── Curve Presets ──
export { DEFAULT_CURVE, PRESETS, randomCurve, DEFAULT_LAYER, LAYER_OFF, DEFAULT_ENVELOPE } from './lib/curvePresets';
export { generateWaveSample, generateLayer, synthesizeLayers, applyEnvelope, synthesizeWithEnvelope } from './lib/curvePresets';
export type { LayerConfig, EnvelopeConfig, WaveformType } from './lib/curvePresets';
