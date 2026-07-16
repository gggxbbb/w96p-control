/**
 * BLE 分包协议
 *
 * 实现 WITRN DFU 分包协议（0x55 帧头 + 密钥加密 + CRC8 校验）。
 * 与官方 APK BlePackageProtocol 完全对齐。
 *
 * @deprecated DFU 模块将于未来版本移除，请勿在新代码中依赖。
 */

import { calcCrc8, CRC8_TABLE, updateCrc8, CRC8_INIT } from './crc8.js';

/** 帧头字节 (0x55) */
export const PACKAGE_HEAD = 0x55;
/** 单帧最大载荷字节数 */
export const PACKAGE_MAX_PAYLOAD = 300;

/** 帧固定开销：HEAD(1) + KEY(1) + LEN(2) + CRC8(1) */
const FRAME_FIXED_OVERHEAD = 5; // HEAD(1) + KEY(1) + LEN(2) + CRC8(1)
/** 接收超时（ms），超出后重置接收状态机 */
const RX_TIMEOUT_MS = 500;

const RxStage = {
  WAIT_HEAD: 0,
  READ_KEY: 1,
  READ_LEN_LOW: 2,
  READ_LEN_HIGH: 3,
  READ_PAYLOAD_AND_CRC: 4,
} as const;
type RxStage = (typeof RxStage)[keyof typeof RxStage];

/**
 * BLE 分包协议处理器
 *
 * 支持帧打包（pack）和接收状态机（onReceive）。
 * 在 debugMode 下 key 固定为 0（不加密）。
 *
 * @deprecated
 */
export class BlePackageProtocol {
  private rxStage: RxStage = RxStage.WAIT_HEAD;
  private rxKey = 0;
  private rxPayloadLength = 0;
  private rxPayloadWriteIndex = 0;
  private rxRunningCrc = CRC8_INIT;
  private rxBuffer: Uint8Array;
  private rxLastByteTimeMs = 0;
  private readonly debugMode: boolean;

  /** @param debugMode - true=不加密（key=0），false=随机加密 */
  constructor(debugMode = true) {
    this.debugMode = debugMode;
    this.rxBuffer = new Uint8Array(PACKAGE_MAX_PAYLOAD + 1); // +1 for CRC byte
    this.reset();
  }

  /**
   * 封包：payload → [0x55, key, len_lo, len_hi, encrypted_payload..., crc]
   * @param payload - 待打包载荷
   * @deprecated
   */
  pack(payload: Uint8Array): Uint8Array {
    if (payload.length < 1 || payload.length > PACKAGE_MAX_PAYLOAD) {
      throw new Error(`payload length ${payload.length} out of range [1, ${PACKAGE_MAX_PAYLOAD}]`);
    }

    const key = this.selectTxKey();
    const totalLen = payload.length + FRAME_FIXED_OVERHEAD;
    const frame = new Uint8Array(totalLen);

    frame[0] = PACKAGE_HEAD;
    frame[1] = key & 0xff;
    frame[2] = payload.length & 0xff;          // len low (little-endian)
    frame[3] = (payload.length >>> 8) & 0xff;  // len high
    frame.set(payload, 4);

    // CRC over HEAD + KEY + decrypted LEN + decrypted PAYLOAD
    const crc = calcCrc8(frame, 0, payload.length + 4);
    frame[totalLen - 1] = crc & 0xff;

    // Encrypt body (offset 2 onward)
    this.encryptBody(frame, key);

    return frame;
  }

  /**
   * 接收字节流，返回解析完整的 payload 列表
   * @param data - 原始 GATT 通知数据
   * @deprecated
   */
  onReceive(data: Uint8Array): Uint8Array[] {
    if (data.length === 0) return [];

    this.checkRxTimeout();
    const results: Uint8Array[] = [];

    for (const raw of data) {
      this.consume(raw & 0xff, results);
    }

    if (this.rxStage !== RxStage.WAIT_HEAD) {
      this.rxLastByteTimeMs = performance.now();
    }

    return results;
  }

