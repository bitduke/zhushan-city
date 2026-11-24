<template>
  <view class="page">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">JOIN A SHOP</text>
      <view class="zs-page-hero__title">加入门店</view>
      <text class="zs-page-hero__subtitle">输入店主提供的一次性邀请码</text>
    </view>
    <view class="notice">员工须由店主提供一次性邀请码，并使用自己的微信身份接受。{{ USE_MOCK ? '本地演示账号已是样例店主，需另一身份才能测试接受邀请。' : '' }}</view>
    <view class="card">
      <input id="staff-invite-code" class="field" placeholder="输入店主提供的邀请码" v-model="token" />
      <button id="accept-staff-invite" class="primary" @tap="accept">接受邀请</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { USE_MOCK } from '@/api/adapter';
import { acceptStaffInvite } from '@/api/staff';
const token = ref('');
const accept = async () => {
  try { await acceptStaffInvite(token.value.trim()); uni.showToast({ title: '已加入门店', icon: 'none' }); uni.redirectTo({ url: '/pages/merchant/index' }); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '接受邀请失败', icon: 'none' }); }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--zs-canvas); }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.card { margin-top: 17rpx; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.field { width: 100%; height: 76rpx; padding: 0 17rpx; box-sizing: border-box; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 23rpx; }
.primary { width: 100%; height: 76rpx; line-height: 76rpx; margin-top: 19rpx; border-radius: 38rpx; color: white; background: var(--zs-green); font-size: 23rpx; font-weight: 750; }
</style>
