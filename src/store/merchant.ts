import { defineStore } from 'pinia';
import type { Merchant } from '@/types/merchant';

export const useMerchantStore = defineStore('merchant', {
  state: () => ({
    currentMerchant: {
      _id: 'shop_001',
      owner_id: 'u_guest_demo',
      name: '雅致名媛女装店 (城关人民路店)',
      category_id: 'apparel',
      category_name: '服装女装',
      town: '城关镇',
      address: '竹山县人民路步行街中段18号',
      phone: '13872810001',
      avatar: 'https://picsum.photos/200/200?random=1',
      images: [],
      description: '专注高品质轻熟女装，凭码进店享试穿好礼',
      business_hours: '09:30 - 21:30',
      status: 'APPROVED',
      created_at: '2026-11-01'
    } as Merchant | null,
    isStaff: true,
    role: 'OWNER' as 'OWNER' | 'MANAGER' | 'STAFF'
  }),
  actions: {
    setCurrentMerchant(merchant: Merchant) {
      this.currentMerchant = merchant;
    }
  }
});
