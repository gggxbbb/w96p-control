export interface Profile {
  name: string;
  defaultSpeeds: readonly [number, number, number, number];
  minSpeed: number;
  maxSpeed: number;
  parseMotorFull: boolean;
  motorPowerUsesMotorVoltage: boolean;
}

export const PROFILES = {
  W96P: {
    name: 'W96P',
    defaultSpeeds: [10, 35, 70, 100] as const,
    minSpeed: 0,
    maxSpeed: 100,
    parseMotorFull: true,
    motorPowerUsesMotorVoltage: true,
  },
  W66D: {
    name: 'W66D',
    defaultSpeeds: [30, 50, 70, 100] as const,
    minSpeed: 20,
    maxSpeed: 90,
    parseMotorFull: false,
    motorPowerUsesMotorVoltage: false,
  },
} as const satisfies Record<string, Profile>;

export const pickProfile = (deviceName?: string): Profile =>
  (deviceName && (PROFILES as Record<string, Profile>)[deviceName]) || PROFILES.W66D;
