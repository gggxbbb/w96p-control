# W96P 控制

> W96P / W66D 蓝牙风扇协议逆向与 Web 上位机。基于 Web Bluetooth API，浏览器直连设备。

## 协议文档

本项目的核心资产是 [W96P 蓝牙协议文档](../W96P_蓝牙协议文档.md)，完整记录了三服务十二特征的 GATT 协议栈：

| 文件 | 内容 |
|------|------|
| [W96P_蓝牙协议文档.md](../W96P_蓝牙协议文档.md) | 完整 GATT 协议规格：3 服务 12 特征，二进制/ASCII 双编码，大端字节序 |
| [W96P_vs_W66D_协议兼容性分析.md](../W96P_vs_W66D_协议兼容性分析.md) | W96P 与 W66D 协议层字节级兼容性、业务调校差异与统一上位机策略 |

### 协议要点

| 项目 | 说明 |
|------|------|
| 服务 | FFF0（主控·二进制）、FFD0（电源·ASCII 命令末尾带 `,`）、FFE0（自然风） |
| 特征 | FFF1-7 / FFD1-4 / FFE3，共 12 个 GATT Characteristic |
| 字节序 | **大端（Big-Endian）**，DataView `getUint16(off, false)` |
| 位域寄存器 | POW_1A/1C/1D/1E/2A/2B/2C 为位域，写前必须读-改-写 |
| 互斥逻辑 | 调档/调速前先写 NATURE_WIND=00，间隔 100ms |
| 多设备 | `profiles.ts` 按设备名加载 profile，未知型号走 W66D 保守包 |

## 功能

- 风扇开关、4 档位、无级调速、定时关机、蓝牙休眠
- 128 点自然风曲线编辑器（Canvas 拖拽 + 文本编辑双模式）
- 电池/电机/VBUS 实时监控 + 堵转检测
- 7 个快充寄存器（PD/FCP/AFC/SCP/SFCP/QC）位域可视化配置
- 拖放/缩放仪表盘布局，每页独立持久化
- PWA 离线可用，深色/浅色主题

## 开发

```bash
pnpm install
pnpm dev          # https://localhost:5173
pnpm tsc --noEmit # 类型检查
pnpm vite build   # 生产构建
```

> Web Bluetooth API 需要 HTTPS 或 localhost。

## 技术栈

React 19 + TypeScript + Vite 8 + Zustand + react-grid-layout + Tailwind CSS 4 + Recharts · 字体 MiSans · PWA

## 浏览器兼容

Chrome 56+ / Edge 79+ / Opera 43+（Safari / Firefox 暂不支持 Web Bluetooth API）

## License

MIT
