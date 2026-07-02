# W96P 电池电量估计方案

## 1. 概述

传统 Coulomb 计数（安时积分）通过持续跟踪电流的累积来估计剩余容量。其致命弱点是**必须连续跟踪**——一旦 BLE 断连或浏览器切后台，累积值冻结，重连后产生不可恢复的偏移。

本文档描述一种**基于电压分段能量密度的自学习方案**，彻底消除了对连续跟踪的依赖。

---

## 2. 核心思想

### 2.1 电压转移记录

不按电压 bin 累加，而是以**电压跨度**（fromMv → toMv）为单位记录能量消耗。每条转移记录描述"从 mV A 降到 mV B 期间消耗了多少 mWh"。

```
转移记录:  { fromMv, toMv, mwh }
放电转移:  dischargeTransitions[]
充电转移:  chargeTransitions[]
```

### 2.2 与 Coulomb 计数的本质区别

| | Coulomb 计数 | 电压转移方案 |
|---|---|---|
| 状态依赖 | 需要连续跟踪当前剩余量 | 每条转移独立，无全局状态 |
| 断连恢复 | 首帧跳过，后续弱校准慢慢拉回 | 重连后电压落在哪个区间就继续记录 |
| 数据累积 | 需要完整充放循环 | 任意片段放电都有效 |
| 精度提升 | 需要满充锚点校准 | 越用越准，多条转移自动平均 |
| 浏览器后台 | 积分值冻结，漂移 | 不受影响，重连后继续记录 |
| 电压跳变 | 跳变的帧无法合理解释 | 天然支持——跳变就是大跨度转移 |

---

## 3. 数据结构

```typescript
interface TransitionEntry {
  fromMv: number;   // 起始电压 (mV)
  toMv: number;     // 结束电压 (mV)
  mwh: number;      // 该跨度消耗的能量 (mWh)
}

interface DeviceLearnData {
  _version: 2;
  configuredCapacityMwh: number;     // 用户配置的标称容量
  chargeEfficiency: number;          // 充电效率 (0.5–1.0)
  cycleCount: number;                // 完成满充次数
  state: 'idle' | 'tracking' | 'paused';  // 学习状态

  dischargeTransitions: TransitionEntry[];  // 放电转移记录（不清空，持续累积）
  chargeTransitions: TransitionEntry[];     // 充电转移记录（满充时清空）

  lastTickTs: number;                // 上次 tick 时间戳 (ms)
  lastDeltaMwh: number;              // 上一帧 delta 能量（UI 显示用，带符号）

  // ---- 内部状态（不持久化到导出）----
  pendingFromMv: number;   // 当前方向的起始 mV
  pendingMwh: number;      // 当前方向累积未提交的能量
  direction: number;       // +1 上升, -1 下降, 0 未知
  pendingIsCharging: boolean;  // pending 段的充放电状态（用于检测状态切换）
}
```

注意：不再有 `calibrated` 字段（已废弃）和 `learnedCapacityMwh` 存储字段（已改为从曲线实时计算）。`learnedCapacityMwh` 仅在序列化数据中保留用于向后兼容。

---

## 4. 数据采集（Tick 逻辑）

每次 BLE 轮询到达时触发一次 tick。

### 4.1 前置检查

```
if |currentMa| < 10mA:    跳过（无有效电流）
if dtSec > 60s:            跳过（视为断连，避免大间隔积分失真）
if dtSec == 0 (首帧):      仅初始化时间戳，不做积分
if state === 'paused':     跳过
```

### 4.2 能量积分

```
deltaMwh = voltageMv × |currentMa| × dtSec / 3_600_000
curMv = round(voltageMv)
```

### 4.3 转移提交逻辑

核心思路：**不逐 mV 写入，而是在电压离开当前 mV 时一次性记录整段转移**。

