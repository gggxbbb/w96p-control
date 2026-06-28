# W96P 控制

> W96P / W66D 蓝牙风扇上位机 · Web Bluetooth API · 浏览器直连

## 协议文档

协议基于 Bluetooth LE GATT，多字节整数全部**大端序（Big-Endian）**，`DataView.getUint16(off, false)`。

两个型号共享同一套 GATT 协议栈，命令可互发，但业务参数不同。下表标注了所有差异，未标注的部分完全一致。

### 型号差异速查

| 项目 | W96P | W66D |
|------|------|------|
| 默认档位 | 10 / 35 / 70 / 100 | 30 / 50 / 70 / 100 |
| 风速范围 | 0 ~ 100 | 20 ~ 90 |
| 电机数据解析 | 电流 + 堵转 + 电压 | 仅电流 |
| 电机功率计算 | 电机电压 × 电机电流 | 电池电压 × 电机电流 |
| 未知设备回退 | - | 走 W66D 参数 |

### 1. 服务列表

| 服务 | UUID | 用途 |
|------|------|------|
| 主控 FFF0 | `0000fff0-0000-1000-8000-00805f9b34fb` | 开关、档位、转速、定时、自然风、休眠 |
| 电源 FFD0 | `0000ffd0-0000-1000-8000-00805f9b34fb` | 电池、电源状态、电机、快充配置 |
| 自然风 FFE0 | `0000ffe0-0000-1000-8000-00805f9b34fb` | 自然风曲线 |

### 2. 连接流程

1. `filters: [{ name: "W96P" }]` 扫描，`optionalServices` 声明三服务 UUID
2. 获取三个 PrimaryService，缓存全部 Characteristic
3. 延迟 ~1.5s 读取初始状态（剩余时间、档位风速、自然风、休眠延时、减档模式），之后 1s 周期刷新
4. 监听 `gattserverdisconnected`，断开时清理缓存和定时器

---

### 3. 主控服务 FFF0（二进制 hex）

全部使用 `writeValue` 写入 hex 字节。

#### 3.1 POWER `FFF1` — 开关 / 档位

Write · 1 字节

| hex | 含义 |
|-----|------|
| `00` | 关机 |
| `01` | 1 档 |
| `02` | 2 档 |
| `03` | 3 档 |
| `04` | 4 档 |

切换档位时若自然风开启，先写 `NATURE_WIND=00`，等 100ms 再写档位。

#### 3.2 TIMER `FFF2` — 定时关机

Read / Write · 2 字节 · `uint16` BE，单位秒

| 操作 | 写入 |
|------|------|
| 取消 | `00 00` |
| N 分钟 | `(N×60)` 转 hex BE |

范围 1~480 分钟，`0` 取消。读取返回剩余秒数。

示例：30 分钟 = 1800s = `0x0708` → `07 08`

#### 3.3 FAN_SPEED `FFF3` — 转速

Read / Write（优先 `writeWithoutResponse`）· 1 字节

| 型号 | 有效范围 |
|------|----------|
| W96P | 0 ~ 100 |
| W66D | 20 ~ 90 |

滑块拖拽时优先走 `writeWithoutResponse`。调速前若自然风开启需先关闭。

示例：W96P 设 75% → `0x4B`；W66D 最低只能给 20% → `0x14`

#### 3.4 NATURE_WIND `FFF4` — 自然风开关

Read / Write · 1 字节

`00` 关闭，`01` 开启。读取 `1` 即为开启。

与档位、转速互斥——开启档位或调速时会自动关闭自然风。

#### 3.5 SHUTDOWN_DELAY `FFF5` — 蓝牙休眠

Read / Write · 2 字节 · `uint16` BE，单位秒

`00 00` 永不关闭，1~65535s 后自动休眠。输入 1~9 自动修正为 10。

示例：60s 后休眠 → `00 3C`

#### 3.6 GEAR_DOWN_MODE `FFF6` — 减档模式

Read / Write · 1 字节

`00` 逐级降档（按校准值），`01` 直接关停。

