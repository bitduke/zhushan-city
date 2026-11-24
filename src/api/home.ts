import { USE_MOCK } from './adapter';
import homeMock from '@/mock/home.json';
import { getInfoList } from './info';
import { getPublicMerchants } from './merchant';
import type { Merchant } from '@/types/merchant';
import { HOME_BANNERS } from '@/constants/homeBanners';

export async function getHomeData(params: { town?: string }) {
  if (USE_MOCK) {
    const infos = await getInfoList({ town: params.town, pageSize: 10 });
    const merchants = await getPublicMerchants({ town: params.town, pageSize: 10 });
    return {
      ...homeMock,
      banners: HOME_BANNERS,
      featured_shops: merchants.list.map((item: Merchant) => ({
        id: item._id, name: item.name, category_name: item.category_name, town: item.town,
        address: item.address, phone: item.phone, avatar: item.avatar,
        distance: '', hot_coupon: `营业时间 ${item.business_hours}`, partner_count: 0
      })),
      recent_infos: infos.list
    };
  }
  const [infos, merchants] = await Promise.all([
    getInfoList({ town: params.town, pageSize: 10 }),
    getPublicMerchants({ town: params.town, pageSize: 10 })
  ]);
  return {
    banners: HOME_BANNERS,
    featured_shops: merchants.list.map((item: any) => ({
      id: item._id, name: item.name, category_name: item.category_name, town: item.town,
      address: item.address, phone: item.phone, avatar: item.avatar,
      distance: '', hot_coupon: `营业时间 ${item.business_hours}`, partner_count: 0
    })),
    recent_infos: infos.list
  };
}
