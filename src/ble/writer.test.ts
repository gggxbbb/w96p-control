import { describe, it, expect, vi } from 'vitest';
import { WriteQueue } from './writer';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function mockChar(extra?: Partial<BluetoothRemoteGATTCharacteristic>) {
  return {
    writeValue: vi.fn().mockResolvedValue(undefined),
    writeValueWithoutResponse: vi.fn().mockResolvedValue(undefined),
    readValue: vi.fn().mockResolvedValue(new DataView(new Uint8Array([0]).buffer)),
    properties: { write: true, writeWithoutResponse: true, read: true },
    ...extra,
  } as unknown as BluetoothRemoteGATTCharacteristic;
}

describe('WriteQueue', () => {
  it('串行化两个写入任务', async () => {
    const q = new WriteQueue();
    const order: string[] = [];
    await Promise.all([
      q.enqueue(async () => { order.push('t1-start'); await sleep(10); order.push('t1-end'); }),
      q.enqueue(async () => { order.push('t2-start'); order.push('t2-end'); }),
    ]);
    expect(order).toEqual(['t1-start', 't1-end', 't2-start', 't2-end']);
  });

  it('writeFanSpeed 自然风开启时先关自然风', async () => {
    const q = new WriteQueue();
    const natureChar = mockChar();
    const speedChar = mockChar();
    q.setNatureWindChar(natureChar);
    q.setNatureWindOn(true);
    await q.writeFanSpeed(speedChar, 75);
    expect(natureChar.writeValueWithoutResponse).toHaveBeenCalledWith(new Uint8Array([0]));
    expect(speedChar.writeValueWithoutResponse).toHaveBeenCalledWith(new Uint8Array([75]));
  });

  it('writeFanSpeed 自然风关闭时直接写转速', async () => {
    const q = new WriteQueue();
    const natureChar = mockChar();
    const speedChar = mockChar();
    q.setNatureWindChar(natureChar);
    q.setNatureWindOn(false);
    await q.writeFanSpeed(speedChar, 50);
    expect(natureChar.writeValueWithoutResponse).not.toHaveBeenCalled();
    expect(speedChar.writeValueWithoutResponse).toHaveBeenCalledWith(new Uint8Array([50]));
  });

  it('writeRegisterBit 读-改-写不覆盖其他位', async () => {
    const q = new WriteQueue();
    const regChar = mockChar({
      readValue: vi.fn().mockResolvedValue(new DataView(new Uint8Array([0b00010100]).buffer)),
    });
    q.setRegChar(regChar);
    await q.writeRegisterBit('1C', 0, true);  // 设 bit0 → 0b00010101 = 21
    expect(regChar.writeValueWithoutResponse).toHaveBeenCalledTimes(1);
    const written = (regChar.writeValueWithoutResponse as ReturnType<typeof vi.fn>).mock.calls[0][0] as Uint8Array;
    // ASCII 'POW_1C=21,' 编码后第一字节是 'P' = 80
    expect(written[0]).toBe(80);  // 'P'
  });

  it('writeRegisterBit 清除位', async () => {
    const q = new WriteQueue();
    const regChar = mockChar({
      readValue: vi.fn().mockResolvedValue(new DataView(new Uint8Array([0b00010101]).buffer)),
    });
    q.setRegChar(regChar);
    await q.writeRegisterBit('1C', 0, false);  // 清 bit0 → 0b00010100 = 20
    expect(regChar.writeValueWithoutResponse).toHaveBeenCalled();
  });

  it('rawWrite 重试 3 次后失败抛出', async () => {
    const q = new WriteQueue();
    const char = mockChar({
      writeValueWithoutResponse: vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockRejectedValueOnce(new Error('fail3')),
      properties: { write: true, writeWithoutResponse: true, read: false },
    });
    await expect(q.rawWrite(char, new Uint8Array([1]), 3)).rejects.toThrow('fail3');
    expect(char.writeValueWithoutResponse).toHaveBeenCalledTimes(3);
  });

  it('rawWrite 失败后重试成功', async () => {
    const q = new WriteQueue();
    const char = mockChar({
      writeValueWithoutResponse: vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockResolvedValueOnce(undefined),
      properties: { write: true, writeWithoutResponse: true, read: false },
    });
    await q.rawWrite(char, new Uint8Array([1]), 3);
    expect(char.writeValueWithoutResponse).toHaveBeenCalledTimes(2);
  });
});
