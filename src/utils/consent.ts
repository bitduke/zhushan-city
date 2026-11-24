export const SERVICE_AGREEMENT_VERSION = '2026-11-24';
const CONSENT_KEY = 'zhushan_service_consent_v1';

type LaunchTarget = { path: string; query: Record<string, string> };
let pendingLaunch: LaunchTarget | null = null;
let cloudInitialized = false;

export function hasServiceConsent(): boolean {
  const saved = uni.getStorageSync(CONSENT_KEY);
  return saved?.agreed === true && saved?.version === SERVICE_AGREEMENT_VERSION;
}

export function grantServiceConsent(): void {
  uni.setStorageSync(CONSENT_KEY, {
    agreed: true,
    version: SERVICE_AGREEMENT_VERSION,
    acceptedAt: new Date().toISOString()
  });
}

export function rememberLaunch(options: any): void {
  const requestedPath = String(options?.path || 'pages/index/index').replace(/^\/+/, '');
  const path = /^pages\/[a-z0-9/_-]+$/.test(requestedPath) ? requestedPath : 'pages/index/index';
  if (path === 'pages/welcome/index') return;
  const query: Record<string, string> = {};
  if (options?.query && typeof options.query === 'object') {
    for (const [key, value] of Object.entries(options.query)) {
      if (typeof value === 'string') query[key] = value;
    }
  }
  pendingLaunch = { path, query };
}

export function takeRememberedLaunch(): LaunchTarget | null {
  const target = pendingLaunch;
  pendingLaunch = null;
  return target;
}

export function ensureCloudInitialized(): void {
  // #ifdef MP-WEIXIN
  if (cloudInitialized) return;
  const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID;
  if (!envId) throw new Error('微信云环境尚未配置');
  wx.cloud.init({ env: envId, traceUser: false });
  cloudInitialized = true;
  // #endif
}
