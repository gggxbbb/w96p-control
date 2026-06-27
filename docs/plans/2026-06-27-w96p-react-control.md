# W96P React 控制网站 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 W96P 蓝牙风扇的 3 个单文件 HTML 控制程序重构为结构化 React 项目，工业风深色 UI，支持 W96P/W66D 双 profile，PWA 离线。

**Architecture:** Vite + React 18 + TS + Tailwind v4。协议层（`src/ble/`）纯 TS 零 React 依赖可单测；状态层 3 个 Zustand store；UI 层通过 `useBle()` hook 与协议层交互。单设备连接，1s 轮询。

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Tailwind CSS v4, Zustand, React Router v6, Recharts, vite-plugin-pwa, Vitest, MiSans 字体

**协议参考:** `../W96P_蓝牙协议文档.md`、`../W96P_vs_W66D_协议兼容性分析.md`

---

## Task 1: 项目初始化与依赖

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`（可选）, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.eslintrc.cjs`

**Step 1: 用 Vite 脚手架初始化**

```bash
cd "C:\Users\gameg\Desktop\Dev\W96Pro内测\w96p-control"
pnpm create vite@latest . --template react-ts
```

如果目录非空（已有 docs/），选择忽略现有文件或先移到临时位置再恢复。

**Step 2: 安装依赖**

```bash
pnpm add zustand react-router-dom recharts
pnpm add -D tailwindcss@next @tailwindcss/vite vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: 配置 Tailwind v4**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'W96P 控制',
        short_name: 'W96P',
        display: 'standalone',
        background_color: '#1A1A18',
        theme_color: '#1A1A18',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    }),
  ],
  server: { https: true },  // Web Bluetooth 需要 HTTPS 或 localhost
})
```

`src/styles.css`:
```css
@import "tailwindcss";

@theme {
  --font-sans: 'MiSans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'MiSans', ui-monospace, monospace;

  --color-bg-page: #1A1A18;
  --color-bg-surface: #2C2C2A;
  --color-bg-inset: #232320;
  --color-border: #444441;
  --color-border-strong: #5F5E5A;
  --color-text: #E8E7E2;
  --color-text-muted: #888780;
  --color-text-dim: #5F5E5A;
  --color-accent: #378ADD;
  --color-success: #1D9E75;
  --color-warning: #BA7517;
  --color-danger: #E24B4A;
}

:root[data-theme="light"] {
  --color-bg-page: #F1EFE8;
  --color-bg-surface: #FFFFFF;
  --color-bg-inset: #F7F2FA;
  --color-border: #D3D1C7;
  --color-border-strong: #B4B2A9;
  --color-text: #2C2C2A;
  --color-text-muted: #5F5E5A;
  --color-text-dim: #888780;
  --color-accent: #185FA5;
  --color-success: #0F6E56;
  --color-warning: #854F0B;
  --color-danger: #A32D2D;
}
```

**Step 4: 放置 MiSans 字体**

下载 MiSans-Regular.woff2 和 MiSans-Medium.woff2 到 `public/fonts/`。
在 `src/styles.css` 顶部加 `@font-face`（见设计文档第 5.3 节）。

**Step 5: 配置 tsconfig strict**

`tsconfig.json` 的 `compilerOptions` 确保：
```json
{ "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true, "forceConsistentCasingInFileNames": true }
```

**Step 6: 配置 Web Bluetooth 类型**

```bash
pnpm add -D @types/web-bluetooth
```

在 `tsconfig.json` 的 `types` 加入 `"web-bluetooth"`。

**Step 7: 验证骨架可跑**

```bash
pnpm dev
```
浏览器打开 https://localhost:5173，看到默认 React 页面。

**Step 8: 初始提交**

```bash
git add -A
git commit -m "chore: 初始化 Vite + React + TS + Tailwind v4 项目骨架"
```

---

## Task 2: 协议层 — UUID 常量

**Files:**
- Create: `src/ble/uuids.ts`

**Step 1: 写 UUID 常量**

```ts
export const SERVICES = {
  MAIN: '0000fff0-0000-1000-8000-00805f9b34fb',
  POWER: '0000ffd0-0000-1000-8000-00805f9b34fb',
  NATURE: '0000ffe0-0000-1000-8000-00805f9b34fb',
} as const;

export const CHARS = {
  POWER: '0000fff1-0000-1000-8000-00805f9b34fb',
  TIMER: '0000fff2-0000-1000-8000-00805f9b34fb',
  FAN_SPEED: '0000fff3-0000-1000-8000-00805f9b34fb',
  NATURE_WIND: '0000fff4-0000-1000-8000-00805f9b34fb',
  SHUTDOWN_DELAY: '0000fff5-0000-1000-8000-00805f9b34fb',
  GEAR_DOWN_MODE: '0000fff6-0000-1000-8000-00805f9b34fb',
  SPEED_CALIB: '0000fff7-0000-1000-8000-00805f9b34fb',
  BATTERY_INFO: '0000ffd1-0000-1000-8000-00805f9b34fb',
  POWER_STATUS: '0000ffd2-0000-1000-8000-00805f9b34fb',
  MOTOR_INFO: '0000ffd3-0000-1000-8000-00805f9b34fb',
  POWER_CONFIG: '0000ffd4-0000-1000-8000-00805f9b34fb',
  NATURE_CURVE: '0000ffe3-0000-1000-8000-00805f9b34fb',
} as const;

export const ALL_OPTIONAL_SERVICES = Object.values(SERVICES);
```

