/**
 * 微信二维码 scene 参数短 token 解析器
 * 严格限制在 32 字符以内，例如: s=tk_01 或 t=1&i=shop_001
 */
export function parseScene(sceneRaw: string): Record<string, string> {
  if (!sceneRaw) return {};
  try {
    const decoded = decodeURIComponent(sceneRaw);
    const params: Record<string, string> = {};
    const pairs = decoded.split('&');
    for (const pair of pairs) {
      const [key, val] = pair.split('=');
      if (key) params[key] = val || '';
    }
    return params;
  } catch (err) {
    console.error('Failed to parse scene:', err);
    return {};
  }
}
