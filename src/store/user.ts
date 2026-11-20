import { defineStore } from 'pinia';
import type { UserProfile } from '@/types/user';

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null as UserProfile | null,
    isLoggedIn: false,
    selectedTown: '城关镇'
  }),
  actions: {
    initUser() {
      const cached = uni.getStorageSync('zhushan_user');
      if (cached) {
        this.profile = cached;
        this.isLoggedIn = true;
      } else {
        // 默认访客初始化
        this.profile = {
          _id: 'u_guest_demo',
          openid: 'mock_openid_zhushan_001',
          nickname: '竹山居民',
          avatar: 'https://picsum.photos/100/100?random=88',
          phone: '138****0000',
          town: '城关镇',
          created_at: new Date().toISOString()
        };
        this.isLoggedIn = true;
        uni.setStorageSync('zhushan_user', this.profile);
      }
    },
    setTown(town: string) {
      this.selectedTown = town;
    },
    login(profile: UserProfile) {
      this.profile = profile;
      this.isLoggedIn = true;
      uni.setStorageSync('zhushan_user', profile);
    },
    logout() {
      this.profile = null;
      this.isLoggedIn = false;
      uni.removeStorageSync('zhushan_user');
    }
  }
});