**Step 2: 提交**

```bash
git add src/ble/uuids.ts
git commit -m "feat(ble): 添加 GATT 服务与特征 UUID 常量"
```

---

## Task 3: 协议层 — Parsers（TDD）

**Files:**
- Create: `src/ble/parsers.ts`
- Test: `src/ble/parsers.test.ts`

**Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { parseBatteryInfo, parsePowerStatus, parseMotorInfo } from './parsers';
import { PROFILES } from './profiles';  // 下一步创建，先注释或 mock

function dv(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseBatteryInfo', () => {
  it('解析 8 字节电池数据', () => {
    // 电压 3700mV, 电流 -500mA, 容量 18000mWh
    const result = parseBatteryInfo(dv([0x0E, 0x74, 0xFE, 0x0C, 0x00, 0x00, 0x46, 0x50]));
    expect(result.voltageMv).toBe(3700);
    expect(result.currentMa).toBe(-500);
    expect(result.capacityMwh).toBe(18000);
  });

  it('长度不足时降级返回零值', () => {
    const result = parseBatteryInfo(dv([0x0E, 0x74]));
    expect(result.voltageMv).toBe(3700);
    expect(result.currentMa).toBe(0);
    expect(result.capacityMwh).toBe(0);
  });
});

describe('parsePowerStatus', () => {
  it('解析 11 字节电源状态', () => {
    // VBUS 5000mV, 电流 1000mA, powC=1, powSta=1, powCOut=0, powCIn=0
    const result = parsePowerStatus(dv([
      0x00, 0x00, 0x13, 0x88,  // VBUS 5000
      0x03, 0xE8,              // 电流 1000
      0x01, 0x01, 0x00, 0x00, 0x00
    ]));
    expect(result.vbusVmV).toBe(5000);
    expect(result.vbusCurMa).toBe(1000);
    expect(result.powC).toBe(1);
    expect(result.powSta).toBe(1);
    expect(result.powCOut).toBe(false);
    expect(result.powCIn).toBe(false);
  });
});

describe('parseMotorInfo', () => {
  it('W96P profile 解析完整（电流+堵转+电压）', () => {
    // 电流 320mA, 堵转=1, 电压 4800mV（5字节）
    const result = parseMotorInfo(dv([0x01, 0x40, 0x01, 0x12, 0xC0]), PROFILES.W96P);
    expect(result.currentMa).toBe(320);
    expect(result.block).toBe(true);
    expect(result.voltageMv).toBe(4800);
  });

  it('W66D profile 仅解析电流', () => {
    const result = parseMotorInfo(dv([0x01, 0x40, 0x01, 0x12, 0xC0]), PROFILES.W66D);
    expect(result.currentMa).toBe(320);
    expect(result.block).toBe(false);
    expect(result.voltageMv).toBe(0);
  });

  it('电机电压超 20000mV 视为脏数据置 0', () => {
    const result = parseMotorInfo(dv([0x01, 0x40, 0x00, 0xFF, 0xFF]), PROFILES.W96P);
    expect(result.voltageMv).toBe(0);
  });
});
```

**Step 2: 运行测试确认失败**

```bash
pnpm vitest run src/ble/parsers.test.ts
```
Expected: FAIL（模块不存在）

**Step 3: 先创建 profiles.ts 最小版**

```ts
export interface Profile {
  name: string;
  defaultSpeeds: readonly [number, number, number, number];
  minSpeed: number;
  maxSpeed: number;
  parseMotorFull: boolean;
  motorPowerUsesMotorVoltage: boolean;
}

export const PROFILES = {
  W96P: {
    name: 'W96P',
    defaultSpeeds: [10, 35, 70, 100] as const,
    minSpeed: 0, maxSpeed: 100,
    parseMotorFull: true,
    motorPowerUsesMotorVoltage: true,
  },
  W66D: {
    name: 'W66D',
    defaultSpeeds: [30, 50, 70, 100] as const,
    minSpeed: 20, maxSpeed: 90,
    parseMotorFull: false,
    motorPowerUsesMotorVoltage: false,
  },
} as const;

export const pickProfile = (deviceName?: string): Profile =>
  (deviceName && PROFILES[deviceName as keyof typeof PROFILES]) ?? PROFILES.W66D;
```

**Step 4: 实现 parsers.ts**

```ts
import type { Profile } from './profiles';

export interface BatteryInfo {
  voltageMv: number; currentMa: number; capacityMwh: number;
}
export interface PowerStatus {
  vbusVmV: number; vbusCurMa: number;
  powC: number; powSta: number;
  powCOut: boolean; powCIn: boolean; powCHi: number;
}
export interface MotorInfo {
  currentMa: number; block: boolean; voltageMv: number;
}
export interface PowerConfigRegs {
  powVer: number; powSink: number; powSrc: number;
  pow1A: number; pow1C: number; pow1D: number; pow1E: number;
  pow2A: number; pow2B: number; pow2C: number;
}

const readU16BE = (dv: DataView, off: number): number =>
  dv.byteLength >= off + 2 ? dv.getUint16(off, false) : 0;
const readI16BE = (dv: DataView, off: number): number =>
  dv.byteLength >= off + 2 ? dv.getInt16(off, false) : 0;
const readU32BE = (dv: DataView, off: number): number =>
  dv.byteLength >= off + 4 ? dv.getUint32(off, false) : 0;

export const parseBatteryInfo = (dv: DataView): BatteryInfo => ({
  voltageMv: readU16BE(dv, 0),
  currentMa: readI16BE(dv, 2),
  capacityMwh: readU32BE(dv, 4),
});

