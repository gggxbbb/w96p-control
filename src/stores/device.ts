// Re-export SDK device store + add batteryLearn subscriber on top
export { useDeviceStore } from '@gggxbbb/w96p-ble-sdk';
export type { DeviceState } from '@gggxbbb/w96p-ble-sdk';

import { useDeviceStore as sdkDeviceStore } from '@gggxbbb/w96p-ble-sdk';
import { useBatteryLearnStore } from './batteryLearn';
import { voltageToSoc } from '../utils/battery';

let _lastLearnTick = 0;

// Subscribe to SDK device store changes for battery learning
sdkDeviceStore.subscribe((state) => {
  if (!state.battery) return;
  const now = Date.now();
  if (now - _lastLearnTick < 400) return;
  _lastLearnTick = now;
  const serial = state.serialNumber;
  if (!serial) return;
  const soc = voltageToSoc(state.battery.voltageMv);
  useBatteryLearnStore.getState().tick(
    serial,
    state.battery.capacityMwh || 18000,
    state.battery.voltageMv,
    state.battery.currentMa,
    state.powerStatus?.powSta === 1,
    soc,
    now,
  );
});
