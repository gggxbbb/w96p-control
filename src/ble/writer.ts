import type { PowReg } from './commands';
import { cmd, encodeCmd } from './commands';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class WriteQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private natureWindOn = false;
  private _natureChar: BluetoothRemoteGATTCharacteristic | null = null;
  private regChar: BluetoothRemoteGATTCharacteristic | null = null;

  get natureChar(): BluetoothRemoteGATTCharacteristic | null {
    return this._natureChar;
  }

  isNatureWindOn(): boolean {
    return this.natureWindOn;
  }

  setNatureWindChar(c: BluetoothRemoteGATTCharacteristic) {
    this._natureChar = c;
  }
  setRegChar(c: BluetoothRemoteGATTCharacteristic) {
    this.regChar = c;
  }
  setNatureWindOn(on: boolean) {
    this.natureWindOn = on;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task, task);
    this.chain = run.then(() => undefined, () => undefined);
    return run as Promise<T>;
  }

  async rawWrite(
    char: BluetoothRemoteGATTCharacteristic,
    data: Uint8Array,
    retries = 3,
  ): Promise<void> {
    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const charId = char.uuid.slice(4, 8);
    for (let i = 0; i < retries; i++) {
      try {
        console.log('[BLE] 写入 ' + charId + ' (' + data.length + 'B): ' + hex);
        if (char.properties.writeWithoutResponse) {
          await char.writeValueWithoutResponse(data as BufferSource);
        } else {
          await char.writeValue(data as BufferSource);
        }
        return;
      } catch (e) {
        if (i === retries - 1) {
          console.log('[BLE] rawWrite 最终失败（已重试' + retries + '次）:', e);
          throw e;
        }
        await sleep(200);
      }
    }
  }

  async writeFanSpeed(
    char: BluetoothRemoteGATTCharacteristic,
    pct: number,
  ): Promise<void> {
    await this.enqueue(async () => {
      if (this.natureWindOn && this._natureChar) {
        await this.rawWrite(this._natureChar, new Uint8Array([0]));
        await sleep(100);
        this.natureWindOn = false;
      }
      await this.rawWrite(char, new Uint8Array([pct]));
    });
  }

  async writeRegisterBit(
    reg: PowReg,
    bit: number,
    value: boolean,
  ): Promise<void> {
    if (!this.regChar) throw new Error('regChar 未设置');
    await this.enqueue(async () => {
      const curBuf = await this.regChar!.readValue();
      const cur = new DataView(curBuf.buffer).getUint8(0);
      const mask = 1 << bit;
      const next = value ? (cur | mask) : (cur & ~mask);
      await this.rawWrite(this.regChar!, encodeCmd(cmd.setRegister(reg, next)));
    });
  }
}