export const parsePowerStatus = (dv: DataView): PowerStatus => ({
  vbusVmV: readU32BE(dv, 0),
  vbusCurMa: readI16BE(dv, 4),
  powC: dv.byteLength > 6 ? dv.getUint8(6) : 0,
  powSta: dv.byteLength > 7 ? dv.getUint8(7) : 0,
  powCOut: dv.byteLength > 8 ? dv.getUint8(8) === 0 : false,  // 0=使能
  powCIn: dv.byteLength > 9 ? dv.getUint8(9) === 0 : false,
  powCHi: dv.byteLength > 10 ? dv.getUint8(10) : 0,
});

export const parseMotorInfo = (dv: DataView, profile: Profile): MotorInfo => {
  const currentMa = readU16BE(dv, 0);
  if (!profile.parseMotorFull) {
    return { currentMa, block: false, voltageMv: 0 };
  }
  const block = (dv.getUint8(2) & 0xF7) === 1;
  const voltageMv = dv.byteLength >= 2 ? readU16BE(dv, dv.byteLength - 2) : 0;
  return {
    currentMa,
    block,
    voltageMv: voltageMv > 20000 ? 0 : voltageMv,  // 脏数据置 0
  };
};

export const parsePowerConfig = (dv: DataView): PowerConfigRegs => ({
  powVer: dv.byteLength > 1 ? dv.getUint8(1) : 0,
  powSink: dv.byteLength > 2 ? dv.getUint8(2) : 0,
  powSrc: dv.byteLength > 3 ? dv.getUint8(3) : 0,
  pow1A: dv.byteLength > 6 ? dv.getUint8(6) : 0,
  pow1C: dv.byteLength > 7 ? dv.getUint8(7) : 0,
  pow1D: dv.byteLength > 8 ? dv.getUint8(8) : 0,
  pow1E: dv.byteLength > 9 ? dv.getUint8(9) : 0,
  pow2A: dv.byteLength > 13 ? dv.getUint8(13) : 0,
  pow2B: dv.byteLength > 14 ? dv.getUint8(14) : 0,
  pow2C: dv.byteLength > 15 ? dv.getUint8(15) : 0,
});
```

**Step 5: 运行测试确认通过**

```bash
pnpm vitest run src/ble/parsers.test.ts
```
Expected: PASS

**Step 6: 提交**

```bash
git add src/ble/parsers.ts src/ble/parsers.test.ts src/ble/profiles.ts
git commit -m "feat(ble): 添加协议解析器与设备 profile（含单测）"
```

---

## Task 4: 协议层 — Commands 构造器

**Files:**
- Create: `src/ble/commands.ts`
- Test: `src/ble/commands.test.ts`

**Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { cmd, encodeCmd } from './commands';

describe('commands', () => {
  it('setBatteryCapacity 构造正确 ASCII', () => {
    expect(cmd.setBatteryCapacity(18000)).toBe('BAT_CAP=18000,');
  });
  it('setPowCOut 使能时为 0', () => {
    expect(cmd.setPowCOut(true)).toBe('POW_C_OUT=0,');
    expect(cmd.setPowCOut(false)).toBe('POW_C_OUT=1,');
  });
  it('setRegister 构造 POW_xx 命令', () => {
    expect(cmd.setRegister('1A', 0x1C)).toBe('POW_1A=28,');
    expect(cmd.setRegister('2C', 0x40)).toBe('POW_2C=64,');
  });
  it('encodeCmd 转 UTF-8 Uint8Array', () => {
    const bytes = encodeCmd('BAT_CAP=18000,');
    expect(bytes).toEqual(new Uint8Array([
      66,65,84,95,67,65,80,61,49,56,48,48,48,44
    ]));
  });
});
```

**Step 2: 运行确认失败**

**Step 3: 实现 commands.ts**

```ts
export type PowReg = '1A' | '1C' | '1D' | '1E' | '2A' | '2B' | '2C';

export const cmd = {
  setBatteryCapacity: (mwh: number) => `BAT_CAP=${mwh},`,
  setPowCOut: (enable: boolean) => `POW_C_OUT=${enable ? 0 : 1},`,
  setPowCIn: (enable: boolean) => `POW_C_IN=${enable ? 0 : 1},`,
  setRegister: (reg: PowReg, byte: number) => `POW_${reg}=${byte},`,
};

export const encodeCmd = (str: string): Uint8Array =>
  new TextEncoder().encode(str);
```

**Step 4: 运行测试通过**

**Step 5: 提交**

```bash
git add src/ble/commands.ts src/ble/commands.test.ts
git commit -m "feat(ble): 添加 ASCII 命令构造器（含单测）"
```

---

## Task 5: 协议层 — WriteQueue

**Files:**
- Create: `src/ble/writer.ts`
- Test: `src/ble/writer.test.ts`

**Step 1: 写失败测试**

