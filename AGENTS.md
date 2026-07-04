# w96p-control Agent Rules

## BLE GATT 操作必须走调度器

所有 `timedRead` / GATT 读写都必须通过 `GattScheduler` 的三个队列之一：

| 方法 | 用途 |
|------|------|
| `this.scheduler.enqueueWrite(task)` | 用户写入，最高优先级 |
| `this.scheduler.enqueueRead(task)` | 用户显式读取，中等优先级 |
| `this.scheduler.enqueuePoll(task)` | 轮询读取，最低优先级 |

**禁止**在任何地方裸调 `this.chars.get(uuid).readValue()` 或 `this.timedRead()` 而不包一层 `enqueueRead`/`enqueuePoll`/`enqueueWrite`。否则会和正在进行的其他 GATT 操作冲突 → `GATT operation already in progress` → catch 返回默认值 → UI 静默失败。

**例外**：`detectCompatMode()` 在 `connect()` 中、轮询启动前执行，没有并发问题，可以裸调。

新建方法对照已有方法的模式：
- `readTimer` / `readBleSn` 之类 → `scheduler.enqueueRead`
- `pollOnce` 里的批量读 → `scheduler.enqueuePoll`
- `sendDfu` → `scheduler.enqueueWrite`

## 状态管理

- 设备状态全部走 `useDeviceStore`（Zustand）
- **不要手写 `localStorage`**——Zustand 就是状态管理
- 组件读取设备状态用 `useDeviceStore((s) => s.xxx)`，不要自己发 GATT 请求（全局轮询已经读过了）

## 状态推断 vs 直接读取

- 能从已有 store 字段推断的状态就不要重复读 GATT
- 能从设备特征直接读回来的就不要猜（如 BLE_SN 读 FFC1，不是查设备名）

## 目录结构

```
packages/sdk/  ← BLE/DFU 协议 SDK（@gggxbbb/w96p-ble-sdk）
src/           ← React UI + app 层胶水
  stores/      ← SDK store re-export + app-only stores
  hooks/       ← React hooks（useBle 等胶水）
  components/  ← UI 组件
```

SDK 只包含协议逻辑，不依赖 React。App 层只做 UI 和胶水，不包含 BLE 协议细节。
