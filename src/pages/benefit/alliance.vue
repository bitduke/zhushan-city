<template>
  <view class="alliance-page">
    <view class="hero">
      <text class="hero-kicker">LOCAL BENEFITS</text>
      <view class="hero-title">商圈联盟优惠</view>
      <text class="hero-subtitle">到店扫福利码，先看本店优惠，再逛合作好店</text>
      <view class="hero-label">一店一码 · 优惠存入券包 · 到对应门店使用</view>
    </view>

    <view class="content">
      <view v-if="shopAvailability === 'none'" class="availability-note">当前暂无已审核商家，联盟优惠暂未开放领取。可以先了解玩法，后续以门店实际展示的福利码和券面规则为准。</view>
      <view class="intro-card">
        <view class="section-title">到店后这样用</view>
        <view class="step">
          <text class="step-number">01</text>
          <view><view class="step-title">扫门店福利码</view><text class="step-text">用微信扫一扫店内小程序码，进入这家店的专属福利页。</text></view>
        </view>
        <view class="step">
          <text class="step-number">02</text>
          <view><view class="step-title">先领本店优惠</view><text class="step-text">有当场可用券时，结账前领取并向店员出示；具体门槛看券面规则。</text></view>
        </view>
        <view class="step">
          <text class="step-number">03</text>
          <view><view class="step-title">顺路看看合作好店</view><text class="step-text">经双方确认的合作店券会显示在下方，领取后到对应门店使用；服务券可能需要预约。</text></view>
        </view>
      </view>

      <view class="wallet-card" @tap="goToWallet">
        <view class="wallet-icon"><image :src="'/static/icons/ticket.png'" mode="aspectFit" /></view>
        <view class="wallet-copy"><view class="wallet-title">领过的券去哪找？</view><text>都在“我的卡券包”，可查看有效期与预约状态。</text></view>
        <text class="wallet-arrow">›</text>
      </view>

      <view class="actions">
        <button class="shop-button" @tap="goToShops">逛逛竹山好店</button>
        <button class="join-button" @tap="goToApply">我是商家，申请入驻</button>
        <button v-if="USE_MOCK" class="demo-button" @tap="goToDemoBenefit">查看本机演示福利页</button>
      </view>
      <text class="footnote">实际优惠只在参与门店的福利页展示，以审核通过且仍有效的券面规则为准。没有可用券时不会展示虚构优惠。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { getPublicMerchants } from '@/api/merchant';

const shopAvailability = ref<'loading' | 'none' | 'some' | 'unknown'>('loading');
onShow(async () => {
  try {
    const result = await getPublicMerchants({ town: '全竹山', page: 1, pageSize: 1 });
    shopAvailability.value = result.total > 0 ? 'some' : 'none';
  } catch { shopAvailability.value = 'unknown'; }
});

const goToWallet = () => uni.switchTab({ url: '/pages/coupon/mine' });
const goToShops = () => uni.switchTab({ url: '/pages/merchant/list' });
const goToApply = () => uni.navigateTo({ url: '/pages/merchant/apply' });
const goToDemoBenefit = () => uni.navigateTo({ url: '/pages/benefit/shop?shopId=shop_001' });
</script>

<style scoped>
.alliance-page { min-height: 100vh; padding-bottom: 55rpx; background: var(--zs-canvas); }
.hero { padding: 41rpx 30rpx 65rpx; border-radius: 0 0 34rpx 34rpx; color: white; background: linear-gradient(145deg,#17664c,#0e5546); }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 9rpx; font-size: 42rpx; line-height: 1.2; font-weight: 850; }
.hero-subtitle { display: block; margin-top: 11rpx; color: #e0f1e5; font-size: 23rpx; line-height: 1.5; }
.hero-label { display: inline-block; margin-top: 22rpx; padding: 10rpx 16rpx; border-radius: 25rpx; color: #ffe9b8; background: rgba(255,255,255,.13); font-size: 18rpx; }
.content { position: relative; margin: -20rpx 20rpx 0; }
.availability-note { margin-bottom: 15rpx; padding: 18rpx 20rpx; border: 1rpx solid #f2dfb9; border-radius: 14rpx; color: #896836; background: #fff5e2; font-size: 20rpx; line-height: 1.5; }
.intro-card { padding: 27rpx 23rpx 9rpx; border: 1rpx solid var(--zs-border); border-radius: 21rpx; background: white; box-shadow: 0 6rpx 20rpx rgba(20,51,36,.05); }
.section-title { color: var(--zs-ink); font-size: 29rpx; font-weight: 800; }
.step { display: flex; gap: 16rpx; padding: 23rpx 0; border-bottom: 1rpx solid #edf1e9; }
.step:last-child { border-bottom: 0; }
.step-number { flex-shrink: 0; width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #9b6126; background: #fff0d9; font-size: 20rpx; font-weight: 800; }
.step-title { color: var(--zs-ink); font-size: 25rpx; font-weight: 750; }
.step-text { display: block; margin-top: 7rpx; color: var(--zs-muted); font-size: 21rpx; line-height: 1.55; }
.wallet-card { display: flex; align-items: center; gap: 14rpx; margin-top: 16rpx; padding: 22rpx; border-radius: 18rpx; background: #eaf5ee; }
.wallet-icon { flex-shrink: 0; width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 14rpx; background: white; }
.wallet-icon image { width: 39rpx; height: 39rpx; }
.wallet-copy { flex: 1; min-width: 0; }
.wallet-title { color: var(--zs-green-dark); font-size: 24rpx; font-weight: 750; }
.wallet-copy text { display: block; margin-top: 5rpx; color: #527464; font-size: 19rpx; line-height: 1.4; }
.wallet-arrow { color: var(--zs-green); font-size: 35rpx; }
.actions { margin-top: 24rpx; }
.actions button { margin: 0 0 14rpx; height: 76rpx; line-height: 76rpx; border-radius: 38rpx; font-size: 23rpx; font-weight: 750; }
.shop-button { color: white; background: var(--zs-green); }
.join-button, .demo-button { color: var(--zs-green); background: white; border: 1rpx solid var(--zs-border); }
.footnote { display: block; margin: 17rpx 9rpx 0; color: #829087; font-size: 19rpx; line-height: 1.55; }
</style>