```ts
import { describe, it, expect, vi } from 'vitest';
import { WriteQueue } from './writer';

function mockChar() {
  return {
    writeValue: vi.fn().mockResolvedValue(undefined),
    writeValueWithoutResponse: vi.fn().mockResolvedValue(undefined),
    properties: { write: true, writeWithoutResponse: true },
  };
}

describe('WriteQueue', () => {
  it('串行化两个写入任务', async () => {
    const q = new WriteQueue();
    const order: string[] = [];
    const t1 = q.enqueue(async () => { order.push('t1-start'); await sleep(10); order.push('t1-end'); });
    const t2 = q.enqueue(async () => { order.push('t2-start'); order.push('t2-end'); });
    await Promise.all([t1, t2]);
    expect(order).toEqual(['t1-start', 't1-end', 't2-start', 't2-end']);
  });

  it('writeFanSpeed 自然风开启时先关自然风', async () => {
    const q = new WriteQueue();
    const natureChar = mockChar();
    const speedChar = mockChar();
    q.setNatureWindChar(natureChar as any);
    q.setNatureWindOn(true);
    await q.writeFanSpeed(speedChar as any, 75);
    expect(natureChar.writeValue).toHaveBeenCalledWith(new Uint8Array([0]));
    expect(speedChar.writeValue).toHaveBeenCalledWith(new Uint8Array([75]));
  });

  it('writeRegisterBit 读-改-写不覆盖其他位', async () => {
    const q = new WriteQueue();
    const regChar = mockChar();
    regChar.readValue = vi.fn().mockResolvedValue(new DataView(new Uint8Array([0b00010100]).buffer));
    q.setRegChar(regChar as any);
    await q.writeRegisterBit('1C', 0, true);  // 设 bit0
    // 期望写入 0b00010101 = 21
    expect(regChar.writeValue).toHaveBeenCalledWith(new Uint8Array([21]));
  });
});

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

**Step 2: 运行确认失败**

**Step 3: 实现 writer.ts**

```ts
import type { PowReg } from './commands';
import { cmd, encodeCmd } from './commands';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class WriteQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private natureWindOn = false;
  private natureChar: BluetoothRemoteGATTCharacteristic | null = null;
  private regChar: BluetoothRemoteGATTCharacteristic | null = null;

  setNatureWindChar(c: BluetoothRemoteGATTCharacteristic) { this.natureChar = c; }
  setRegChar(c: BluetoothRemoteGATTCharacteristic) { this.regChar = c; }
  setNatureWindOn(on: boolean) { this.natureWindOn = on; }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task, task);
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  async rawWrite(char: BluetoothRemoteGATTCharacteristic, data: Uint8Array, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        if (char.properties.writeWithoutResponse) {
          await char.writeValueWithoutResponse(data);
        } else {
          await char.writeValue(data);
        }
        return;
      } catch (e) {
        if (i === retries - 1) throw e;
        await sleep(200);
      }
    }
  }

  async writeFanSpeed(char: BluetoothRemoteGATTCharacteristic, pct: number) {
    await this.enqueue(async () => {
      if (this.natureWindOn && this.natureChar) {
        await this.rawWrite(this.natureChar, new Uint8Array([0]));
        await sleep(100);
        this.natureWindOn = false;
      }
      await this.rawWrite(char, new Uint8Array([pct]));
    });
  }

  async writeRegisterBit(reg: PowReg, bit: number, value: boolean) {
    if (!this.regChar) throw new Error('regChar 未设置');
    await this.enqueue(async () => {
      const cur = new DataView((await this.regChar!.readValue()).buffer).getUint8(0);
      const mask = 1 << bit;
      const next = value ? (cur | mask) : (cur & ~mask);
      await this.rawWrite(this.regChar!, encodeCmd(cmd.setRegister(reg, next)));
    });
  }
}
```

**Step 4: 运行测试通过**

**Step 5: 提交**

```bash
git add src/ble/writer.ts src/ble/writer.test.ts
git commit -m "feat(ble): 添加 WriteQueue 串行化写入与位域读改写（含单测）"
```

---

## Task 6: 协议层 — BleManager

**Files:**
- Create: `src/ble/manager.ts`

**Step 1: 实现 BleManager（连接生命周期 + 轮询）**

```ts
import { SERVICES, CHARS, ALL_OPTIONAL_SERVICES } from './uuids';
import { pickProfile, type Profile } from './profiles';
import { parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig } from './parsers';
import { WriteQueue } from './writer';

export type BleState = 'idle' | 'connecting' | 'connected' | 'error';
export interface BleSnapshot {
  fanSpeed?: number; timerRemainingSec?: number; natureWindOn?: boolean;
  shutdownDelaySec?: number; gearDownMode?: 0 | 1;
  speedCalib?: [number, number, number, number];
  natureCurve?: number[];
  battery?: ReturnType<typeof parseBatteryInfo>;
  powerStatus?: ReturnType<typeof parsePowerStatus>;
  motor?: ReturnType<typeof parseMotorInfo>;
  powerConfig?: ReturnType<typeof parsePowerConfig>;
}

export class BleManager {
  private device: BluetoothDevice | null = null;
  private chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private writer = new WriteQueue();
  private pollId: number | null = null;
  profile: Profile | null = null;

  onState?: (s: BleState, deviceName?: string, profile?: Profile) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;

