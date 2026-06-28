# W96P 控制

> W96P / W66D 蓝牙风扇 Web 上位机 · 基于 Web Bluetooth API · 浏览器直连设备

## 协议文档

以下基于 `W96P风扇控制V3.2.html`、`V3.1_测试APP.html`、`W96P 电源状态控制.html` 三个控制程序逆向整理。协议基于 Bluetooth LE GATT，所有多字节整数均使用**大端序（Big-Endian）**。

### 概述

| 项目 | 值 |
|------|-----|
| 设备广播名 | `W96P` |
| 连接方式 | `navigator.bluetooth.requestDevice` |
| 服务数量 | 3 个主服务 |
| 数据编码 | 主控·自然风：二进制 hex；电源：ASCII 文本命令（以 `,` 结尾） |
| 字节序 | 大端（Big-Endian），`DataView.getUint16(off, false)` |

### 服务列表

| 服务 | UUID | 用途 |
|------|------|------|
| 主控 FFF0 | `0000fff0-...` | 风扇开关、档位、转速、定时、自然风、休眠 |
| 电源 FFD0 | `0000ffd0-...` | 电池、电源状态、电机、快充配置 |
| 自然风 FFE0 | `0000ffe0-...` | 自然风曲线数据 |

### 连接流程

1. `filters: [{ name: "W96P" }]` 扫描，`optionalServices` 声明三服务 UUID
2. 连接 GATT 后依次获取三个 PrimaryService，缓存所有 Characteristic
3. 延迟约 1.5s 读取初始状态（剩余时间、档位风速、自然风、休眠延时、减档模式），再启动 1 秒周期实时刷新
4. 断开时监听 `gattserverdisconnected`，清理缓存与定时器

---

## 主控服务 FFF0（二进制 hex）

### POWER `FFF1` — 开关/档位

| 属性 | 长度 |
|------|------|
| Write | 1 字节 |

| hex | 含义 |
|-----|------|
| `00` | 关机 |
| `01` | 1 档 |
| `02` | 2 档 |
| `03` | 3 档 |
| `04` | 4 档 |

> 设置档位时若自然风开启，需先写 `NATURE_WIND=00` 关闭，间隔约 100ms。

### TIMER `FFF2` — 定时关机

| 属性 | 长度 | 格式 |
|------|------|------|
| Read / Write | 2 字节 | `uint16` BE，单位秒 |

| 操作 | 写入 |
|------|------|
| 取消定时 | `00 00` |
| 设置 N 分钟 | `N×60` 转 4 位 hex（BE） |

范围 1~480 分钟，`0` = 取消。示例：30 分钟 = 1800s = `0x0708` → `07 08`。

### FAN_SPEED `FFF3` — 转速

| 属性 | 长度 | 格式 |
|------|------|------|
| Read / Write（优先 `writeWithoutResponse`） | 1 字节 | 0~100% |

设置转速时若自然风开启需先关闭。示例：75% → `0x4B`。

### NATURE_WIND `FFF4` — 自然风开关

| 属性 | 长度 |
|------|------|
| Read / Write | 1 字节 |

`00` = 关闭，`01` = 开启。读取 `1` = 开启。与档位/转速互斥。

### SHUTDOWN_DELAY `FFF5` — 蓝牙休眠延时

| 属性 | 长度 | 格式 |
|------|------|------|
| Read / Write | 2 字节 | `uint16` BE，单位秒 |

`00 00` = 永不休眠，1~65535s。输入 1~9 自动修正为 10。

### GEAR_DOWN_MODE `FFF6` — 减档模式

| 属性 | 长度 |
|------|------|
| Read / Write | 1 字节 |

`00` = 逐级减档，`01` = 直接回 0。

### SPEED_CALIB `FFF7` — 档位风速校准

| 属性 | 长度 | 格式 |
|------|------|------|
| Read / Write | 4 字节 | 依次对应 1~4 档百分比 |

默认：`1E 32 46 64`（30%/50%/70%/100%）。

---

## 自然风服务 FFE0

### NATURE_WIND_CURVE `FFE3` — 曲线数据

| 属性 | 长度 | 格式 |
|------|------|------|
| Read / Write（优先 `writeWithoutResponse`） | 128 字节 | 每字节 0~100 |

128 个风速强度采样点，即使自然风关闭也可读写。默认曲线值见源码 `src/lib/curvePresets.ts`。

---

## 电源服务 FFD0（ASCII 命令）

所有写命令格式 `KEY=VALUE,`（末尾逗号），UTF-8 编码。

### BATTERY_INFO `FFD1` — 电池信息

| 属性 | 读取长度 |
|------|----------|
| Read / Write | 8 字节 |

**读取（二进制）：**

| 偏移 | 类型 | 含义 | 单位 |
|------|------|------|------|
| 0~1 | `uint16` BE | 电池电压 | mV |
| 2~3 | `int16` BE | 电池电流（正=充电） | mA |
| 4~7 | `uint32` BE | 电池容量 | mWh |

**写入：** `BAT_CAP=<mWh>,`（mAh × V → mWh，范围 1000~50000）

### POWER_STATUS `FFD2` — 电源状态

| 属性 | 读取长度 |
|------|----------|
| Read / Write | ≥11 字节 |

**读取：**

