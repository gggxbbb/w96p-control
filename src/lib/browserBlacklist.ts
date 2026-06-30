/**
 * 内置浏览器黑名单：这些浏览器的 WebView 内核不完整，即使暴露了
 * navigator.bluetooth，也无法正常使用 Web Bluetooth API。
 *
 * 按 RegExp 匹配 navigator.userAgent，匹配到任一规则即判定为不兼容。
 * 可通过追加正则扩展黑名单。
 */

const BLACKLIST: RegExp[] = [
  /MicroMessenger/i,   // 微信内置浏览器
  /QQ\//i,             // QQ 浏览器 / QQ WebView
  /MQQBrowser/i,       // QQ 浏览器 (备选标识)
  /AlipayClient/i,     // 支付宝
  /DingTalk/i,         // 钉钉
  /Baidu/i,            // 百度系浏览器
  /baiduboxapp/i,      // 百度 App
  /UCBrowser/i,        // UC 浏览器
  /UCWEB/i,            // UC 浏览器 (旧标识)
  /SogouMSE/i,         // 搜狗浏览器
  /SogouMobileBrowser/i,
  /liebao/i,           // 猎豹浏览器
  /2345Explorer/i,     // 2345 浏览器
  /360SE/i,            // 360 安全浏览器
  /360EE/i,            // 360 极速浏览器
  /Maxthon/i,          // 遨游浏览器
  /TaoBrowser/i,       // 淘宝浏览器
  /MeiZu/i,            // 魅族浏览器
  /XiaoMi\/MiuiBrowser/i, // 小米 MIUI 浏览器
  /HeyTapBrowser/i,    // OPPO 浏览器
  /VivoBrowser/i,      // Vivo 浏览器
  /SamsungBrowser/i,   // 三星浏览器 (WebView 实现不完整)
];

/**
 * 检查当前 UA 是否命中黑名单。
 * @returns true 表示当前浏览器在黑名单中，应判定为不兼容
 */
export function isBlacklisted(ua?: string): boolean {
  const userAgent = ua ?? navigator.userAgent;
  return BLACKLIST.some((re) => re.test(userAgent));
}

/**
 * 获取命中黑名单的规则名称（用于调试/日志）
 */
export function blacklistMatch(ua?: string): string | null {
  const userAgent = ua ?? navigator.userAgent;
  for (const re of BLACKLIST) {
    if (re.test(userAgent)) return re.source;
  }
  return null;
}
