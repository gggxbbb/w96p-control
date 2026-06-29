import { describe, it, expect } from 'vitest';
import {
  buildControlPayload,
  parseCommand,
  isDataPayload,
  parseVersion,
  parseSnLittleEndian,
  parsePageSize,
  CTRL_OK,
  CTRL_GET_VERSION,
  DATA_VERSION,
  DATA_SN,
  DATA_PAGE_SIZE,
} from './dfuProtocol';

describe('dfuProtocol', () => {
  it('buildControlPayload without ack', () => {
    const ctrl = buildControlPayload(CTRL_GET_VERSION);
    expect(ctrl).toEqual(new Uint8Array([0x0a]));
  });

  it('buildControlPayload with ack sets bit7', () => {
    const ctrl = buildControlPayload(CTRL_GET_VERSION, true);
    expect(ctrl[0]! & 0x80).toBe(0x80);
    expect(ctrl[0]! & 0x7f).toBe(CTRL_GET_VERSION);
  });

  it('parseCommand recognizes OK', () => {
    expect(parseCommand(new Uint8Array([CTRL_OK]))).toBe(CTRL_OK);
  });

  it('parseCommand returns -1 for data payload', () => {
    // DATA_SN (10) is not a control command, unlike DATA_VERSION (4) which overlaps with CTRL_ENTER_DFU
    const data = new Uint8Array([DATA_SN, 0x78, 0x56, 0x34, 0x12]);
    expect(parseCommand(data)).toBe(-1);
  });

  it('isDataPayload detects version payload', () => {
    const data = new Uint8Array([DATA_VERSION, 0x31, 0x32, 0x33, 0x34]);
    expect(isDataPayload(data)).toBe(true);
  });

  it('parseVersion extracts version marker (single byte)', () => {
    const data = new Uint8Array([DATA_VERSION, 0x0c]); // marker=12 → "1.2"
    expect(parseVersion(data)).toBe('1.2');
  });

  it('parseVersion extracts version marker (V2.0)', () => {
    const data = new Uint8Array([DATA_VERSION, 0x14]); // marker=20 → "2.0"
    expect(parseVersion(data)).toBe('2.0');
  });

  it('parseSnLittleEndian extracts serial number', () => {
    const data = new Uint8Array([DATA_SN, 0x78, 0x56, 0x34, 0x12]);
    expect(parseSnLittleEndian(data)).toBe(0x12345678);
  });

  it('parsePageSize extracts page size', () => {
    const data = new Uint8Array([DATA_PAGE_SIZE, 0x00, 0x01]); // 256
    expect(parsePageSize(data)).toBe(256);
  });
});