  async connect() {
    this.onState?.('connecting');
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'W' }],
        optionalServices: ALL_OPTIONAL_SERVICES,
      });
      this.device.addEventListener('gattserverdisconnected', () => this.cleanup());
      const gatt = this.device.gatt!;
      await gatt.connect();
      const main = await gatt.getPrimaryService(SERVICES.MAIN);
      const power = await gatt.getPrimaryService(SERVICES.POWER);
      const nature = await gatt.getPrimaryService(SERVICES.NATURE);
      for (const uuid of Object.values(CHARS)) {
        let svc = main;
        if (uuid.startsWith('0000ffd')) svc = power;
        else if (uuid.startsWith('0000ffe')) svc = nature;
        this.chars.set(uuid, await svc.getCharacteristic(uuid));
      }
      this.profile = pickProfile(this.device.name);
      this.writer.setNatureWindChar(this.chars.get(CHARS.NATURE_WIND)!);
      this.writer.setRegChar(this.chars.get(CHARS.POWER_CONFIG)!);
      this.onState?.('connected', this.device.name ?? '未知', this.profile);
      setTimeout(() => this.readInitial(), 1500);
    } catch (e) {
      this.onState?.('error');
      this.onError?.(String(e));
    }
  }

  private async readInitial() {
    // 读 timer/speedCalib/natureWind/gearDown/shutdownDelay
    // ... 见协议文档第 1.2 节
  }

  startPolling(intervalMs: number) {
    if (this.pollId) clearInterval(this.pollId);
    this.pollId = window.setInterval(() => this.pollOnce(), intervalMs);
  }
  stopPolling() { if (this.pollId) { clearInterval(this.pollId); this.pollId = null; } }

  private async pollOnce() {
    if (!this.profile) return;
    try {
      const [speed, bat, pwr, mot, nw, gdm] = await Promise.all([
        this.chars.get(CHARS.FAN_SPEED)!.readValue(),
        this.chars.get(CHARS.BATTERY_INFO)!.readValue(),
        this.chars.get(CHARS.POWER_STATUS)!.readValue(),
        this.chars.get(CHARS.MOTOR_INFO)!.readValue(),
        this.chars.get(CHARS.NATURE_WIND)!.readValue(),
        this.chars.get(CHARS.GEAR_DOWN_MODE)!.readValue(),
      ]);
      this.writer.setNatureWindOn(new DataView(nw.buffer).getUint8(0) === 1);
      this.onSnapshot?.({
        fanSpeed: new DataView(speed.buffer).getUint8(0),
        battery: parseBatteryInfo(new DataView(bat.buffer)),
        powerStatus: parsePowerStatus(new DataView(pwr.buffer)),
        motor: parseMotorInfo(new DataView(mot.buffer), this.profile),
        natureWindOn: new DataView(nw.buffer).getUint8(0) === 1,
        gearDownMode: new DataView(gdm.buffer).getUint8(0) as 0 | 1,
      });
    } catch (e) { this.onError?.(String(e)); }
  }

  // 写入动作委托给 writer，每个方法写成功后 onSnapshot 回传新值
  async writeGear(gear: 0|1|2|3|4) { /* ... */ }
  async writeFanSpeed(pct: number) { /* ... */ }
  async writeNatureWind(on: boolean) { /* ... */ }
  async writeTimer(minutes: number) { /* ... */ }
  async writeShutdownDelay(sec: number) { /* ... */ }
  async writeGearDownMode(mode: 0|1) { /* ... */ }
  async writeSpeedCalib(speeds: [number,number,number,number]) { /* ... */ }
  async writeNatureCurve(points: number[]) { /* ... */ }
  async writeBatteryCapacity(mah: number, v: number) { /* ... */ }
  async writePowSwitch(key: string, on: boolean) { /* ... */ }

  disconnect() { this.device?.gatt?.disconnect(); }
  private cleanup() {
    this.stopPolling();
    this.chars.clear();
    this.device = null;
    this.profile = null;
    this.onState?.('idle');
  }
}
```

**Step 2: 提交**

```bash
git add src/ble/manager.ts
git commit -m "feat(ble): 添加 BleManager 连接生命周期与轮询"
```

---

## Task 7: 状态层 — 3 个 Zustand Store

**Files:**
- Create: `src/stores/connection.ts`, `src/stores/device.ts`, `src/stores/settings.ts`

**Step 1: connection store**

```ts
import { create } from 'zustand';
import type { BleState } from '../ble/manager';
import type { Profile } from '../ble/profiles';

interface ConnectionState {
  state: BleState; deviceName: string | null; profile: Profile | null;
  lastError: string | null; connectedAt: number | null;
  setConnecting: () => void;
  setConnected: (name: string, profile: Profile) => void;
  setError: (msg: string) => void;
  setDisconnected: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  state: 'idle', deviceName: null, profile: null, lastError: null, connectedAt: null,
  setConnecting: () => set({ state: 'connecting', lastError: null }),
  setConnected: (name, profile) => set({ state: 'connected', deviceName: name, profile, connectedAt: Date.now() }),
  setError: (msg) => set({ state: 'error', lastError: msg }),
  setDisconnected: () => set({ state: 'idle', deviceName: null, profile: null, connectedAt: null }),
}));
```

**Step 2: device store（subscribeWithSelector）**

```ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from '../ble/parsers';
import type { BleSnapshot } from '../ble/manager';

interface DeviceState extends Partial<BleSnapshot> {
  setSnapshot: (snap: Partial<DeviceState>) => void;
  reset: () => void;
}

const initial = {
  fanSpeed: 0, timerRemainingSec: 0, natureWindOn: false,
  shutdownDelaySec: 0, gearDownMode: 0 as 0|1,
  speedCalib: [30,50,70,100] as [number,number,number,number],
  natureCurve: [] as number[],
  battery: null, powerStatus: null, motor: null, powerConfig: null,
};

