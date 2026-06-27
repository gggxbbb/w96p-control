# W96P 控制

> W96P / W66D 蓝牙风扇的 Web 上位机。基于 Web Bluetooth API，浏览器直连设备，无需安装。

工业风深色 UI，支持双设备 profile，PWA 离线可用。

## 功能

### 主控（FFF0 服务）
- 开关与 4 档位控制
- 转速无级调节（0-100%）
- 定时关机（1-480 分钟，含 1h/4h 预设）
- 蓝牙自动休眠延时（10-65535 秒）
- 减档模式（逐级 / 直接回 0）
- 档位风速校准（4 档独立百分比）
- 自然风开关与 128 点曲线编辑器

### 电源（FFD0 服务）
- 电池电压 / 电流 / 容量实时监控
- VBUS 电压 / 电流 + 充放电状态
- 电机电流 / 电压 / 功率 / 堵转检测
- 电池容量配置（mAh × V → mWh）
- C 口快充输入/输出开关
- 7 个 POW 寄存器位域可视化配置（PD/FCP/AFC/SCP/SFCP/QC 协议级开关）

### 扩展能力
- **多设备 profile**：自动识别 W96P / W66D，按设备调校加载业务参数，未知型号走保守包
- **历史数据**：时序图表，可切换数据源与时间窗
- **PWA**：可安装到桌面/主屏幕，离线缓存
- **主题**：深色为主，可切浅色
- **可见性优化**：页面隐藏时自动暂停轮询，恢复时按连接状态重启

## 技术栈

- **构建**：Vite 5 + React 18 + TypeScript（strict）
- **样式**：Tailwind CSS v4（CSS 变量驱动主题）
- **状态**：Zustand（3 store：连接 / 设备 / 设置）
- **路由**：React Router v6（懒加载）
- **图表**：Recharts
- **字体**：MiSans（小米开源字体）
- **PWA**：vite-plugin-pwa
- **测试**：Vitest + Testing Library

## 架构

```
src/
├─ ble/          # 协议层（纯 TS，零 React 依赖，可单测）
│  ├─ uuids.ts       # GATT 服务与特征 UUID 常量
│  ├─ parsers.ts     # DataView → 强类型业务对象
│  ├─ commands.ts    # ASCII 命令构造器
│  ├─ writer.ts      # WriteQueue 串行化 + 互斥 + 重试
│  ├─ profiles.ts    # W96P / W66D 业务调校包
│  └─ manager.ts     # 连接生命周期 + 1s 轮询
├─ stores/       # Zustand stores
├─ hooks/        # useBle / usePolling / useToast
├─ components/   # UI 组件（ui / layout / fan / nature-wind / power）
├─ pages/        # 路由级页面（懒加载）
├─ app/          # 路由配置与 Provider
└─ styles.css    # Tailwind 入口 + 主题 token
```

协议层 `src/ble/` 与 UI 完全解耦，可独立测试，未来可抽成 npm 包给其他项目复用。

## 开发

```bash
pnpm install
pnpm dev          # 启动开发服务器（https://localhost:5173）
```

> Web Bluetooth API 需要 HTTPS 或 localhost。`vite.config.ts` 已开启 HTTPS。

### 代码质量

提交前必须通过三道关卡：

```bash
pnpm tsc --noEmit      # 类型检查
pnpm eslint .          # 代码规范
pnpm vite build        # 生产构建
```

### 测试

```bash
pnpm vitest run        # 单次运行
pnpm vitest            # watch 模式
```

协议层（`src/ble/`）全部纯函数有单测覆盖，包含正常路径与边界降级。

## 浏览器兼容

- Chrome 56+（桌面 / Android）
- Edge 79+
- Opera 43+

> Safari 与 Firefox 暂不支持 Web Bluetooth API。

## 协议文档

- [W96P 蓝牙协议文档](../W96P_蓝牙协议文档.md) — 完整 GATT 协议逆向整理
- [W96P vs W66D 兼容性分析](../W96P_vs_W66D_协议兼容性分析.md) — 多设备差异与统一上位机实现建议
- [设计文档](docs/plans/2026-06-27-w96p-react-control.md) — 项目架构与实施计划

## 项目背景

本项目是 W96P 风扇内测期间的官方上位机重构。原版基于 3 个单文件 HTML 控制程序，本 React 版整合所有功能并扩展多设备、历史数据、PWA 等能力。

W96P 与同品牌 W66D 共享同一套 BLE GATT 协议栈，命令可互发，但业务调校存在产品级差异（风速范围、档位默认值、电机解析完整度）。本上位机通过 `profiles.ts` 按设备名加载对应调校包，避免越界与偏差。

## License

MIT