| 偏移 | 类型 | 含义 |
|------|------|------|
| 0~3 | `uint32` BE | VBUS 电压（mV） |
| 4~5 | `int16` BE | VBUS 电流（mA） |
| 6 | `uint8` | 电路通断（1=开） |
| 7 | `uint8` | 充放电（1=充电中） |
| 8~9 | `uint8` | C 口输出/输入快充使能（0=使能） |

**写入：** `POW_C_OUT=<0|1>,` / `POW_C_IN=<0|1>,`（0=使能，1=关闭）

### MOTOR_INFO `FFD3` — 电机信息

| 属性 | 读取长度 |
|------|----------|
| Read | ≥4 字节 |

| 偏移 | 类型 | 含义 |
|------|------|------|
| 0~1 | `uint16` BE | 电机电流（mA） |
| 2 | `uint8` & `0xF7` | 堵转检测（1=堵转） |
| 末 2 字节 | `uint16` BE | 电机电压（mV，校验 0~20000） |

派生：电机功率 = 电压 × 电流；电池功率 = 电池电压 × 电池电流。

### POWER_CONFIG `FFD4` — 快充配置

| 属性 | 读取长度 |
|------|----------|
| Read / Write | ≥16 字节 |

**读取：** 7 个位域寄存器（POW_1A/1C/1D/1E/2A/2B/2C）+ POW_SINK/POW_SRC/POW_VER。

**POW_SINK（输入协议）：** 0=非快充 1=PD 3=HV 4=AFC 5=FCP 6=SCP 7=PE1.1

**POW_SRC（输出协议）：** 0=非快充 1=PD 2=PPS 3=QC2 4=QC3 5=FCP 6=PE2.0 7=SFCP 8=AFC 9=SCP 10=LVDC1

**位域寄存器（写前必须读-改-写）：**

| 寄存器 | 默认值 | 关键位 |
|--------|--------|--------|
| POW_1A | `0x1C` | 输入/输出电压支持 |
| POW_1C | `0x00` | FCP Source / PD Sink / PD Source |
| POW_1D | `0x00` | SFCP/SCP/AFC/FCP Sink & Source |
| POW_1E | `0x00` | QC Source |
| POW_2A | `0x00` | PPS1 电压 / PD 版本 |
| POW_2B | `0x10` | PPS/PPS0/Fix/重新广播 |
| POW_2C | `0x04` | 5V/9V/12V PDO 电流 |

**写入：** `POW_XX=<byte>,`（先读当前值，按掩码改目标位后整体写入）

---

## 特征值总览

| 特征 | 短 UUID | 服务 | 属性 | 长度 | 编码 |
|------|---------|------|------|------|------|
| POWER | FFF1 | FFF0 | W | 1B | hex |
| TIMER | FFF2 | FFF0 | R/W | 2B | hex uint16 |
| FAN_SPEED | FFF3 | FFF0 | R/W | 1B | hex 0~100 |
| NATURE_WIND | FFF4 | FFF0 | R/W | 1B | hex 0/1 |
| SHUTDOWN_DELAY | FFF5 | FFF0 | R/W | 2B | hex uint16 |
| GEAR_DOWN_MODE | FFF6 | FFF0 | R/W | 1B | hex 0/1 |
| SPEED_CALIB | FFF7 | FFF0 | R/W | 4B | hex 4×% |
| BATTERY_INFO | FFD1 | FFD0 | R/W | 8B/ASCII | 二进/`BAT_CAP=` |
| POWER_STATUS | FFD2 | FFD0 | R/W | ≥11B/ASCII | 二进/`POW_C_` |
| MOTOR_INFO | FFD3 | FFD0 | R | ≥4B | 二进制 |
| POWER_CONFIG | FFD4 | FFD0 | R/W | ≥16B/ASCII | 二进/`POW_XX=` |
| NATURE_WIND_CURVE | FFE3 | FFE0 | R/W | 128B | 二进制 |

## 通信注意事项

1. **写入串行化**：主控写入需排队，用 `isWriting`/`isPowerSending` 标志防并发
2. **自然风互斥**：调档/调速前先关自然风，间隔 100ms
3. **实时刷新**：1s 周期轮询；写入期间暂停，完成后延迟 300ms 恢复
4. **ASCII 格式**：`KEY=VALUE,`（末尾逗号），UTF-8
5. **位域读写**：POW 寄存器写前必须读-改-写，掩码保留其他位
6. **重试**：写入失败重试 1~3 次，间隔 200~500ms
7. **电压校验**：电机电压超出 0~20000mV 视为脏数据置 0
8. **可见性优化**：页面隐藏时停止轮询

## 多设备兼容

W96P 与 W66D 协议层完全兼容（命令可互发），但业务调校不同：

| 差异 | W96P | W66D |
|------|------|------|
| 默认档位 | 10/35/70/100 | 30/50/70/100 |
| 风速范围 | 0-100 | 20-90 |
| 电机解析 | 电流+堵转+电压 | 仅电流 |

`profiles.ts` 按 `device.name` 加载对应调校包，未知型号走 W66D 保守包。

## 开发

```bash
pnpm install
pnpm dev          # https://localhost:5173
pnpm tsc --noEmit # 类型检查
pnpm vite build   # 生产构建
```

> Web Bluetooth API 需要 HTTPS 或 localhost。

**技术栈：** React 19 · TypeScript · Vite 8 · Zustand · react-grid-layout · Tailwind CSS 4 · Recharts · MiSans · PWA

**浏览器：** Chrome 56+ / Edge 79+ / Opera 43+（Safari / Firefox 暂不支持 Web Bluetooth API）

## License

MIT