#### 3.7 SPEED_CALIB `FFF7` — 档位风速校准

Read / Write · 4 字节 · 依次 1~4 档

| 型号 | 默认值 | hex |
|------|--------|-----|
| W96P | 10 / 35 / 70 / 100 | `0A 23 46 64` |
| W66D | 30 / 50 / 70 / 100 | `1E 32 46 64` |

每字节 0~100，建议 ≥20。

---

### 4. 自然风服务 FFE0

#### 4.1 NATURE_WIND_CURVE `FFE3` — 曲线

Read / Write（优先 `writeWithoutResponse`）· 128 字节

128 个点，每字节 0~100。自然风关闭时也能读写，开启后生效。

默认曲线（128 个十进制值）：

```txt
55 48 40 33 28 22 21 26 33 41 48 54 58 60 61 58 52 45 37 30 24 20 25 33 40 48 53 57 60 60 56 51
43 36 29 23 21 28 37 47 56 63 68 71 72 71 67 62 54 46 36 29 23 20 27 37 48 57 64 69 73 74 76 78
80 82 84 86 88 90 89 87 83 77 70 62 53 43 34 27 21 20 26 32 38 43 47 49 50 48 44 38 33 27 24 20
21 26 31 37 42 46 48 47 42 36 31 27 23 20 22 27 33 39 44 47 48 46 41 36 30 26 23 20 22 27 33 38
```

---

### 5. 电源服务 FFD0（ASCII 命令）

所有写命令格式 `KEY=VALUE,`，UTF-8 编码。读为二进制。

#### 5.1 BATTERY_INFO `FFD1` — 电池

Read / Write · 读取 8 字节

| 偏移 | 类型 | 含义 | 单位 |
|------|------|------|------|
| 0~1 | `uint16` BE | 电池电压 | mV |
| 2~3 | `int16` BE | 电池电流（正=充电） | mA |
| 4~7 | `uint32` BE | 电池容量 | mWh |

写入：`BAT_CAP=<mWh>,`，`<mWh> = mAh × V`，范围 1000~50000。

示例：5000mAh × 3.6V = 18000mWh → `BAT_CAP=18000,`

电池功率 (W) = 电池电压 (V) × 电池电流 (A)，正=充电，负=放电。

#### 5.2 POWER_STATUS `FFD2` — 电源状态

Read / Write · 读取 ≥11 字节

| 偏移 | 类型 | 含义 |
|------|------|------|
| 0~3 | `uint32` BE | VBUS 电压 (mV) |
| 4~5 | `int16` BE | VBUS 电流 (mA) |
| 6 | `uint8` | 电路通断 (1=开) |
| 7 | `uint8` | 充放电 (1=充电中) |
| 8 | `uint8` | C 口输出快充 (0=使能, 1=关闭) |
| 9 | `uint8` | C 口输入快充 (0=使能, 1=关闭) |
| 10 | `uint8` | 保留 |

写入：`POW_C_OUT=<0|1>,` / `POW_C_IN=<0|1>,`（0=使能）

#### 5.3 MOTOR_INFO `FFD3` — 电机

Read only · ≥4 字节

**V3.1 格式：**

| 偏移 | 类型 | 含义 |
|------|------|------|
| 0~1 | `uint16` BE | 电机电流 (mA) |
| 2 | `uint8` & `0xF7` | 堵转 (1=堵转) |
| 4~5 | `uint16` BE | 电机电压 (mV) |

**V3.2 格式：**

| 偏移 | 类型 | 含义 |
|------|------|------|
| 0~1 | `uint16` BE | 电机电流 (mA) |
| 2 | `uint8` | 堵转原始字节 |
| 末尾 2 字节 | `uint16` BE | 电机电压 (mV，取 `byteLength - 2`) |

电压校验 0~20000mV，超限置 0。W66D 只解析电流字段。

**电机功率计算：**

| 型号 | 公式 |
|------|------|
| W96P | 电机电压 (V) × 电机电流 (A) |
| W66D | 电池电压 (V) × 电机电流 (A) |

