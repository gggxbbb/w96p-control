# @gggxbbb/w96p-ble-sdk

W96P / W66D BLE 风扇协议 SDK，零外部依赖（仅 Zustand）。

## 安装

```bash
npm install @gggxbbb/w96p-ble-sdk --registry=https://npm.pkg.github.com
```

需要 GitHub PAT（`read:packages`）认证，在 `~/.npmrc` 中配置：

```
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
@gggxbbb:registry=https://npm.pkg.github.com/
```

## 使用

```ts
import { BleManager } from '@gggxbbb/w96p-ble-sdk';
import type { BleSnapshot, IBleManager } from '@gggxbbb/w96p-ble-sdk';

const mgr = new BleManager();
mgr.onSnapshot = (snap: BleSnapshot) => {
  console.log('风扇转速:', snap.fanSpeed);
  console.log('电池:', snap.battery);
};
mgr.onState = (state, name) => {
  console.log('连接状态:', state, name);
};
await mgr.connect();
mgr.startPolling(1000);

// 设置转速
await mgr.writeFanSpeed(50);
// 设置档位
await mgr.writeGear(2);
// 开启自然风
await mgr.writeNatureWind(true);

// 断开
mgr.disconnect();
```

### 虚拟设备（无需蓝牙）

```ts
import { VirtualManager } from '@gggxbbb/w96p-ble-sdk';

const vm = new VirtualManager();
vm.setVirtualProfile(false);  // false=W96P, true=W66D
vm.onSnapshot = (snap) => console.log(snap);
await vm.connect();
```

### 波形合成

```ts
import { generateWaveSample, synthesizeLayers, applyEnvelope } from '@gggxbbb/w96p-ble-sdk';

const layers = [{ enabled: true, waveform: 'sine', amplitude: 30, frequency: 2, offset: 0, phase: 0, invert: false }];
const curve = synthesizeLayers(128, layers);
```

## API 概览

### BLE 管理器

| 接口 | 说明 |
|------|------|
| `BleManager` | Web Bluetooth 连接管理器 |
| `VirtualManager` | 虚拟设备（开发调试） |
| `IBleManager` | 管理器接口 |
| `BleSnapshot` | 设备状态快照 |

### 解析 & 命令

| 函数 | 说明 |
|------|------|
| `parseBatteryInfo` | 解析 FFD1 电池数据 |
| `parsePowerStatus` | 解析 FFD2 电源状态 |
| `parseMotorInfo` | 解析 FFD3 电机信息 |
| `parsePowerConfig` | 解析 FFD4 电源配置寄存器 |
| `cmd` | 命令模板（`setBatteryCapacity` 等） |
| `encodeCmd` | 命令字符串 → Uint8Array |

### 版本特性

| 函数 | 说明 |
|------|------|
| `compareVersion` | 语义版本号比较 |
| `getFeatures` | 根据固件版本获取功能集 |

### 电源开关

| 常量 | 说明 |
|------|------|
| `POW_SWITCHES` | 电源寄存器开关位定义 |
| `POW_SEGS` | 电源寄存器多选位域 |
| `REG_TITLES` | 寄存器中文标题 |

### 自然风曲线

| 函数 | 说明 |
|------|------|
| `generateWaveSample` | 单点波形采样 |
| `generateLayer` | 生成完整波形层 |
| `synthesizeLayers` | 多层合成 |
| `applyEnvelope` | ADSR 包络调制 |
| `DEFAULT_CURVE` | 默认曲线 (128 点) |
| `PRESETS` | 内置曲线预设 |

## 版本号

主版本号对应该 SDK 支持的最高固件主版本。

| SDK | 固件 | 说明 |
|-----|------|------|
| `17.x.y` | 1.7 | Turbo, BLE_SN, 灯光控制 |

## 许可

MIT
