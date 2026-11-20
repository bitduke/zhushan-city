import { USE_MOCK, callCloudFunction } from './adapter';
import homeMock from '@/mock/home.json';
import type { InfoItem } from '@/types/info';

export async function getInfoList(params: { categoryId?: string; town?: string; page?: number }) {
  if (USE_MOCK) {
    let list = homeMock.recent_infos;
    if (params.categoryId && params.categoryId !== 'all') {
      list = list.filter(item => {
        if (params.categoryId === 'house') return item.category_name === '房屋租售';
        if (params.categoryId === 'idle') return item.category_name === '二手闲置';
        if (params.categoryId === 'turquoise') return item.category_name === '绿松石名片';
        return true;
      });
    }
    return { list, total: list.length };
  }
  return callCloudFunction('getInfoList', params);
}

export async function publishInfo(data: Partial<InfoItem>) {
  if (USE_MOCK) {
    console.log('[MOCK Info Published]', data);
    return {
      success: true,
      message: '发布成功！已进入安全合规审核队列（预计10分钟内完成）'
    };
  }
  return callCloudFunction('publishInfo', data);
}