#### 5.4 POWER_CONFIG `FFD4` — 快充配置

Read / Write · ≥16 字节

| 偏移 | 字段 | 含义 |
|------|------|------|
| 1 | POW_VER | PD 版本 (bit6: 0=PD3.0, 1=PD2.0) |
| 2 | POW_SINK | 输入快充协议 |
| 3 | POW_SRC | 输出快充协议 |
| 6 | POW_1A | 电压与协议支持 (位域) |
| 7 | POW_1C | PD/FCP Source/Sink (位域) |
| 8 | POW_1D | AFC/FCP/SCP/SFCP (位域) |
| 9 | POW_1E | QC Source (位域) |
| 13 | POW_2A | PD 版本 + PPS1 电压 (位域) |
| 14 | POW_2B | Fix/PPS0/PPS1/重新广播 (位域) |
| 15 | POW_2C | 5V/9V/12V PDO 电流 (位域) |

#### POW_SINK（输入协议）

| 值 | 协议 |
|----|------|
| 0 | 非快充 |
| 1 | PD Sink |
| 3 | HV Sink |
| 4 | AFC Sink |
| 5 | FCP Sink |
| 6 | SCP Sink |
| 7 | PE1.1 Sink |

#### POW_SRC（输出协议）

| 值 | 协议 |
|----|------|
| 0 | 非快充 |
| 1 | PD Source |
| 2 | PPS Source |
| 3 | QC2.0 |
| 4 | QC3.0 |
| 5 | FCP |
| 6 | PE2.0/1.1 |
| 7 | SFCP |
| 8 | AFC |
| 9 | SCP |
| 10 | LVDC1 |

**POW_1A（默认 `0x1C`）**

| Bit | 含义 | 0 | 1 |
|-----|------|---|---|
| bit1 | 输出最高电压 | 12V | 9V |
| bit2 | 输入支持 12V | 支持 | 不支持 |
| bit3 | FCP 输出 12V | 不支持 | 支持 |
| bit4 | AFC 输出 12V | 不支持 | 支持 |

**POW_1C（默认 `0x00`）**

| Bit | 含义 | 0 | 1 |
|-----|------|---|---|
| bit0 | FCP Source | 使能 | 关闭 |
| bit4 | PD Sink | 使能 | 关闭 |
| bit5 | PD Source | 使能 | 关闭 |

**POW_1D（默认 `0x00`）**

| Bit | 含义 | 0 | 1 |
|-----|------|---|---|
| bit0 | SFCP Source | 使能 | 关闭 |
| bit1 | SCP Sink | 使能 | 关闭 |
| bit2 | SCP Source | 使能 | 关闭 |
| bit3 | AFC Sink | 使能 | 关闭 |
| bit4 | AFC Source | 使能 | 关闭 |
| bit7 | FCP Sink | 使能 | 关闭 |

**POW_1E（默认 `0x00`）**

| Bit | 含义 | 0 | 1 |
|-----|------|---|---|
| bit1 | QC Source | 使能 | 关闭 |

**POW_2A（默认 `0x00`）**

| Bit | 含义 | 0 | 1 |
|-----|------|---|---|
| bit5 | PPS1 最高电压 | 11V | 9V |
| bit6 | PD 版本 | PD3.0 | PD2.0 |

**POW_2B（默认 `0x10`）**

| Bit | 含义 | 0 | 1 |
|-----|------|---|---|
| bit3 | PPS1 | 使能 | 关闭 |
| bit4 | 重新广播 5V/2A | 关闭 | 使能 |
| bit5 | PPS0 | 使能 | 关闭 |
| bit7 | PD Fix 输出电压 | 12V | 9V |

**POW_2C（默认 `0x04`）— PDO 电流**

| Bits | 电压 | 0 | 1 | 2 | 3 |
|------|------|---|---|---|---|
| bit0~1 | 12V | 1.5A | 1.6A | 1.7A | 1.75A |
| bit2~3 | 9V | 2.0A | 2.2A | 2.33A | 2.4A |
| bit4~5 | 5V | 3.0A | 2.4A | 2.5A | 2.0A |

