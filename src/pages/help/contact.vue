<template>
  <view class="help-page">
    <view class="hero">
      <text class="kicker">HELP & SUPPORT</text>
      <view class="hero-title">帮助与反馈</view>
      <text class="hero-subtitle">遇到信息或优惠问题，可按下面的方式处理</text>
    </view>
    <view class="content">
      <view class="card">
        <view class="title">便民信息有误</view>
        <text class="desc">进入该信息的详情页，点击“举报”，说明虚假、已售已租或联系方式无效等问题。平台审核后处理。</text>
      </view>
      <view class="card">
        <view class="title">优惠券无法使用</view>
        <text class="desc">先向核销门店出示券码和券面规则。若门店无法处理，请保留券码和沟通情况，再联系平台核对。</text>
      </view>
      <view class="card">
        <view class="title">商家入驻与广告合作</view>
        <text class="desc">商家可从“我的”申请入驻；首页广告合作可查看招商说明和商务联系方式。</text>
        <button class="link-button" @tap="goToAdvertise">查看广告位招商</button>
      </view>
      <view class="contact-card">
        <view class="title">平台联系方式</view>
        <text class="desc">{{ LEGAL_PROFILE.supportPhone || '客服联系方式待公布' }}</text>
        <button v-if="LEGAL_PROFILE.supportPhone" class="call-button" @tap="callSupport">拨打平台电话</button>
        <button class="privacy-button" @tap="goToPrivacy">查看隐私说明</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import LEGAL_PROFILE from '@/constants/legal.json';

const callSupport = () => {
  if (LEGAL_PROFILE.supportPhone) uni.makePhoneCall({ phoneNumber: LEGAL_PROFILE.supportPhone });
};
const goToAdvertise = () => uni.navigateTo({ url: '/pages/business/advertise' });
const goToPrivacy = () => uni.navigateTo({ url: '/pages/help/privacy' });
</script>

<style scoped>
.help-page { min-height: 100vh; padding-bottom: 55rpx; background: var(--zs-canvas); }
.hero { padding: 39rpx 28rpx 55rpx; border-radius: 0 0 32rpx 32rpx; color: white; background: linear-gradient(145deg,#17664c,#104b39); }
.kicker { color: #c8e7d2; font-size: 18rpx; letter-spacing: 2rpx; font-weight: 700; }
.hero-title { margin-top: 8rpx; font-size: 37rpx; font-weight: 800; }
.hero-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; line-height: 1.5; }
.content { position: relative; margin: -18rpx 20rpx 0; }
.card, .contact-card { margin-bottom: 15rpx; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 18rpx; background: white; }
.title { color: var(--zs-ink); font-size: 27rpx; font-weight: 800; }
.desc { display: block; margin-top: 12rpx; color: var(--zs-muted); font-size: 21rpx; line-height: 1.6; }
.link-button, .privacy-button { margin: 18rpx 0 0; height: 62rpx; line-height: 62rpx; border-radius: 31rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; font-weight: 700; }
.call-button { margin: 20rpx 0 0; height: 70rpx; line-height: 70rpx; border-radius: 35rpx; color: white; background: var(--zs-green); font-size: 22rpx; font-weight: 700; }
</style>
