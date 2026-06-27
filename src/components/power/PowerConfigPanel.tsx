import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { SegBtn } from '../ui/SegBtn';
import { POW_SWITCHES, POW_SEGS, REG_TITLES, type PowSwitchDef, type PowSegDef } from '../../ble/powSwitches';
import type { PowReg } from '../../ble/commands';

export function PowerConfigPanel() {
  const { setPowSwitch, setPowRegister } = useBle();
  const powerConfig = useDeviceStore((s) => s.powerConfig);
  const show = useToastStore((s) => s.show);

  if (!powerConfig) {
    return <Card title="快充配置"><div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>等待数据...</div></Card>;
  }

  // 按 reg 分组
  const regs: PowReg[] = ['1A', '1C', '1D', '1E', '2A', '2B', '2C'];
  const switchesByReg = (reg: PowReg): PowSwitchDef[] => POW_SWITCHES.filter((s) => s.reg === reg);
  const segsByReg = (reg: PowReg): PowSegDef[] => POW_SEGS.filter((s) => s.reg === reg);

  const getRegValue = (reg: PowReg): number => {
    const map: Record<PowReg, number> = {
      '1A': powerConfig.pow1A, '1C': powerConfig.pow1C, '1D': powerConfig.pow1D,
      '1E': powerConfig.pow1E, '2A': powerConfig.pow2A, '2B': powerConfig.pow2B, '2C': powerConfig.pow2C,
    };
    return map[reg];
  };

  const isBitSet = (reg: PowReg, bit: number): boolean => (getRegValue(reg) & (1 << bit)) !== 0;

  const handleSwitch = (def: PowSwitchDef, on: boolean) => {
    // on=true 表示用户想"使能"
    // writePowSwitch(reg, bit, enable, inverted): enable=true 表示使能
    setPowSwitch(def.reg, def.bit, on, !!def.inverted);
    show(`${def.label} 已${on ? '使能' : '关闭'}`);
  };

  const handleSeg = (def: PowSegDef, value: number) => {
    const cur = getRegValue(def.reg);
    const mask = ((1 << def.bitWidth) - 1) << def.bitOffset;
    const next = (cur & ~mask) | (value << def.bitOffset);
    setPowRegister(def.reg, next);
    show(`${def.label} 已设置`);
  };

  const getSegValue = (def: PowSegDef): number => {
    const cur = getRegValue(def.reg);
    const mask = (1 << def.bitWidth) - 1;
    return (cur >> def.bitOffset) & mask;
  };

  // 当前协议显示
  const sinkNames = ['非快充', 'PD Sink', '', 'HV Sink', 'AFC Sink', 'FCP Sink', 'SCP Sink', 'PE1.1 Sink'];
  const srcNames = ['非快充', 'PD Source', 'PPS Source', 'QC2.0', 'QC3.0', 'FCP', 'PE2.0/1.1', 'SFCP', 'AFC', 'SCP', 'LVDC1'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Card title="当前快充协议">
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <span>输入：<span style={{ color: 'var(--color-accent)' }}>{sinkNames[powerConfig.powSink] ?? '未知'}</span></span>
          <span>输出：<span style={{ color: 'var(--color-accent)' }}>{srcNames[powerConfig.powSrc] ?? '未知'}</span></span>
          <span>PD 版本：<span style={{ color: 'var(--color-text)' }}>{(powerConfig.pow2A & 0x40) ? 'PD2.0' : 'PD3.0'}</span></span>
        </div>
      </Card>

      {regs.map((reg) => {
        const switches = switchesByReg(reg);
        const segs = segsByReg(reg);
        if (switches.length === 0 && segs.length === 0) return null;
        return (
          <Card key={reg} title={REG_TITLES[reg]} subtitle={`当前值 0x${getRegValue(reg).toString(16).padStart(2, '0').toUpperCase()}`}>
            {switches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: segs.length > 0 ? '12px' : 0 }}>
                {switches.map((def) => {
                  const bitSet = isBitSet(def.reg, def.bit);
                  // inverted: 位=0 表示使能，所以 enabled = !bitSet
                  // 非 inverted: 位=1 表示使能，所以 enabled = bitSet
                  const enabled = def.inverted ? !bitSet : bitSet;
                  return (
                    <Toggle
                      key={def.key}
                      checked={enabled}
                      onChange={(on) => handleSwitch(def, on)}
                      label={def.label}
                    />
                  );
                })}
              </div>
            )}
            {segs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {segs.map((def) => (
                  <div key={def.key}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{def.label}</div>
                    <SegBtn
                      options={def.options}
                      value={getSegValue(def)}
                      onChange={(v) => handleSeg(def, v)}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
