import { BatteryPanel } from '../../components/power/BatteryPanel';
import { VbusPanel } from '../../components/power/VbusPanel';
import { MotorPanel } from '../../components/power/MotorPanel';
import { PowerInfoCard } from '../../components/power/PowerInfoCard';
import { PageGrid } from '../../components/ui/PageGrid';
import { DraggableCard } from '../../components/ui/DraggableCard';
import type { ResponsiveLayouts } from 'react-grid-layout';

const POWER_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'battery', x: 0, y: 0, w: 4, h: 7 },
    { i: 'vbus', x: 4, y: 0, w: 4, h: 7 },
    { i: 'info', x: 8, y: 0, w: 4, h: 4 },
    { i: 'motor', x: 0, y: 7, w: 12, h: 5 },
  ],
  md: [
    { i: 'battery', x: 0, y: 0, w: 5, h: 7 },
    { i: 'vbus', x: 5, y: 0, w: 5, h: 7 },
    { i: 'info', x: 0, y: 7, w: 10, h: 5 },
    { i: 'motor', x: 0, y: 12, w: 10, h: 5 },
  ],
  sm: [
    { i: 'battery', x: 0, y: 0, w: 6, h: 7 },
    { i: 'vbus', x: 0, y: 7, w: 6, h: 7 },
    { i: 'info', x: 0, y: 14, w: 6, h: 5 },
    { i: 'motor', x: 0, y: 19, w: 6, h: 5 },
  ],
  xs: [
    { i: 'battery', x: 0, y: 0, w: 2, h: 8 },
    { i: 'vbus', x: 0, y: 8, w: 2, h: 8 },
    { i: 'info', x: 0, y: 16, w: 2, h: 5 },
    { i: 'motor', x: 0, y: 21, w: 2, h: 5 },
  ],
};

export default function Power() {
  return (
    <div className="new-page theme-new" style={{ minHeight: '100%' }}>
      <PageGrid pageKey="power" pageName="电源" defaultLayouts={POWER_LAYOUTS}>
        <DraggableCard key="battery">
          <BatteryPanel />
        </DraggableCard>
        <DraggableCard key="vbus">
          <VbusPanel />
        </DraggableCard>
        <DraggableCard key="info">
          <PowerInfoCard />
        </DraggableCard>
        <DraggableCard key="motor">
          <MotorPanel />
        </DraggableCard>
      </PageGrid>
    </div>
  );
}
