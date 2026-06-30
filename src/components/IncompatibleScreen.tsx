import type { ReactNode } from 'react';
import { siGooglechrome, siOpera } from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';

function SIIcon({ icon, size = 32 }: { icon: SimpleIcon; size?: number }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill={`#${icon.hex}`}>
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}

const microsoftSvg = (
  <svg role="img" viewBox="0 0 24 24" width="32" height="32">
    <title>Microsoft</title>
    <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
    <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
    <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
  </svg>
);

type Browser = { name: string; desc: string; url: string; icon: SimpleIcon | ReactNode };

const browsers: Browser[] = [
  { name: 'Google Chrome', desc: '桌面版 & Android 均原生支持 Web Bluetooth', url: 'https://www.google.com/chrome/', icon: siGooglechrome },
  { name: 'Microsoft Edge', desc: 'Windows 系统自带，开箱即用', url: 'https://www.microsoft.com/edge/', icon: microsoftSvg },
  { name: 'Opera', desc: '支持桌面版 & Android 平台', url: 'https://www.opera.com/', icon: siOpera },
];

function isSimpleIcon(icon: SimpleIcon | ReactNode): icon is SimpleIcon {
  return typeof icon === 'object' && icon !== null && 'path' in icon;
}

export function IncompatibleScreen({ reason }: { reason?: string }) {
  const subtitle = reason ?? (
    <>
      Web Bluetooth API 仅在 Chromium 系浏览器中可用（Chrome / Edge / Opera 等）。
      <br />
      请使用以下浏览器打开此页面：
    </>
  );

  return (
    <div className="incompatible-root">
      <div className="incompatible-card">
        <div className="incompatible-icon">⚠</div>
        <h1>浏览器不支持 Web Bluetooth</h1>
        <p>{subtitle}</p>
        <div className="ios-warning">
          ⚠ iPhone / iPad 用户请注意：iOS 系统强制所有浏览器使用 WebKit 内核，
          不支持 Web Bluetooth。请使用安卓手机或 Windows/macOS/ChromeOS 桌面设备。
        </div>
        <div className="browser-list">
          {browsers.map((b) => (
            <a key={b.name} href={b.url} target="_blank" rel="noopener noreferrer" className="browser-card">
              <span className="browser-icon">
                {isSimpleIcon(b.icon) ? <SIIcon icon={b.icon} /> : b.icon}
              </span>
              <span className="browser-info">
                <strong>{b.name}</strong>
                <span>{b.desc}</span>
              </span>
            </a>
          ))}
        </div>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          重新检查
        </button>
      </div>
    </div>
  );
}
