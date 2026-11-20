/**
 * 数据适配器：控制使用本地 Mock 还是真实微信云开发
 */
export const USE_MOCK = true;

export async function callCloudFunction<T = any>(name: string, data: Record<string, any> = {}): Promise<T> {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.cloud) {
    try {
      const res = await wx.cloud.callFunction({
        name,
        data
      });
      return res.result as T;
    } catch (err) {
      console.error(`Cloud function [${name}] failed:`, err);
      throw err;
    }
  }
  // #endif
  throw new Error('微信云开发环境未就绪或未在微信小程序中运行');
}