```
if pendingFromMv === 0:
    // 首次进入 → 初始化方向
    pendingFromMv = curMv
    pendingMwh = deltaMwh
    return

// 判断当前方向
dir = sign(curMv - pendingMv)

if dir !== 0 && oldDirection !== 0 && dir !== oldDirection:
    // 方向反转（如放电中电压突然上升）→ 丢弃 pending，重新开始
    pendingFromMv = curMv, pendingMwh = deltaMwh, direction = dir
    return

if curMv === pendingFromMv:
    // 同 mV 停留 → 继续累积能量
    pendingMwh += deltaMwh
    return

// mV 变化 → 提交转移记录
commit: { fromMv: pendingFromMv, toMv: curMv, mwh: pendingMwh + deltaMwh }
写入 dischargeTransitions 或 chargeTransitions（根据 isCharging 标志）
重置: pendingFromMv = curMv, pendingMwh = 0, direction = dir
```

### 4.3.1 充放电状态变化检测

当 `isCharging` 在一帧内变化（充电⇄放电），只靠电压方向检测不够——电压可能不变但状态变了。

```
if isCharging !== pendingIsCharging:
    if curMv !== pendingFromMv:
        // mV 也变了 → 旧 pending 提交到旧状态列表
        提交: { fromMv: pendingMv, toMv: curMv, mwh: pendingMwh } → 旧列表
        // 当前帧 deltaMwh 归新状态
        pendingFromMv = curMv, pendingMwh = deltaMwh, pendingIsCharging = isCharging
    else:
        // 同 mV → 无法产生有效转移，丢弃 pending
        pendingFromMv = curMv, pendingMwh = deltaMwh, pendingIsCharging = isCharging
```

关键：只提交旧状态累积的 `pendingMwh`，当前帧的 `deltaMwh` 永远属于新状态，不混入。

### 4.4 电压跳变的天然处理

由于不逐 mV 累加，跳变直接变成大跨度的转移：

```
从 3700 跳变到 3650（跳过 3699-3651）:
  → 产生一条转移: { fromMv: 3700, toMv: 3650, mwh: 105.3 }
```

曲线构建时，这条转移的能量会被均分到 3700-3650 之间的每个 mV。

---

## 5. 满充检测

```
条件: isCharging && voltageMv ≥ 4100 && |currentMa| < 500
```

触发动作：

1. **计算充电效率**（EMA 平滑，新数据权重 0.25）：
   ```
   rawEff = totalDischargeMwh / totalChargeMwh
   chargeEfficiency = chargeEfficiency × 0.75 + rawEff × 0.25
   ```
   其中 `totalDischargeMwh` 从累积曲线最高点取值（而非裸转移累加），`totalChargeMwh` 为充电转移之和。

2. **清空充电转移**（重置 `chargeTransitions = []`，为下一周期准备）

3. **重置 pending 状态**（pendingFromMv=0, pendingMwh=0, direction=0）

4. `cycleCount += 1`

**放电转移不清空**——数据持续累积，越用越准。

**学习容量和健康度不再在满充时写入存储**——这两个值改为从累积曲线实时计算（见第 6 节和第 8 节）。

---

## 6. 累积曲线构建与实时查询

### 6.1 重叠均分算法

从转移记录构建电压→累积消耗的映射：

```
1. 遍历所有转移，每条转移的 mwh 均分到其 [min(from,to), max(from,to)) 区间
   → perMv = mwh / span
   → 每个 mV 收集所有覆盖它的转移的 perMv 值

2. 对每个 mV，取所有覆盖值的算术平均
   → avgPerMv[mv] = mean(所有覆盖该 mV 的 perMv)

3. 从最低电压到最高电压（SOC_TABLE 的完整范围）遍历：
   - 有实测数据的 mV：用 avgPerMv[mv]
   - 空白 mV：用 VTC6 参考曲线斜率填充
   → 累加得到累积曲线
```

### 6.2 空白区间填充

对于没有采样数据的 mV，用 VTC6 参考曲线（SOC_TABLE）的斜率：

```
refMwhPerMv(vLow, vHigh) = (ΔSOC% × capacityMwh / 100) / ΔmV
```

