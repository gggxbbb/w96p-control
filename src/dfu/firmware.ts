export interface FirmwareInfo {
  /** 产品名（如 "W96P"、"W66D"） */
  productName: string;
  /** 固件版本（如 "V1.1"） */
  version: string;
  /** 完整固件文件原始数据（含头部，对齐 APK binData） */
  rawData: Uint8Array;
  /** 原始文件总大小 */
  fileSize: number;
}

/** Flash 写入起始偏移：前 96 字节用于解锁，从字节 96 开始闪写（对齐 APK DFU_UNLOCK_BYTES） */
export const FLASH_OFFSET = 96;

const PRODUCT_NAME_SEARCH_RANGE = 64;
const PRODUCT_NAME_MAX_LENGTH = 17;
const VERSION_OFFSET = 0x4d; // 77

const KNOWN_PRODUCTS = ['W96P', 'W66D'];

/**
 * 解析 .up 固件文件
 * 策略：在前 64 字节搜索 "W96P" 或 "W66D" 定位产品名，从偏移 0x4D 读取版本
 */
export function parseFirmware(buffer: ArrayBuffer): FirmwareInfo | null {
  const data = new Uint8Array(buffer);
  if (data.length < FLASH_OFFSET) return null;

  // 搜索产品名
  let productName = '';

  for (let i = 0; i < Math.min(PRODUCT_NAME_SEARCH_RANGE, data.length - 4); i++) {
    const slice = String.fromCharCode(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!);
    if (KNOWN_PRODUCTS.includes(slice)) {
      // 找到产品名，提取最多 17 个可打印字符
      let end = i + 4;
      while (end < data.length && end - i < PRODUCT_NAME_MAX_LENGTH && isAscii(data[end]!)) {
        end++;
      }
      productName = String.fromCharCode(...data.slice(i, end));
      break;
    }
  }

  if (!productName) return null;

  // 读取版本（从偏移 0x4D）
  let version = 'unknown';
  if (VERSION_OFFSET < data.length - 10) {
    let end = VERSION_OFFSET;
    while (end < data.length && end - VERSION_OFFSET < 16 && isAscii(data[end]!)) {
      end++;
    }
    if (end > VERSION_OFFSET) {
      version = String.fromCharCode(...data.slice(VERSION_OFFSET, end));
    }
  }

  // 保存完整固件数据（不裁剪头部，对齐 APK binData 行为）
  // Flash 写入从 FLASH_OFFSET(96) 开始，前 96 字节作为解锁数据

  return {
    productName,
    version,
    rawData: data,
    fileSize: data.length,
  };
}

function isAscii(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e;
}

/** 检查固件是否与设备匹配 */
export function matchesDevice(firmware: FirmwareInfo, deviceProductName: string): boolean {
  return firmware.productName === deviceProductName;
}

/** 比较版本号，返回 1（新 > 旧）、0（相等）、-1（旧 < 新） */
export function compareVersion(current: string, candidate: string): number {
  const parse = (v: string): number[] => {
    const m = v.match(/(\d+)\.(\d+)/);
    if (!m) return [0, 0];
    return [parseInt(m[1]!), parseInt(m[2]!)];
  };
  const [ca, cb] = parse(current);
  const [oa, ob] = parse(candidate);
  if (oa !== ca) return oa > ca ? 1 : -1;
  if (ob !== cb) return ob > cb ? 1 : -1;
  return 0;
}
