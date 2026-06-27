import { BatteryPanel } from '../../components/power/BatteryPanel';
import { VbusPanel } from '../../components/power/VbusPanel';
import { MotorPanel } from '../../components/power/MotorPanel';
import { PageGrid } from '../../components/ui/PageGrid';
import type { ResponsiveLayouts } from 'react-grid-layout';

const POWER_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'battery', x: 0, y: 0, w: 6, h: 7 },
    { i: 'vbus', x: 6, y: 0, w: 6, h: 7 },
    { i: 'motor', x: 0, y: 7, w: 12, h: 5 },
  ],
  md: [
    { i: 'battery', x: 0, y: 0, w: 5, h: 7 },
    { i: 'vbus', x: 5, y: 0, w: 5, h: 7 },
    { i: 'motor', x: 0, y: 7, w: 10, h: 5 },
  ],
  sm: [
    { i: 'battery', x: 0, y: 0, w: 6, h: 7 },
    { i: 'vbus', x: 0, y: 7, w: 6, h: 7 },
    { i: 'motor', x: 0, y: 14, w: 6, h: 5 },
  ],
  xs: [
    { i: 'battery', x: 0, y: 0, w: 2, h: 8 },
    { i: 'vbus', x: 0, y: 8, w: 2, h: 8 },
    { i: 'motor', x: 0, y: 16, w: 2, h: 5 },
  ],
};

export default function Power() {
  return (
    <PageGrid pageKey="power" pageName="电源" defaultLayouts={POWER_LAYOUTS}>
      <BatteryPanel key="battery" dragHandle />
      <VbusPanel key="vbus" dragHandle />
      <MotorPanel key="motor" dragHandle />
    </PageGrid>
  );
}
