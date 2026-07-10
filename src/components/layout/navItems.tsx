export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: '总览', icon: '🏠' },
  { path: '/nature-wind', label: '自然风', icon: '🍃' },
  { path: '/power', label: '电源', icon: '⚡' },
  { path: '/settings', label: '设置', icon: '⚙️' },
];

export function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || (path !== '/' && pathname.startsWith(path));
}