export const useDeviceStore = create<DeviceState>()(
  subscribeWithSelector((set) => ({
    ...initial,
    setSnapshot: (snap) => set(snap),
    reset: () => set(initial),
  }))
);
```

**Step 3: settings store（persist）**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'dark' | 'light';
  pollIntervalMs: number;
  curveEditorMode: 'canvas' | 'textarea';
  historyRetentionMin: number;
  lastDeviceName: string | null;
  setTheme: (t: 'dark'|'light') => void;
  setPollInterval: (ms: number) => void;
  setCurveMode: (m: 'canvas'|'textarea') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist((set) => ({
    theme: 'dark', pollIntervalMs: 1000, curveEditorMode: 'canvas',
    historyRetentionMin: 30, lastDeviceName: null,
    setTheme: (t) => set({ theme: t }),
    setPollInterval: (ms) => set({ pollIntervalMs: ms }),
    setCurveMode: (m) => set({ curveEditorMode: m }),
  }), { name: 'w96p-settings' })
);
```

**Step 4: 提交**

```bash
git add src/stores/
git commit -m "feat(stores): 添加 connection/device/settings 三个 Zustand store"
```

---

## Task 8: Hooks — useBle / usePolling / useToast

**Files:**
- Create: `src/hooks/useBle.ts`, `src/hooks/usePolling.ts`, `src/hooks/useToast.ts`, `src/stores/toast.ts`

**Step 1: toast store + useToast**

```ts
// src/stores/toast.ts
import { create } from 'zustand';
interface ToastState { msg: string | null; show: (m: string) => void; clear: () => void; }
export const useToastStore = create<ToastState>((set) => ({
  msg: null, show: (m) => set({ msg: m }), clear: () => set({ msg: null }),
}));
```

**Step 2: useBle（单例 BleManager + 绑定 store）**

```ts
// src/hooks/useBle.ts
import { useMemo } from 'react';
import { BleManager } from '../ble/manager';
import { useConnectionStore } from '../stores/connection';
import { useDeviceStore } from '../stores/device';
import { useSettingsStore } from '../stores/settings';
import { useToastStore } from '../stores/toast';

let managerInstance: BleManager | null = null;

function getManager() {
  if (!managerInstance) {
    managerInstance = new BleManager();
    managerInstance.onState = (s, name, profile) => {
      if (s === 'connecting') useConnectionStore.getState().setConnecting();
      else if (s === 'connected' && name && profile) useConnectionStore.getState().setConnected(name, profile);
      else if (s === 'error') useConnectionStore.getState().setError('连接失败');
      else if (s === 'idle') useConnectionStore.getState().setDisconnected();
    };
    managerInstance.onSnapshot = (snap) => useDeviceStore.getState().setSnapshot(snap);
    managerInstance.onError = (msg) => useToastStore.getState().show(msg);
  }
  return managerInstance;
}

export function useBle() {
  const manager = useMemo(getManager, []);
  const state = useConnectionStore(s => s.state);
  const profile = useConnectionStore(s => s.profile);
  const pollInterval = useSettingsStore(s => s.pollIntervalMs);

  return {
    state, profile, isConnected: state === 'connected',
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
    setGear: (g: 0|1|2|3|4) => manager.writeGear(g),
    setFanSpeed: (p: number) => manager.writeFanSpeed(p),
    toggleNatureWind: (on: boolean) => manager.writeNatureWind(on),
    setTimer: (m: number) => manager.writeTimer(m),
    cancelTimer: () => manager.writeTimer(0),
    setShutdownDelay: (s: number) => manager.writeShutdownDelay(s),
    setGearDownMode: (m: 0|1) => manager.writeGearDownMode(m),
    setSpeedCalib: (s: [number,number,number,number]) => manager.writeSpeedCalib(s),
    setNatureCurve: (p: number[]) => manager.writeNatureCurve(p),
    setBatteryCapacity: (mah: number, v: number) => manager.writeBatteryCapacity(mah, v),
    setPowSwitch: (k: string, on: boolean) => manager.writePowSwitch(k, on),
    startPolling: () => manager.startPolling(pollInterval),
    stopPolling: () => manager.stopPolling(),
  };
}
```

**Step 3: usePolling**

```ts
// src/hooks/usePolling.ts
import { useEffect } from 'react';
import { useBle } from './useBle';

export function usePolling() {
  const { isConnected, startPolling, stopPolling } = useBle();
  useEffect(() => {
    if (!isConnected) return;
    startPolling();
    return stopPolling;
  }, [isConnected]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stopPolling();
      else if (isConnected) startPolling();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isConnected]);
}
```

**Step 4: 提交**

```bash
git add src/hooks/ src/stores/toast.ts
git commit -m "feat(hooks): 添加 useBle/usePolling/useToast"
```

---

## Task 9: 布局组件 — AppLayout / AppBar / SideNav / StatusBar

**Files:**
- Create: `src/components/layout/AppLayout.tsx`, `AppBar.tsx`, `SideNav.tsx`, `StatusBar.tsx`, `BottomNav.tsx`

**Step 1: AppLayout（壳 + Outlet + usePolling）**

```tsx
// src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import { AppBar } from './AppBar';
import { SideNav } from './SideNav';
import { StatusBar } from './StatusBar';
import { BottomNav } from './BottomNav';
import { usePolling } from '../../hooks/usePolling';

export function AppLayout() {
  usePolling();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-page)] text-[var(--color-text)]">
      <AppBar />
      <div className="flex flex-1 min-h-0">
        <SideNav />
        <main className="flex-1 min-w-0 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <BottomNav />  {/* 仅移动端显示 */}
    </div>
  );
}
```

**Step 2: AppBar（logo + 连接状态 + RSSI 占位 + 主题切换）**

工业风要素：连接状态用 `StatusPill`（圆点 + 文字），品牌名 `W96P · 控制` letter-spacing。

