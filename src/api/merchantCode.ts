import { callCloudFunction } from './adapter';

export async function getMerchantCodeImage(merchantId: string): Promise<{ url: string; envVersion: string }> {
  const result = await callCloudFunction<{ success: boolean; fileID?: string; envVersion?: string; message?: string }>('merchantCode', { merchantId });
  if (!result.success || !result.fileID) throw new Error(result.message || '门店码生成失败');
  const files = await wx.cloud.getTempFileURL({ fileList: [result.fileID] });
  const url = files.fileList?.[0]?.tempFileURL;
  if (!url) throw new Error('门店码图片暂不可访问');
  return { url, envVersion: result.envVersion || 'develop' };
}
