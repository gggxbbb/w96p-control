/**
 * DFU 控制命令与数据载荷构造
 *
 * 从官方 APK BleDfuProtocol 提取的控制命令常量。
 * 命令为单字节，bit7 表示是否需 ACK。
 * 数据载荷首字节表示数据类型。
 *
 * @deprecated DFU 模块将于未来版本移除，请勿在新代码中依赖。
 */

/** 错误应答 (0x01) */
export const CTRL_NG = 0x01;
/** 正确应答 (0x02) */
export const CTRL_OK = 0x02;
/** 进入 DFU 模式 (0x04) */
export const CTRL_ENTER_DFU = 0x04;
/** 检查是否在 DFU 模式 (0x05) */
export const CTRL_CHECK_IN_DFU = 0x05;
/** 开始升级 (0x07) */
export const CTRL_START_UP = 0x07;
/** 结束升级 (0x08) */
export const CTRL_END_UP = 0x08;
/** 获取固件版本 (0x0a) */
export const CTRL_GET_VERSION = 0x0a;
/** 复位设备 (0x0b) */
export const CTRL_RESET = 0x0b;
/** 获取 Flash 页大小 (0x0c) */
export const CTRL_GET_PAGE_SIZE = 0x0c;
/** 获取序列号 (0x0f) */
export const CTRL_GET_SN = 0x0f;

/** 数据载荷类型——请求解锁 (1) */
export const DATA_REQ_UNLOCK = 1;
/** 数据载荷类型——写入 Flash (2) */
export const DATA_WRITE_FLASH = 2;
/** 数据载荷类型——版本信息 (4) */
export const DATA_VERSION = 4;
/** 数据载荷类型——页大小 (5) */
export const DATA_PAGE_SIZE = 5;
/** 数据载荷类型——序列号 (10) */
export const DATA_SN = 10;

/**
 * 构建控制命令载荷（单字节）
 * @param command - 控制命令
 * @param needAck - bit7 ACK 标志
 * @deprecated
 */
export function buildControlPayload(command: number, needAck = false): Uint8Array {
  const ctrl = needAck ? (command | 0x80) : command;
  return new Uint8Array([ctrl & 0xff]);
}

/**
 * 解析控制响应——如果 payload 首字节是控制命令则返回命令值，否则返回 -1
 * @deprecated
 */
export function parseCommand(payload: Uint8Array): number {
  if (payload.length === 0) return -1;
  const ctrl = payload[0]! & 0xff;
  if (ctrl === CTRL_OK || ctrl === CTRL_NG) return ctrl;
  if (
    ctrl === CTRL_ENTER_DFU
    || ctrl === CTRL_CHECK_IN_DFU
    || ctrl === CTRL_START_UP
    || ctrl === CTRL_END_UP
    || ctrl === CTRL_RESET
  )
    return ctrl;
  return -1;
}

/**
 * 判断是否是数据载荷
 * @deprecated
 */
export function isDataPayload(payload: Uint8Array): boolean {
  if (payload.length < 2) return false;
  const type = (payload[0]! & 0xff) & 0x7f;
  return (
    type === DATA_VERSION
    || type === DATA_SN
    || type === DATA_PAGE_SIZE
    || type === DATA_WRITE_FLASH
    || type === DATA_REQ_UNLOCK
  );
}

/**
 * 构建 Flash 写入数据载荷
 * @param data - Flash 数据块
 * @deprecated
 */
export function buildWriteFlashPayload(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + 1);
  result[0] = DATA_WRITE_FLASH | 0x80;
  result.set(data, 1);
  return result;
}

/**
 * 构建解锁请求载荷（96 字节固件头部数据）
 * @param unlockData - 固件前 96 字节
 * @deprecated
 */
export function buildUnlockPayload(unlockData: Uint8Array): Uint8Array {
  const result = new Uint8Array(unlockData.length + 1);
  result[0] = DATA_REQ_UNLOCK | 0x80;
  result.set(unlockData, 1);
  return result;
}

/**
 * 对齐到 4 字节边界（对齐 APK alignTo4）
 * @deprecated
 */
export function alignTo4(n: number): number {
  if (n <= 0) return 0;
  const rem = n % 4;
  return rem === 0 ? n : n + (4 - rem);
}

/**
 * 从 DATA_VERSION 载荷中提取版本号
 *
 * 格式：payload[1] 为版本标记（major*10 + minor），如 0x0c → "1.2"
 *
 * @deprecated
 */
export function parseVersion(payload: Uint8Array): string {
  if (payload.length < 2 || ((payload[0]! & 0xff) & 0x7f) !== DATA_VERSION) return 'unknown';
  const marker = payload[1]! & 0xff;
  if (marker === 0) return 'unknown';
  const major = Math.floor(marker / 10);
  const minor = marker % 10;
  return `${major}.${minor}`;
}

/**
 * 从 DATA_SN 载荷中提取序列号（payload[1..4] little-endian）
 * @deprecated
 */
export function parseSnLittleEndian(payload: Uint8Array): number {
  if (payload.length < 5 || ((payload[0]! & 0xff) & 0x7f) !== DATA_SN) return -1;
  return (
    (payload[1]! & 0xff)
    | ((payload[2]! & 0xff) << 8)
    | ((payload[3]! & 0xff) << 16)
    | ((payload[4]! & 0xff) << 24)
  );
}

/**
 * 从 DATA_PAGE_SIZE 载荷中提取页大小（payload[1..2] little-endian）
 * @deprecated
 */
export function parsePageSize(payload: Uint8Array): number {
  if (payload.length < 3 || ((payload[0]! & 0xff) & 0x7f) !== DATA_PAGE_SIZE) return -1;
  return (payload[1]! & 0xff) | ((payload[2]! & 0xff) << 8);
}