**写入命令：**
`POW_1A=<byte>,` `POW_1C=<byte>,` `POW_1D=<byte>,` `POW_1E=<byte>,`
`POW_2A=<byte>,` `POW_2B=<byte>,` `POW_2C=<byte>,`

位域寄存器必须先读-改-写，掩码保留其他位。

示例：POW_2A 改 PD2.0 (bit6=1)，当前 `0x00` → 写 `0x40` → `POW_2A=64,`

---

### 6. 特征总览

| 特征 | UUID | 服务 | 属性 | 长度 | 编码 |
|------|------|------|------|------|------|
| POWER | FFF1 | FFF0 | W | 1B | hex |
| TIMER | FFF2 | FFF0 | R/W | 2B | hex uint16 |
| FAN_SPEED | FFF3 | FFF0 | R/W | 1B | hex 0~100 |
| NATURE_WIND | FFF4 | FFF0 | R/W | 1B | hex 0/1 |
| SHUTDOWN_DELAY | FFF5 | FFF0 | R/W | 2B | hex uint16 |
| GEAR_DOWN_MODE | FFF6 | FFF0 | R/W | 1B | hex 0/1 |
| SPEED_CALIB | FFF7 | FFF0 | R/W | 4B | hex 4×% |
| BATTERY_INFO | FFD1 | FFD0 | R/W | 8B / ASCII | 二进 / `BAT_CAP=` |
| POWER_STATUS | FFD2 | FFD0 | R/W | ≥11B / ASCII | 二进 / `POW_C_` |
| MOTOR_INFO | FFD3 | FFD0 | R | ≥4B | 二进制 |
| POWER_CONFIG | FFD4 | FFD0 | R/W | ≥16B / ASCII | 二进 / `POW_XX=` |
| NATURE_WIND_CURVE | FFE3 | FFE0 | R/W | 128B | 二进制 |

### 7. 通信规则

1. **写入串行** — 主控写入排队，`isWriting` / `isPowerSending` 防并发
2. **自然风互斥** — 调档/调速前关自然风，间隔 100ms
3. **刷新周期** — 1s 轮询；写入期间暂停，完成后延迟 ~300ms 恢复
4. **ASCII 格式** — `KEY=VALUE,`（末尾逗号），UTF-8
5. **位域写** — POW 寄存器先读后掩码改，再整体写
6. **重试** — 单次失败重试 1~3 次，间隔 200~500ms
7. **电压校验** — 电机电压 >20000mV 视为脏数据置 0
8. **可见性** — 页面隐藏时停轮询，恢复时按连接状态重启

### 8. 默认值

| 参数 | W96P | W66D |
|------|------|------|
| 档位风速 | 10 / 35 / 70 / 100 | 30 / 50 / 70 / 100 |
| 风速范围 | 0 ~ 100 | 20 ~ 90 |
| 风扇转速 | 50 | 50 |
| 电池容量 | 17200 mWh | 17200 mWh |
| POW_1A | `0x1C` | `0x1C` |
| POW_1C | `0x00` | `0x00` |
| POW_1D | `0x00` | `0x00` |
| POW_1E | `0x00` | `0x00` |
| POW_2A | `0x00` | `0x00` |
| POW_2B | `0x10` | `0x10` |
| POW_2C | `0x04` | `0x04` |

多设备识别在 `src/ble/profiles.ts`，按 `device.name` 匹配，未知型号走 W66D。

---

## 开发

```bash
pnpm install
pnpm dev          # https://localhost:5173
pnpm tsc --noEmit
pnpm vite build
```

Web Bluetooth API 需要 HTTPS 或 localhost。

React 19 · TypeScript · Vite 8 · Zustand · react-grid-layout · Tailwind CSS 4 · Recharts · MiSans · PWA

Chrome 56+ / Edge 79+ / Opera 43+（Safari / Firefox 不支持 Web Bluetooth API）

## License

MIT
