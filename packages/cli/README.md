# @gggxbbb/w96p-cli

W96P / W66D BLE 风扇的 Node.js 调试工具：**交互式 TUI** + **MCP server** 双模式。

基于 [@gggxbbb/w96p-ble-sdk](https://www.npmjs.com/package/@gggxbbb/w96p-ble-sdk) 与 [webbluetooth](https://github.com/thegecko/webbluetooth)(SimpleBLE N-API 预编译，免本地编译）。

## 运行

无需安装，直接 npx:

```bash
npx -y @gggxbbb/w96p-cli           # TUI 模式（默认）
npx -y @gggxbbb/w96p-cli --mcp     # MCP server 模式
npx -y @gggxbbb/w96p-cli --virtual # 虚拟设备（无硬件演示）
```

或全局安装：

```bash
npm install -g @gggxbbb/w96p-cli
w96p-cli --mcp
```

要求：Node.js ≥ 20，一个可用的蓝牙适配器（Windows / macOS / Linux x64·arm64)。

## TUI 模式

```bash
w96p-cli                # 自动扫描：多台设备弹方向键菜单，单台自动连接
w96p-cli --name W96P    # 按名称子串匹配，跳过菜单直连
w96p-cli --poll 1000    # 状态轮询间隔（默认 500ms，与 Web 端一致）
```

界面三区：顶部状态面板（转速/电池/电源/电机/固件等实时快照）、左下日志面板（命令与结果）、右下诊断面板（SDK 内部日志）。

### 命令一览

输入 `help` 查看全部。常用：

| 命令 | 说明 |
|------|------|
| `speed <0-100>` / `gear <0-4>` | 转速百分比 / 档位（0=关机） |
| `timer <秒>` / `delay <秒>` | 定时 / 关机延迟 |
| `nature <on\|off>` | 自然风 |
| `geardown <on\|off>` / `calib <a b c d>` | 降档模式 / 档位校准 |
| `battcap <mAh> <V>` / `powswitch <名> <on\|off>` | 电池容量 / 电源寄存器开关 |
| `turbo` / `turbotime` / `light` / `blename` / `blesn` | 固件可选功能（v1.3+） |
| `scan [秒]` / `connect [名]` / `disconnect` / `rescan` | 扫描与连接管理 |
| `status` / `clear` / `exit` | 快照 / 清屏 / 退出 |

## MCP server 模式

`--mcp` 下以 stdio 传输启动 MCP server,stdout 仅供协议、日志走 stderr。供 AI agent 直接操作风扇。

### 客户端配置示例

```json
{
  "mcpServers": {
    "w96p": {
      "command": "npx",
      "args": ["-y", "@gggxbbb/w96p-cli", "--mcp"]
    }
  }
}
```

### 工具与推荐节奏

工具与 TUI 命令一一对应（`fan_` 前缀）:`fan_scan`、`fan_connect`、`fan_disconnect`、`fan_status`、`fan_speed`、`fan_gear`、`fan_timer`、`fan_nature` 等 19 个。

```text
fan_scan({windowSec: 5})   → 探活：返回附近风扇列表（不连接）
fan_connect({name?})       → 连接（返回时快照已就绪）
fan_status({})             → 完整状态快照（JSON）
fan_speed({pct: 30})       → 操作设备
fan_disconnect({})         → 断开
```

连接生命周期由 agent 显式管理：未连接时调用设备工具会返回结构化错误。

## 注意事项

- **首次连接可能耗时数秒**:Windows 下蓝牙栈首个扫描 watcher 存在启动延迟，内置重试循环会自动恢复，无需干预
- **单进程单设备**:TUI 与 MCP 互斥运行（BLE 外设通常只接受一个连接）
- **不支持 DFU/OTA**（固件升级请用 Web 端）
- macOS / Linux 有预编译二进制，但未实测，问题请提 issue

## 许可

MIT
