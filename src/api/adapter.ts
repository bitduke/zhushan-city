import { ensureCloudInitialized, hasServiceConsent } from '@/utils/consent';

/**
 * 数据适配器：控制使用本地 Mock 还是真实微信云开发
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export async function callCloudFunction<T = any>(name: string, data: Record<string, any> = {}): Promise<T> {
  if (!hasServiceConsent()) throw new Error('请先阅读并同意服务协议与隐私说明');
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.cloud) {
    try {
      ensureCloudInitialized();
      const res = await wx.cloud.callFunction({
        name,
        data
      });
      const raw = (res.result || {}) as Record<string, any>;
      const { success, code, message, requestId, data: body, ...fields } = raw;
      return {
        ...raw,
        code: code ?? (success ? 'OK' : 'SERVICE_ERROR'),
        message: message || (success ? '操作成功' : '服务暂不可用'),
        data: body ?? (success ? fields : null),
        requestId: String(res.requestID || requestId || '')
      } as T;
    } catch (err) {
      const error = err as { message?: string; requestID?: string; requestId?: string };
      console.error(`Cloud function [${name}] failed`, { message: error?.message || '调用失败', requestId: error?.requestID || error?.requestId || '' });
      throw err;
    }
  }
  // #endif
  throw new Error('微信云开发环境未就绪或未在微信小程序中运行');
}