**Step 3: SideNav（56px 图标栏，桌面）**

6 个导航项 + Settings，用 NavLink，active 时左边 2px accent 边 + 图标染色。

**Step 4: StatusBar（底部）**

显示：`● 就绪 | 轮询 1000ms | W96P profile | 21:38 GMT+8`

**Step 5: 提交**

```bash
git add src/components/layout/
git commit -m "feat(layout): 添加 AppLayout/AppBar/SideNav/StatusBar 布局壳"
```

---

## Task 10: UI 原子组件

**Files:**
- Create: `src/components/ui/MetricCard.tsx`, `StatusPill.tsx`, `SegBtn.tsx`, `Slider.tsx`, `Toggle.tsx`, `Card.tsx`, `Toast.tsx`

**Step 1: 实现各组件**（按设计文档第 5.2 节）

- `MetricCard`：label（中文）+ 大数字（tabular-nums）+ 单位 + accent 色
- `StatusPill`：圆点 + 文字，accent 可选 success/warning/danger/default
- `SegBtn`：分段按钮组，选中项 accent 边 + 染色
- `Slider`：原生 range + Tailwind `accent-[var(--color-accent)]`
- `Toggle`：开关，开=success，关=muted
- `Card`：surface 背景 + 0.5px border + 圆角 lg + padding
- `Toast`：portal + useToastStore，3s 自动消失

**Step 2: 提交**

```bash
git add src/components/ui/
git commit -m "feat(ui): 添加 MetricCard/StatusPill/SegBtn/Slider/Toggle/Card/Toast 原子组件"
```

---

## Task 11: 路由配置 + 路由守卫

**Files:**
- Create: `src/app/router.tsx`, `src/components/connection/ConnGuard.tsx`, `DisconnectedScreen.tsx`

**Step 1: 路由配置（懒加载）**

```tsx
// src/app/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ConnGuard } from '../components/connection/ConnGuard';

const Dashboard = lazy(() => import('../pages/dashboard'));
const Fan = lazy(() => import('../pages/fan'));
const NatureWind = lazy(() => import('../pages/nature-wind'));
const Power = lazy(() => import('../pages/power'));
const PowerConfig = lazy(() => import('../pages/power-config'));
const Settings = lazy(() => import('../pages/settings'));

export const router = createBrowserRouter([{
  path: '/', element: <AppLayout />,
  children: [
    { index: true, element: <Dashboard /> },
    { path: 'fan', element: <ConnGuard><Fan /></ConnGuard> },
    { path: 'nature-wind', element: <ConnGuard><NatureWind /></ConnGuard> },
    { path: 'power', element: <ConnGuard><Power /></ConnGuard> },
    { path: 'power-config', element: <ConnGuard><PowerConfig /></ConnGuard> },
    { path: 'settings', element: <Settings /> },
  ],
}]);
```

**Step 2: ConnGuard（未连接 redirect /）**

```tsx
// src/components/connection/ConnGuard.tsx
import { Navigate } from 'react-router-dom';
import { useConnectionStore } from '../../stores/connection';

export function ConnGuard({ children }: { children: React.ReactNode }) {
  const isConnected = useConnectionStore(s => s.state === 'connected');
  return isConnected ? <>{children}</> : <Navigate to="/" replace />;
}
```

**Step 3: 提交**

```bash
git add src/app/router.tsx src/components/connection/
git commit -m "feat(router): 添加路由配置与未连接守卫"
```

---

## Task 12: Dashboard 页

**Files:**
- Create: `src/pages/dashboard/index.tsx` + 子组件

**Step 1: 实现 Dashboard**

布局：
- 6 个 MetricCard（转速/电池功率/电机电流/电池电压/VBUS电压/电机电压），各订阅独立字段
- FanControl 快控面板（GearRow + SpeedSlider 简化版 + 自然风 Toggle）
- Status 摘要卡（Timer/Sleep/GearDown/Charge/Stall）
- NatureCurve 预览（Recharts 只读折线）

**Step 2: 提交**

```bash
git add src/pages/dashboard/
git commit -m "feat(dashboard): 添加总览页（metric 卡片+快控+状态+曲线预览）"
```

---

## Task 13: Fan 页

**Files:**
- Create: `src/pages/fan/index.tsx`, `src/components/fan/*`

**Step 1: 实现完整风扇控制**

- GearRow：5 按钮（OFF/1/2/3/4）
- SpeedSlider：滑块 + ± 长按 + 手动输入（拖动暂停轮询）
- TimerPanel：输入 + 1h/4h 预设 + 取消 + 读剩余
- SleepPanel：休眠延时（10-65535，1-9 修正为 10）
- GearDownToggle：逐级/直接回 0
- SpeedCalibPanel：4 档风速校准 + 恢复默认

**Step 2: 提交**

```bash
git add src/pages/fan/ src/components/fan/
git commit -m "feat(fan): 添加风扇控制页（档位/转速/定时/休眠/减档/校准）"
```

---

## Task 14: Nature Wind 页 — 曲线编辑器

**Files:**
- Create: `src/pages/nature-wind/index.tsx`, `src/components/nature-wind/*`

**Step 1: 实现 CurveCanvas（拖拽式）**

Canvas 2D，128 点，鼠标/触摸拖拽，y 轴按 profile.minSpeed~maxSpeed 钳制，quadratic 平滑连接。

**Step 2: 实现 CurveChart（Recharts 只读预览）**

stroke `var(--color-accent)`，grid `var(--color-border)`。

