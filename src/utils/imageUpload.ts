import { USE_MOCK } from '@/api/adapter';

export function persistSelectedImage(path: string, folder: 'info' | 'merchant'): Promise<string> {
  if (USE_MOCK) {
    // Images already in the mini program's user-data directory are persistent.
    if (typeof wx !== 'undefined' && path.startsWith(wx.env.USER_DATA_PATH + '/')) return Promise.resolve(path);
    return new Promise((resolve, reject) => uni.saveFile({ tempFilePath: path, success: result => resolve(result.savedFilePath), fail: reject }));
  }
  // #ifdef MP-WEIXIN
  const extension = (path.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
  const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 12)}.${extension}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: path }).then((result: { fileID: string }) => result.fileID);
  // #endif
  return Promise.reject(new Error('当前环境不支持图片上传'));
}
