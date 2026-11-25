<template>
  <view class="user-page">
    <view class="profile-hero">
      <text class="hero-kicker">MY ZHUSHAN</text>
      <view class="hero-title">我的竹山生活</view>
      <view class="profile-row" v-if="profile">
        <image v-if="showAvatar" class="avatar" :src="profile.avatar" mode="aspectFill" @error="avatarFailed = true" />
        <view v-else class="avatar avatar-fallback">{{ profile.nickname?.slice(0, 1) || '竹' }}</view>
        <view class="user-info">
          <view class="nickname">{{ profile.nickname }}</view>
          <view class="user-sub">常用区域 · {{ profile.town || '城关镇' }}</view>
        </view>
      </view>
    </view>

    <view class="content">
      <view class="group-title">我的内容</view>
      <view class="menu-group">
        <view id="my-info-link" class="menu-item" @tap="goToMyInfos">
          <view class="menu-icon"><image :src="'/static/icons/clipboard.png'" mode="aspectFit" /></view>
          <text class="menu-label">我的发布</text><text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="group-title">商家服务</view>
      <view class="menu-group">
        <view class="menu-item" @tap="goToMerchant">
          <view class="menu-icon"><image :src="'/static/icons/store.png'" mode="aspectFit" /></view>
          <text class="menu-label">商家工作台</text><text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="applyMerchant">
          <view class="menu-icon"><image :src="'/static/icons/plus.png'" mode="aspectFit" /></view>
          <text class="menu-label">申请商家入驻</text><text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goToJoinMerchant">
          <view class="menu-icon"><image :src="'/static/icons/user.png'" mode="aspectFit" /></view>
          <text class="menu-label">使用邀请码加入门店</text><text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="group-title">平台与帮助</view>
      <view class="menu-group">
        <view id="demo-admin-link" class="menu-item" v-if="USE_MOCK || profile?.role === 'ADMIN'" @tap="goToDemoAdmin">
          <view class="menu-icon"><image :src="'/static/icons/clipboard.png'" mode="aspectFit" /></view>
          <text class="menu-label">{{ USE_MOCK ? '演示管理台（仅本机）' : '运营管理台' }}</text><text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goToPrivacy">
          <view class="menu-icon"><image :src="'/static/icons/clipboard.png'" mode="aspectFit" /></view>
          <text class="menu-label">隐私说明</text><text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goToTerms">
          <view class="menu-icon"><image :src="'/static/icons/clipboard.png'" mode="aspectFit" /></view>
          <text class="menu-label">用户服务协议</text><text class="menu-arrow">›</text>
        </view>
      <view class="menu-item" @tap="goToHelp">
          <view class="menu-icon"><image :src="'/static/icons/pin.png'" mode="aspectFit" /></view>
        <text class="menu-label">帮助与反馈</text><text class="menu-arrow">›</text>
        </view>
      </view>
      <view class="version-text">竹山街坊惠 v1.0 · 本地便民与商家联盟</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUserStore } from '@/store/user';
import { USE_MOCK } from '@/api/adapter';

const userStore = useUserStore();
const profile = computed(() => userStore.profile);
const avatarFailed = ref(false);
const showAvatar = computed(() => !!profile.value?.avatar && !profile.value.avatar.includes('picsum.photos') && !avatarFailed.value);
const goToMyInfos = () => uni.navigateTo({ url: '/pages/info/mine' });
const goToMerchant = () => uni.navigateTo({ url: '/pages/merchant/index' });
const applyMerchant = () => uni.navigateTo({ url: '/pages/merchant/apply' });
const goToJoinMerchant = () => uni.navigateTo({ url: '/pages/merchant/join' });
const goToDemoAdmin = () => {
  userStore.enterDemoAdmin();
  uni.navigateTo({ url: '/pages/admin/index' });
};
const goToPrivacy = () => uni.navigateTo({ url: '/pages/help/privacy' });
const goToTerms = () => uni.navigateTo({ url: '/pages/help/terms' });
const goToHelp = () => uni.navigateTo({ url: '/pages/help/contact' });
</script>

<style scoped>
.user-page { min-height: 100vh; padding-bottom: 45rpx; background: var(--zs-canvas); }
.profile-hero { padding: 34rpx 28rpx 52rpx; border-radius: 0 0 34rpx 34rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 6rpx; font-size: 38rpx; font-weight: 800; }
.profile-row { display: flex; align-items: center; gap: 18rpx; margin-top: 28rpx; }
.avatar { width: 104rpx; height: 104rpx; border-radius: 52rpx; border: 3rpx solid rgba(255,255,255,.55); background: #eaf4ee; }
.avatar-fallback { display: flex; align-items: center; justify-content: center; color: var(--zs-green); font-size: 43rpx; font-weight: 800; }
.user-info { flex: 1; min-width: 0; }
.nickname { color: white; font-size: 30rpx; font-weight: 750; }
.user-sub { margin-top: 7rpx; color: #d7e9dd; font-size: 21rpx; }
.content { position: relative; margin: -13rpx 20rpx 0; }
.group-title { margin: 23rpx 10rpx 13rpx; color: var(--zs-ink); font-size: 26rpx; font-weight: 750; }
.menu-group { overflow: hidden; border: 1rpx solid var(--zs-border); border-radius: 18rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(19,53,35,.035); }
.menu-item { display: flex; align-items: center; gap: 16rpx; min-height: 94rpx; padding: 13rpx 21rpx; border-bottom: 1rpx solid #edf0eb; }
.menu-item:last-child { border-bottom: 0; }
.menu-icon { width: 52rpx; height: 52rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 13rpx; background: var(--zs-green-soft); }
.menu-icon image { width: 32rpx; height: 32rpx; }
.menu-label { flex: 1; color: var(--zs-ink); font-size: 24rpx; font-weight: 650; }
.menu-arrow { color: #9aaba0; font-size: 34rpx; }
.version-text { margin-top: 34rpx; color: #9aaa9c; font-size: 19rpx; text-align: center; }
</style>