**Step 3: 实现 CurvePresets + CurveStats + Textarea 双模式**

3 预设（平滑/安静/强劲），min/max/avg 显示，Canvas/Textarea 切换。

**Step 4: 提交**

```bash
git add src/pages/nature-wind/ src/components/nature-wind/
git commit -m "feat(nature-wind): 添加自然风曲线编辑器（Canvas 拖拽+Textarea+预设）"
```

---

## Task 15: Power 页

**Files:**
- Create: `src/pages/power/index.tsx`, `src/components/power/BatteryPanel.tsx`, `VbusPanel.tsx`, `MotorPanel.tsx`

**Step 1: 实现电源监控三面板**

- BatteryPanel：电压/电流/容量/功率 + 容量设置（mAh × V → mWh）
- VbusPanel：VBUS 电压/电流 + 充放电状态 + C 口快充开关
- MotorPanel：电流/电压/功率/堵转状态

**Step 2: 提交**

```bash
git add src/pages/power/ src/components/power/
git commit -m "feat(power): 添加电源监控页（电池/VBUS/电机）"
```

---

## Task 16: Power Config 页 — 寄存器位域开关

**Files:**
- Create: `src/pages/power-config/index.tsx`, `src/components/power/PowerConfigPanel.tsx`, `src/ble/powSwitches.ts`

**Step 1: 定义 POW_SWITCHES 表**

```ts
// src/ble/powSwitches.ts
import type { PowReg } from './commands';

export interface PowSwitchDef {
  key: string; label: string; reg: PowReg; bit: number;
  inverted?: boolean; desc?: string;
}

export const POW_SWITCHES: PowSwitchDef[] = [
  { key:'fcp_src', label:'FCP 输出', reg:'1C', bit:0, inverted:true },
  { key:'pd_sink', label:'PD 输入', reg:'1C', bit:4, inverted:true },
  { key:'pd_src', label:'PD 输出', reg:'1C', bit:5, inverted:true },
  { key:'sfcp_src', label:'SFCP 输出', reg:'1D', bit:0, inverted:true },
  { key:'scp_sink', label:'SCP 输入', reg:'1D', bit:1, inverted:true },
  { key:'scp_src', label:'SCP 输出', reg:'1D', bit:2, inverted:true },
  { key:'afc_sink', label:'AFC 输入', reg:'1D', bit:3, inverted:true },
  { key:'afc_src', label:'AFC 输出', reg:'1D', bit:4, inverted:true },
  { key:'fcp_sink', label:'FCP 输入', reg:'1D', bit:7, inverted:true },
  { key:'qc_src', label:'QC 输出', reg:'1E', bit:1, inverted:true },
  // POW_1A 非开关位（电压选择）用 SegmentedControl
  // POW_2A bit6 PD 版本、bit5 PPS1 电压 用 SegmentedControl
  // POW_2B bit3/5 PPS 使能、bit4 重新广播、bit7 PD Fix 电压 用 Toggle/SegmentedControl
  // POW_2C PDO 电流 用 SegmentedControl
];
```

**Step 2: 实现 PowerConfigPanel（按寄存器分组渲染）**

每个寄存器一个 Card，标题 `POW_xx — 中文说明`，下面是该寄存器的位开关 + SegmentedControl。

**Step 3: 提交**

```bash
git add src/pages/power-config/ src/components/power/PowerConfigPanel.tsx src/ble/powSwitches.ts
git commit -m "feat(power-config): 添加 7 寄存器位域配置页（表驱动开关）"
```

---

## Task 17: Settings 页 + 主题切换

**Files:**
- Create: `src/pages/settings/index.tsx`

**Step 1: 实现设置页**

- 主题切换（dark/light，写 `document.documentElement.dataset.theme`）
- 轮询周期（500/1000/2000ms）
- 曲线编辑器默认模式
- 关于（版本、协议文档链接、固件版本）

**Step 2: 主题初始化（main.tsx）**

```ts
const theme = useSettingsStore.getState().theme;
document.documentElement.dataset.theme = theme;
```

**Step 3: 提交**

```bash
git add src/pages/settings/
git commit -m "feat(settings): 添加设置页（主题/轮询/关于）"
```

---

## Task 18: 格式化工具 + 收尾

**Files:**
- Create: `src/lib/format.ts`

**Step 1: 格式化函数**

```ts
export const fmtVoltage = (mv: number) => `${(mv / 1000).toFixed(2)} V`;
export const fmtCurrent = (ma: number) =>
  Math.abs(ma) >= 1000 ? `${(ma / 1000).toFixed(2)} A` : `${ma} mA`;
export const fmtPower = (w: number) => `${w.toFixed(2)} W`;
export const fmtTimer = (sec: number) => {
  if (sec <= 0) return '未设置';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
```

**Step 2: 全量检查**

```bash
pnpm tsc --noEmit
pnpm eslint .
pnpm vite build
```

全部通过。

**Step 3: 最终提交**

```bash
git add -A
git commit -m "chore: 格式化工具与全量类型检查通过"
```

---

## 执行说明

- 每个 Task 完成后立即 commit，保持历史清晰
- 协议层（Task 2-6）必须先完成且单测通过，再开始 UI
- Task 9-11（布局+路由）是 UI 的地基，先于业务页
- Task 12-17 可按顺序或并行（但建议顺序，Dashboard 先跑通验证数据流）
- Web Bluetooth 只能在真机 + HTTPS/localhost 测试，开发用 `pnpm dev`（已配 https）