- 有实测数据的 mV：用学习值
- 无实测数据的 mV：用参考曲线斜率
- 数据点越多，纯参考的电压区间越窄

### 6.3 曲线数据格式

```typescript
interface CurvePoint {
  voltageMv: number;      // 电压 (mV)
  remainingMwh: number;   // 从最低电压放电到此处的累计消耗 (mWh)
  fromData: boolean;      // 该点是否有实测数据
}
```

### 6.4 实时电量查询

每次渲染时调用 `buildCumulativeCurve(dischargeTransitions, capacityMwh)` 构建曲线，从中实时计算所有指标（不做存储快照）：

```
curve = buildCumulativeCurve(dischargeTransitions, capacityMwh)

学习容量 = curve 最高点的 remainingMwh
剩余容量 = curve 中 voltageMv ≤ currentMv 的最大 remainingMwh
电量百分比 = 剩余容量 / 学习容量 × 100
健康度 = 学习容量 / 标称容量 × 100
```

对外通过 `useBatteryLearn()` hook 暴露，零参数自动绑定当前设备：

```typescript
const { socPct, remainingMwh, learnedCapacityMwh, healthPct, coverage, credibility } = useBatteryLearn();
```

---

## 7. 充电效率

```
chargeEfficiency = 总放电能量 / 总充电能量
```

- 初始值 0.92（默认 92% 效率）
- 每次满充时用 EMA 更新（新权重 0.25）
- 范围约束到 [0.5, 1.0]

---

## 8. 健康度

健康度（SOH）实时计算，无需满充触发：

```
健康度 = 学习容量(曲线最高点) / 标称容量 × 100%
```

- 随着转移记录增多，学习容量逐步逼近真实值
- 不需要覆盖率阈值，有数据就有值
- 无数据时返回 null

---

## 9. 可信度评估

```
baseScore        = 12 + coverage × 43          // 覆盖率 0%→12, 100%→55
cycleBonus       = min(cycleCount, 4) × 8
densityBonus     = min(12, transitionsLength / 5)
coverage         = min(1.0, (maxMv - minMv) / 1200)
freshness        = lastTickTs 在 60 天内 → 1.0，否则 → 0.6

credibility = min(100, (baseScore + cycleBonus + densityBonus) × coverage × freshness)
```

baseScore 随覆盖率连续增长：没有数据时 12 分，全电压覆盖时 55 分。

| 可信度 | 含义 |
|---|---|
| 0–30 | 几乎无数据，完全依赖 VTC6 参考 |
| 30–60 | 少量放电数据，覆盖部分电压区间 |
| 60–85 | 多次放电，大部分区间有实测 |
| 85–100 | 经过满充校准，全区间覆盖，最近活跃 |

---

## 10. 大间隔重连

当 `dtSec > 60s` 时 tick 直接跳过（不积分），但 BLE 重连后下一帧如果是有效数据就会继续记录。电压落在哪个 mV 就从哪个 mV 开始新的 pending 段——无需特殊校准逻辑。

---

## 11. 数据持久化

- Zustand `persist` 中间件，按设备序列号分区存储到 `localStorage`
- Key: `w96p-battery-learn-v2`
- 迁移兼容：`_version` 字段控制，旧版本数据自动重建

---

## 12. 优势总结

1. **无需连续跟踪**：每次 tick 独立，断连不丢状态
2. **抗电压跳变**：跳变直接记录为大跨度转移，无需特殊处理
3. **自然纠错**：多个转移覆盖同一 mV 时自动取平均，异常值被稀释
4. **方向处理**：电压抖动导致的方向反转自动丢弃 pending，防止错误累积
5. **渐进学习**：从 VTC6 参考曲线开始，实测数据逐步替换，越用越准
6. **实时健康度**：基于累积曲线实时计算，无需等待满充
7. **浏览器友好**：后台节流、切标签页均不影响数据完整性
8. **轻量存储**：转移记录而非每 mV 数组，数据量随使用时间而非电压范围增长