  /** 重置接收状态机 */
  reset(): void {
    this.rxStage = RxStage.WAIT_HEAD;
    this.rxKey = 0;
    this.rxPayloadLength = 0;
    this.rxPayloadWriteIndex = 0;
    this.rxRunningCrc = CRC8_INIT;
    this.rxLastByteTimeMs = 0;
  }

  // ── private ──

  private selectTxKey(): number {
    if (this.debugMode) return 0;
    const key = Math.floor(performance.now()) & 0xff;
    return key === 0 ? 1 : key;
  }

  private encryptBody(frame: Uint8Array, key: number): void {
    const xorMask = CRC8_TABLE[key & 0xff]!;
    for (let i = 2; i < frame.length; i++) {
      frame[i] ^= xorMask;
    }
  }

  private consume(byte: number, results: Uint8Array[]): void {
    switch (this.rxStage) {
      case RxStage.WAIT_HEAD:
        if (byte === PACKAGE_HEAD) {
          this.rxStage = RxStage.READ_KEY;
          this.rxKey = 0;
          this.rxPayloadLength = 0;
          this.rxPayloadWriteIndex = 0;
          this.rxRunningCrc = CRC8_INIT;
          this.rxRunningCrc = updateCrc8(this.rxRunningCrc, PACKAGE_HEAD);
          this.rxLastByteTimeMs = performance.now();
        }
        break;

      case RxStage.READ_KEY:
        this.rxKey = byte;
        this.rxRunningCrc = updateCrc8(this.rxRunningCrc, byte);
        this.rxStage = RxStage.READ_LEN_LOW;
        break;

      case RxStage.READ_LEN_LOW: {
        const decoded = this.decode(byte);
        this.rxPayloadLength = decoded;
        this.rxRunningCrc = updateCrc8(this.rxRunningCrc, decoded);
        this.rxStage = RxStage.READ_LEN_HIGH;
        break;
      }

      case RxStage.READ_LEN_HIGH: {
        const decoded = this.decode(byte);
        this.rxPayloadLength |= decoded << 8;
        this.rxRunningCrc = updateCrc8(this.rxRunningCrc, decoded);

        if (this.rxPayloadLength < 1 || this.rxPayloadLength > PACKAGE_MAX_PAYLOAD) {
          this.reset();
          return;
        }
        this.rxPayloadWriteIndex = 0;
        this.rxStage = RxStage.READ_PAYLOAD_AND_CRC;
        break;
      }

      case RxStage.READ_PAYLOAD_AND_CRC: {
        const decoded = this.decode(byte);
        if (this.rxPayloadWriteIndex < 0 || this.rxPayloadWriteIndex > PACKAGE_MAX_PAYLOAD) {
          this.reset();
          return;
        }

        this.rxBuffer[this.rxPayloadWriteIndex] = decoded;

        if (this.rxPayloadWriteIndex < this.rxPayloadLength) {
          this.rxRunningCrc = updateCrc8(this.rxRunningCrc, decoded);
        }

        this.rxPayloadWriteIndex++;

        // Finished: payload + 1 CRC byte received
        if (this.rxPayloadWriteIndex === this.rxPayloadLength + 1) {
          const receivedCrc = decoded;
          if (this.rxRunningCrc === receivedCrc) {
            results.push(this.rxBuffer.slice(0, this.rxPayloadLength));
          }
          this.reset();
        }
        break;
      }
    }
  }

  private decode(byte: number): number {
    return (byte ^ CRC8_TABLE[this.rxKey & 0xff]!) & 0xff;
  }

  private checkRxTimeout(): void {
    if (
      this.rxStage !== RxStage.WAIT_HEAD &&
      performance.now() - this.rxLastByteTimeMs > RX_TIMEOUT_MS
    ) {
      this.reset();
    }
  }
}
