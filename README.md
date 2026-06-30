# W96P 控制

<p align="center">
  <img src="public/icon-192.png" alt="W96P" width="96" />
</p>

<p align="center">
  <a href="https://w96p.gxb.pub"><img src="https://img.shields.io/badge/🔗-w96p.gxb.pub-1A1A18?style=for-the-badge" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" /></a>
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/typescript-6.0-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/vite-8-646CFF?style=for-the-badge&logo=vite" />
  <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?style=for-the-badge&logo=pwa" />
</p>

Witrn W96P / W66D 蓝牙风扇的网页控制面板。浏览器直连风扇，无需安装 App。

> ⚠️ **免责声明**：本项目为第三方开源工具，与 Witrn 官方无关。使用本项目操作设备可能影响设备正常运行，作者不对因使用本工具导致的设备损坏、数据丢失或其他损失承担责任。修改快充配置、进行固件升级等高级操作前，请确保了解相关风险。

## ✨ 功能

- 🎚️ **档位控制** — 1~4 档切换，支持自定义每档风速
- 🎯 **无级调速** — 滑块 0~100% 精确调节
- 🌬️ **自然风模式** — 模拟自然风，128 点曲线自由编辑
- ⏱️ **定时关机** — 1~480 分钟倒计时
- 📊 **实时数据** — 转速、电池电压/电流/容量、充电功率、电机状态
- ⚡ **电源管理** — 快充协议开关、C 口输入输出控制
- 📱 **PWA 安装** — 添加到手机/电脑桌面，离线可用

## 🚀 使用方法

