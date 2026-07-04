/**
 * BLE GATT 服务与特征 UUID
 *
 * W96P/W66D 风扇使用 4 个主要 GATT 服务：
 *   - FFF0：主风扇控制（电源、定时、调速、自然风等）
 *   - FFD0：电源/电池监控
 *   - FFE0：自然风曲线
 *   - FEE0：DFU 固件升级 / 设备信息查询
 *   - FFC0：蓝牙配置（v1.3+）
 */

/** GATT 服务 UUID */
export const SERVICES = {
  /** 主风扇控制服务 */
  MAIN: '0000fff0-0000-1000-8000-00805f9b34fb',
  /** 电源/电池监控服务 */
  POWER: '0000ffd0-0000-1000-8000-00805f9b34fb',
  /** 自然风曲线服务 */
  NATURE: '0000ffe0-0000-1000-8000-00805f9b34fb',
  /** DFU 固件升级 / 设备信息查询服务 */
  DFU: '0000fee0-0000-1000-8000-00805f9b34fb',
  /** v1.3+ 蓝牙名称/序列号配置服务 */
  BLE_NAME: '0000ffc0-0000-1000-8000-00805f9b34fb',
} as const;

/** GATT 特征 UUID */
export const CHARS = {
  /** 开关/档位 (FFF1) */
  POWER: '0000fff1-0000-1000-8000-00805f9b34fb',
  /** 定时 (FFF2) */
  TIMER: '0000fff2-0000-1000-8000-00805f9b34fb',
  /** 风扇转速 (FFF3) */
  FAN_SPEED: '0000fff3-0000-1000-8000-00805f9b34fb',
  /** 自然风开关 (FFF4) */
  NATURE_WIND: '0000fff4-0000-1000-8000-00805f9b34fb',
  /** 关机延迟 (FFF5) */
  SHUTDOWN_DELAY: '0000fff5-0000-1000-8000-00805f9b34fb',
  /** 降档模式 (FFF6) */
  GEAR_DOWN_MODE: '0000fff6-0000-1000-8000-00805f9b34fb',
  /** 档位风速校准 (FFF7) */
  SPEED_CALIB: '0000fff7-0000-1000-8000-00805f9b34fb',
  /** v1.3+ Turbo 时间 (FFF8) */
  TURBO_TIME: '0000fff8-0000-1000-8000-00805f9b34fb',
  /** v1.3+ Turbo 模式开关 (FFFC, v1.6+ 替代 FFFC) */
  TURBO_MODE: '0000fffc-0000-1000-8000-00805f9b34fb',
  /** v1.3+ 临时关灯 (FFFA) */
  LIGHT_OFF: '0000fffa-0000-1000-8000-00805f9b34fb',
  /** v1.5+ Turbo 剩余倒计时 (FFFB, 只读) */
  TURBO_COUNTDOWN: '0000fffb-0000-1000-8000-00805f9b34fb',
  /** 电池信息 (FFD1) */
  BATTERY_INFO: '0000ffd1-0000-1000-8000-00805f9b34fb',
  /** 电源状态 (FFD2) */
  POWER_STATUS: '0000ffd2-0000-1000-8000-00805f9b34fb',
  /** 电机信息 (FFD3) */
  MOTOR_INFO: '0000ffd3-0000-1000-8000-00805f9b34fb',
  /** 电源配置寄存器 (FFD4) */
  POWER_CONFIG: '0000ffd4-0000-1000-8000-00805f9b34fb',
  /** 自然风曲线 (FFE3) */
  NATURE_CURVE: '0000ffe3-0000-1000-8000-00805f9b34fb',
  /** 自然风累计点数 (FFE1) */
  NATURE_WIND_SUM: '0000ffe1-0000-1000-8000-00805f9b34fb',
  /** 自然风运行时长 (FFE2) */
  NATURE_WIND_TIME: '0000ffe2-0000-1000-8000-00805f9b34fb',
  /** 自然风控制 (FFE4) */
  NATURE_WIND_CTRL: '0000ffe4-0000-1000-8000-00805f9b34fb',
  /** v1.3+ 蓝牙名称/序列号特征 (FFC1) */
  BLE_NAME: '0000ffc1-0000-1000-8000-00805f9b34fb',
  /** DFU 写入特征 (FEE1) */
  DFU_WRITE: '0000fee1-0000-1000-8000-00805f9b34fb',
  /** DFU 通知特征 (FEE2) */
  DFU_NOTIFY: '0000fee2-0000-1000-8000-00805f9b34fb',
} as const;

/** v1.3+ 可选特征（旧固件不存在，发现时用 try/catch） */
export const OPTIONAL_CHARS = [
  CHARS.TURBO_TIME,
  CHARS.TURBO_MODE,
  CHARS.LIGHT_OFF,
  CHARS.TURBO_COUNTDOWN,
] as const;

/** 所有 GATT 服务 UUID 列表（用于 BLE 请求时声明 optionalServices） */
export const ALL_OPTIONAL_SERVICES = Object.values(SERVICES);

/** 主服务 UUID（便捷导出） */
export const MAIN_SERVICE = SERVICES.MAIN;
/** DFU 服务 UUID（便捷导出） */
export const DFU_SERVICE = SERVICES.DFU;
/** DFU 写入特征 UUID（便捷导出） */
export const DFU_WRITE = CHARS.DFU_WRITE;
/** DFU 通知特征 UUID（便捷导出） */
export const DFU_NOTIFY = CHARS.DFU_NOTIFY;
