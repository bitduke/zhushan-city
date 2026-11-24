import { defineStore } from 'pinia';
import type { Merchant } from '@/types/merchant';
import { USE_MOCK } from '@/api/adapter';

export const DEMO_MERCHANTS: Merchant[] = [
  {
    _id: 'shop_001', owner_id: 'u_guest_demo', name: '雅致名媛女装店 (城关人民路店)',
    category_id: 'apparel', category_name: '服装女装', town: '城关镇',
    address: '竹山县人民路步行街中段18号', phone: '13872810001',
    avatar: 'https://picsum.photos/200/200?random=1', images: [],
    description: '本地演示门店', business_hours: '09:30 - 21:30', daily_booking_limit: 0, status: 'APPROVED', qrcode_token: 'mA001', created_at: '2026-11-01'
  },
  {
    _id: 'shop_002', owner_id: 'u_guest_demo', name: '奈奈日式美睫美甲沙龙',
    category_id: 'beauty', category_name: '美容美甲', town: '城关镇',
    address: '竹山县北大街银座二楼', phone: '13972820002',
    avatar: 'https://picsum.photos/200/200?random=2', images: [],
    description: '本地演示门店', business_hours: '10:00 - 20:00', daily_booking_limit: 5, status: 'APPROVED', qrcode_token: 'mB001', created_at: '2026-11-01'
  },
  {
    _id: 'shop_003', owner_id: 'u_guest_demo', name: '御竹轩足道养生会所',
    category_id: 'foot_bath', category_name: '足道养生', town: '城关镇',
    address: '竹山县施洋路迎宾大厦3楼', phone: '13672830003',
    avatar: 'https://picsum.photos/200/200?random=3', images: [],
    description: '本地演示门店', business_hours: '11:00 - 23:00', daily_booking_limit: 5, status: 'APPROVED', qrcode_token: 'mC001', created_at: '2026-11-01'
  }
];

export const useMerchantStore = defineStore('merchant', {
  state: () => ({
    currentMerchant: (USE_MOCK ? DEMO_MERCHANTS[0] : null) as Merchant | null,
    isStaff: USE_MOCK,
    role: 'OWNER' as 'OWNER' | 'MANAGER' | 'STAFF'
  }),
  actions: {
    setCurrentMerchant(merchant: Merchant | null) {
      this.currentMerchant = merchant;
    },
    selectDemoMerchant(id: string) {
      if (USE_MOCK) this.currentMerchant = DEMO_MERCHANTS.find(item => item._id === id) || null;
    }
  }
});
