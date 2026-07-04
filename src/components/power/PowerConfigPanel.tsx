import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { PageGrid } from '../ui/PageGrid';
import { DraggableCard } from '../ui/DraggableCard';
import { Toggle } from '../ui/Toggle';
import { SegBtn } from '../ui/SegBtn';
import { POW_SWITCHES, POW_SEGS, REG_TITLES } from '@gggxbbb/w96p-ble-sdk';
import type { PowSwitchDef, PowSegDef, PowReg } from '@gggxbbb/w96p-ble-sdk';
import type { ResponsiveLayouts } from 'react-grid-layout';

const PC_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'protocol', x: 0, y: 0, w: 12, h: 2 },
    { i: '1A', x: 0, y: 2, w: 6, h: 5 },
    { i: '1C', x: 6, y: 2, w: 6, h: 5 },
    { i: '1D', x: 0, y: 7, w: 6, h: 6 },
    { i: '1E', x: 6, y: 7, w: 6, h: 3 },
    { i: '2A', x: 0, y: 13, w: 6, h: 4 },
    { i: '2B', x: 6, y: 10, w: 6, h: 7 },
    { i: '2C', x: 0, y: 17, w: 12, h: 5 },
  ],
  md: [
    { i: 'protocol', x: 0, y: 0, w: 10, h: 2 },
    { i: '1A', x: 0, y: 2, w: 5, h: 5 },
    { i: '1C', x: 5, y: 2, w: 5, h: 5 },
    { i: '1D', x: 0, y: 7, w: 5, h: 6 },
    { i: '1E', x: 5, y: 7, w: 5, h: 3 },
    { i: '2A', x: 0, y: 13, w: 5, h: 4 },
    { i: '2B', x: 5, y: 10, w: 5, h: 7 },
    { i: '2C', x: 0, y: 17, w: 10, h: 5 },
  ],
  sm: [
    { i: 'protocol', x: 0, y: 0, w: 6, h: 2 },
    { i: '1A', x: 0, y: 2, w: 6, h: 5 },
    { i: '1C', x: 0, y: 7, w: 6, h: 4 },
    { i: '1D', x: 0, y: 11, w: 6, h: 6 },
    { i: '1E', x: 0, y: 17, w: 6, h: 3 },
    { i: '2A', x: 0, y: 20, w: 6, h: 4 },
    { i: '2B', x: 0, y: 24, w: 6, h: 5 },
    { i: '2C', x: 0, y: 29, w: 6, h: 5 },
  ],
  xs: [
    { i: 'protocol', x: 0, y: 0, w: 2, h: 3 },
    { i: '1A', x: 0, y: 3, w: 2, h: 6 },
    { i: '1C', x: 0, y: 9, w: 2, h: 5 },
    { i: '1D', x: 0, y: 14, w: 2, h: 7 },
    { i: '1E', x: 0, y: 21, w: 2, h: 4 },
    { i: '2A', x: 0, y: 25, w: 2, h: 5 },
    { i: '2B', x: 0, y: 30, w: 2, h: 6 },
    { i: '2C', x: 0, y: 36, w: 2, h: 5 },
  ],
};

export function PowerConfigPanel() {
  const { setPowSwitch, setPowRegister, writePowerClr } = useBle();
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
    <>
      <div style={{
        background: 'rgba(255, 107, 107, 0.1)',
        border: '0.5px solid var(--color-danger)',
        borderRadius: '6px',
        padding: '12px 14px',
        marginBottom: '12px',
        fontSize: '11px',
        lineHeight: '1.7',
        color: 'var(--color-danger)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px' }}>⚠️ 风险警告</div>
        <div>本控制平台为第三方开发，96Pro 无输出能力，页面内大部分功能实际无效。</div>
        <div>涉及快充协议魔改，属高风险操作。不熟悉快充原理的新手请勿使用，可能导致设备永久损坏。</div>
        <div>使用本页面即表示您自行承担一切后果，开发者不对此负责。</div>
      </div>
      <PageGrid pageKey="power-config" pageName="寄存器" defaultLayouts={PC_LAYOUTS}>
        <DraggableCard key="protocol">
          <Card title="当前快充协议">
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span>输入：<span style={{ color: 'var(--color-accent)' }}>{sinkNames[powerConfig.powSink] ?? '未知'}</span></span>
              <span>输出：<span style={{ color: 'var(--color-accent)' }}>{srcNames[powerConfig.powSrc] ?? '未知'}</span></span>
              <span>PD 版本：<span style={{ color: 'var(--color-text)' }}>{(powerConfig.pow2A & 0x40) ? 'PD2.0' : 'PD3.0'}</span></span>
              <span>电量：<span style={{ color: 'var(--color-text)' }}>{powerConfig.powLevel}%</span></span>
              <span>芯片温度：<span style={{ color: 'var(--color-text)' }}>{powerConfig.powCoreTemp}℃</span></span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => { writePowerClr(); show('已清除 PowerCfg 基准'); }}
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-dim)',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: '3px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                清除基准
              </button>
            </div>
          </Card>
        </DraggableCard>

        {regs.map((reg) => {
          const switches = switchesByReg(reg);
          const segs = segsByReg(reg);
          if (switches.length === 0 && segs.length === 0) return null;
          return (
            <DraggableCard key={reg}>
              <Card title={REG_TITLES[reg]} subtitle={`当前值 0x${getRegValue(reg).toString(16).padStart(2, '0').toUpperCase()}`}>
                  {switches.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: segs.length > 0 ? '12px' : 0 }}>
                      {switches.map((def) => {
                        const bitSet = isBitSet(def.reg, def.bit);
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
            </DraggableCard>
          );
        })}
      </PageGrid>
    </>
  );
}
