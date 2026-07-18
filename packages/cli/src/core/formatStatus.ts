/**
 * 状态格式化（纯函数）
 *
 * 把会话状态与设备快照格式化为展示行，TUI 状态面板与 status 命令共用。
 * 缺失字段一律显示占位符（—），以区分"没读到"与"不支持"。
 */

import type { BleSnapshot } from '@gggxbbb/w96p-ble-sdk';
import type { SessionState } from './session.js';

const STATE_LABEL: Record<string, string> = {
  idle: '未连接',
  connecting: '连接中…',
  connected: '已连接',
  error: '错误',
};

const POW_STA_LABEL: Record<number, string> = {
  0: '停止',
  1: '充电',
  2: '放电',
};

const onOff = (v: boolean | undefined): string => (v === undefined ? '—' : v ? '开' : '关');
const enableMark = (v: boolean): string => (v ? '✓' : '✗');

export function formatStatusLines(s: SessionState, snap: BleSnapshot): string[] {
  if (!s.connected) return [STATE_LABEL[s.state] ?? s.state];

  const head = `${STATE_LABEL[s.state]}  ${s.deviceName ?? '未知设备'}  ${s.isCompat ? '兼容模式(W66D)' : '标准模式'}  固件 ${snap.firmwareVersion ?? '—'}  SN ${snap.serialNumber ?? '—'}`;

  const speed = snap.fanSpeed === undefined ? '—' : `${snap.fanSpeed}%`;
  const timer =
    snap.timerRemainingSec === undefined
      ? '—'
      : `${Math.floor(snap.timerRemainingSec / 60)}:${String(snap.timerRemainingSec % 60).padStart(2, '0')}`;
  const delay = snap.shutdownDelaySec === undefined ? '—' : `${snap.shutdownDelaySec}s`;
  const turbo = snap.turboCountdownSec === undefined ? '—' : `${snap.turboCountdownSec}s`;
  const runLine = `转速 ${speed}  自然风 ${onOff(snap.natureWindOn)}  定时 ${timer}  关机延迟 ${delay}  降档 ${snap.gearDownMode === undefined ? '—' : snap.gearDownMode}  Turbo ${turbo}`;

  const bat = snap.battery;
  const batLine = bat
    ? `电池 ${(bat.voltageMv / 1000).toFixed(2)}V  ${bat.currentMa >= 0 ? '+' : ''}${bat.currentMa}mA  ${bat.tempC}℃  剩余 ${bat.rcapMwh}/${bat.capacityMwh}mWh`
    : '电池 —';

  const pwr = snap.powerStatus;
  const pwrLine = pwr
    ? `电源 ${pwr.vbusConnected ? `VBUS ${(pwr.vbusVmV / 1000).toFixed(2)}V/${pwr.vbusCurMa}mA` : 'VBUS 未接'}  ${POW_STA_LABEL[pwr.powSta] ?? pwr.powSta}  C入${enableMark(pwr.powCIn)} C出${enableMark(pwr.powCOut)} 高压${enableMark(pwr.powCHi)}`
    : '电源 —';

  const motor = snap.motor;
  const motorLine = motor
    ? `电机 ${motor.currentMa}mA  ${s.isCompat ? '—' : `${(motor.voltageMv / 1000).toFixed(2)}V`}  ${motor.block ? '堵转!' : '正常'}`
    : '电机 —';

  const calib = snap.speedCalib ? `[${snap.speedCalib.join(' ')}]` : '—';
  const miscLine = `校准 ${calib}  BLE_SN ${onOff(snap.bleSnEnabled)}`;

  return [head, runLine, batLine, pwrLine, motorLine, miscLine];
}
