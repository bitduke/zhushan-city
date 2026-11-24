import { defineStore } from 'pinia';
import type { UserProfile } from '@/types/user';
import { USE_MOCK, callCloudFunction } from '@/api/adapter';
import { hasServiceConsent, SERVICE_AGREEMENT_VERSION } from '@/utils/consent';

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null as UserProfile | null,
    isLoggedIn: false,
    isDemoAdmin: false,
    selectedTown: '城关镇'
  }),
  actions: {
    async initUser() {
      this.selectedTown = uni.getStorageSync('zhushan_town') || '城关镇';
      if (!hasServiceConsent()) {
        this.profile = null;
        this.isLoggedIn = false;
        return;
      }
      if (!USE_MOCK) {
        try {
          const response = await callCloudFunction<{ success: boolean; user?: { _id: string; role: UserProfile['role']; status: string }; message?: string }>('login', { agreementVersion: SERVICE_AGREEMENT_VERSION });
          if (!response.success || !response.user || response.user.status !== 'ACTIVE') throw new Error(response.message || '账号不可用');
          this.profile = { _id: response.user._id, nickname: '微信用户', avatar: '', role: response.user.role, town: this.selectedTown, created_at: new Date().toISOString() };
          this.isLoggedIn = true;
        } catch (error) {
          this.profile = null;
          this.isLoggedIn = false;
          console.error('微信身份初始化失败', error);
        }
        return;
      }
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
      uni.setStorageSync('zhushan_town', town);
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
    },
    enterDemoAdmin() {
      if (USE_MOCK) this.isDemoAdmin = true;
    },
    exitDemoAdmin() {
      this.isDemoAdmin = false;
    }
  }
});
