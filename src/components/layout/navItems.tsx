import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export const NAV_ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  fan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 12L12 4A4 4 0 0 1 16 8L12 12Z" />
      <path d="M12 12L20 12A4 4 0 0 1 16 16L12 12Z" />
      <path d="M12 12L12 20A4 4 0 0 1 8 16L12 12Z" />
      <path d="M12 12L4 12A4 4 0 0 1 8 8L12 12Z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  nature: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 14h15a3 3 0 1 1-3 3" />
    </svg>
  ),
  power: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="16" height="10" rx="1" />
      <path d="M7 10v4M10 10v4M13 10v4" /><path d="M21 11v2" />
    </svg>
  ),
  config: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" />
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  ),
  ota: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '总览', icon: NAV_ICONS.dashboard },
  { to: '/fan', label: '风扇', icon: NAV_ICONS.fan },
  { to: '/nature-wind', label: '自然风', icon: NAV_ICONS.nature },
  { to: '/power', label: '电源', icon: NAV_ICONS.power },
  { to: '/power-config', label: '寄存器', icon: NAV_ICONS.config },
  { to: '/ota', label: '固件升级', icon: NAV_ICONS.ota },
  { to: '/history', label: '历史', icon: NAV_ICONS.history },
  { to: '/settings', label: '设置', icon: NAV_ICONS.settings },
];
