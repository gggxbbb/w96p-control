import { BatteryPanel } from '../../components/power/BatteryPanel';
import { VbusPanel } from '../../components/power/VbusPanel';
import { MotorPanel } from '../../components/power/MotorPanel';

export default function Power() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <BatteryPanel />
      <VbusPanel />
      <MotorPanel />
    </div>
  );
}