1. 用 Chrome 或 Edge 打开 [w96p.gxb.pub](https://w96p.gxb.pub)
2. 点击「连接设备」，浏览器弹窗选择风扇
3. 开始控制

> ⚠️ 需要浏览器支持 Web Bluetooth，iOS Safari / Firefox 暂不支持。

## 🛠️ 技术架构

纯前端 Web 应用，无后端、无数据库。

- **框架** — React 19 + TypeScript + Vite 8
- **状态管理** — Zustand
- **通信** — Web Bluetooth API，直接通过浏览器与风扇 BLE GATT 通信
- **UI** — Tailwind CSS 4 + Recharts 图表 + react-grid-layout 可拖拽布局
- **离线** — PWA（Service Worker + Manifest），可安装到桌面
- **字体** — MiSans

## 📦 支持设备

| 型号 | 备注 |
|------|------|
| Witrn W96P | 主要支持 |
| Witrn W66D | 兼容 |

## 📄 License

MIT

---

# BLE 协议文档

> 以下内容为完整协议参考，面向开发者。普通用户无需阅读。

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
| DFU FEE0 | `0000fee0-0000-1000-8000-00805f9b34fb` | OTA 固件升级 |

### 2. 连接流程

1. `filters: [{ name: "W96P" }]` 扫描，`optionalServices` 声明全部服务 UUID
2. 获取 PrimaryService，缓存全部 Characteristic
3. 延迟 ~1.5s 读取初始状态（定时、档位风速、自然风、休眠延时、减档模式、自然风曲线），之后 500ms 周期刷新
4. 监听 `gattserverdisconnected`，断开时清理缓存和定时器

---

### 3. 主控服务 FFF0（二进制 hex）

全部使用 `writeValue` 写入 hex 字节。多字节整数全部**大端序（Big-Endian）**。

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

调速前若自然风开启需先关闭。

示例：W96P 设 75% → `0x4B`；W66D 最低只能给 20% → `0x14`

#### 3.4 NATURE_WIND `FFF4` — 自然风开关

Read / Write · 1 字节

`00` 关闭，`01` 开启。

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

#### 4.1 NATURE_CURVE `FFE3` — 曲线

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
| 4~5 | `int16` BE | VBUS 电流 (mA)，`0x7FFF` (32767) = 未接入 |
| 6 | `uint8` | 电路通断 (1=开) |
| 7 | `uint8` | 充放电 (1=充电中) |
| 8 | `uint8` | C 口输出快充 (0=使能, 1=关闭) |
| 9 | `uint8` | C 口输入快充 (0=使能, 1=关闭) |
| 10 | `uint8` | 保留 |

写入：`POW_C_OUT=<0|1>,` / `POW_C_IN=<0|1>,`（0=使能）

#### 5.3 MOTOR_INFO `FFD3` — 电机

Read only · ≥4 字节

| 偏移 | 类型 | 含义 |
|------|------|------|
| 0~1 | `uint16` BE | 电机电流 (mA) |
| 2 | `uint8` | 堵转原始字节（取 `& 0xF7` 后为 1 表示堵转） |
| 末尾 2 字节 | `uint16` BE | 电机电压 (mV，取 `byteLength - 2`) |

电压校验 0~20000mV，超限置 0。W66D 只解析电流字段。

**电机功率计算：**

| 型号 | 公式 |
|------|------|
| W96P | 电机电压 (V) × 电机电流 (A) |
| W66D | 电池电压 (V) × 电机电流 (A) |

#### 5.4 POWER_CONFIG `FFD4` — 快充配置

> ⚠️ **警告：非官方支持**。快充配置功能为第三方逆向实现，未经 Witrn 官方授权或验证。修改这些参数可能导致充电异常、设备过热、电池损坏甚至永久性硬件故障。**强烈建议使用官方 App 进行快充相关设置。** 如仍选择修改，请确保你完全理解每个位域的含义。

Read / Write · ≥16 字节

| 偏移 | 字段 | 含义 |
|------|------|------|
| 1 | POW_VER | 固件版本 |
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
| bit4 | PD 重新广播 5V/2A | 关闭 | 使能 |
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

### 6. DFU 服务 FEE0（固件升级）

> ⚠️ **警告：非官方支持**。固件升级功能为第三方逆向实现，未经 Witrn 官方授权或验证。升级过程存在设备变砖风险，可能造成不可逆的硬件损坏。**强烈建议使用官方 App 进行固件升级。** 如仍选择使用本工具，请务必使用官方固件包并确保型号匹配，升级过程中切勿断开连接或关闭设备。

用于 OTA 固件更新，协议兼容官方 APK。

| 特征 | UUID | 属性 | 说明 |
|------|------|------|------|
| DFU_WRITE | `0000fee1-...` | Write | 发送控制命令和数据 |
| DFU_NOTIFY | `0000fee2-...` | Notify | 接收响应和状态 |

#### 控制命令（单字节，bit7=ACK 标志）

| 命令 | 值 | 说明 |
|------|-----|------|
| CTRL_NG | `0x01` | 操作失败 |
| CTRL_OK | `0x02` | 操作成功 |
| CTRL_ENTER_DFU | `0x04` | 进入 DFU 模式 |
| CTRL_CHECK_IN_DFU | `0x05` | 查询是否在 DFU 模式 |
| CTRL_START_UP | `0x07` | 开始升级 |
| CTRL_END_UP | `0x08` | 结束升级 |
| CTRL_GET_VERSION | `0x0A` | 获取固件版本 |
| CTRL_RESET | `0x0B` | 复位设备 |
| CTRL_GET_PAGE_SIZE | `0x0C` | 获取 Flash 页大小 |
| CTRL_GET_SN | `0x0F` | 获取序列号 |

命令首字节 bit7=1 表示需要 ACK 响应。

#### 数据载荷类型（payload 首字节）

| 类型 | 值 | 说明 |
|------|-----|------|
| DATA_REQ_UNLOCK | 1 | 解锁请求（96 字节固定数据） |
| DATA_WRITE_FLASH | 2 | Flash 写入数据 |
| DATA_VERSION | 4 | 版本号（后续 4 字节 ASCII） |
| DATA_PAGE_SIZE | 5 | 页大小（后续 2 字节 little-endian） |
| DATA_SN | 10 | 序列号（后续 4 字节 little-endian） |

---

### 7. 特征总览

| 特征 | UUID | 服务 | 属性 | 长度 | 编码 |
|------|------|------|------|------|------|
| POWER | FFF1 | FFF0 | W | 1B | hex |
| TIMER | FFF2 | FFF0 | R/W | 2B | hex uint16 BE |
| FAN_SPEED | FFF3 | FFF0 | R/W | 1B | hex 0~100 |
| NATURE_WIND | FFF4 | FFF0 | R/W | 1B | hex 0/1 |
| SHUTDOWN_DELAY | FFF5 | FFF0 | R/W | 2B | hex uint16 BE |
| GEAR_DOWN_MODE | FFF6 | FFF0 | R/W | 1B | hex 0/1 |
| SPEED_CALIB | FFF7 | FFF0 | R/W | 4B | hex 4×% |
| BATTERY_INFO | FFD1 | FFD0 | R/W | 8B / ASCII | 二进 / `BAT_CAP=` |
| POWER_STATUS | FFD2 | FFD0 | R/W | ≥11B / ASCII | 二进 / `POW_C_` |
| MOTOR_INFO | FFD3 | FFD0 | R | ≥4B | 二进制 |
| POWER_CONFIG | FFD4 | FFD0 | R/W | ≥16B / ASCII | 二进 / `POW_XX=` |
| NATURE_CURVE | FFE3 | FFE0 | R/W | 128B | 二进制 |
| DFU_WRITE | FEE1 | FEE0 | W | 变长 | 二进制 |
| DFU_NOTIFY | FEE2 | FEE0 | N | 变长 | 二进制 |

### 8. 通信规则

1. **写入串行** — 所有写入操作排队执行，防止 GATT 并发冲突
2. **自然风互斥** — 调档/调速前关自然风，间隔 100ms
3. **刷新周期** — 默认 500ms 轮询；写入期间快照跳过，避免乐观更新被覆盖
4. **ASCII 格式** — 电源服务写命令：`KEY=VALUE,`（末尾逗号），UTF-8
5. **位域写** — POW 寄存器先读后掩码改，再整体写
6. **重试** — 单次写入失败重试最多 3 次，间隔 200ms；NATURE_CURVE 读取额外重试 2 次
7. **电压校验** — 电机电压 >20000mV 视为脏数据置 0
8. **VBUS 哨兵** — VBUS 电流为 `0x7FFF` (32767) 表示 VBUS 未接入，前端显示为 0
9. **V3.4 行为** — 风扇关机时调转速，自动先开机到 1 档再调速

### 9. 默认值

| 参数 | W96P | W66D |
|------|------|------|
| 档位风速 | 10 / 35 / 70 / 100 | 30 / 50 / 70 / 100 |
| 风速范围 | 0 ~ 100 | 20 ~ 90 |
| 电池容量 | 17200 mWh | 17200 mWh |
| 轮询间隔 | 500ms | 500ms |
| POW_1A | `0x1C` | `0x1C` |
| POW_1C | `0x00` | `0x00` |
| POW_1D | `0x00` | `0x00` |
| POW_1E | `0x00` | `0x00` |
| POW_2A | `0x00` | `0x00` |
| POW_2B | `0x10` | `0x10` |
| POW_2C | `0x04` | `0x04` |

多设备识别在 `src/ble/profiles.ts`，按 `device.name` 匹配，未知型号走 W66D。
