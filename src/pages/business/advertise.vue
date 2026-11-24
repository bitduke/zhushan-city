<template>
  <view class="advertise-page">
    <view class="hero">
      <text class="hero-kicker">ADVERTISE WITH ZHUSHAN</text>
      <view class="hero-title">让竹山人看见</view>
      <view class="hero-title hero-title-second">你的好生意</view>
      <text class="hero-subtitle">竹山街坊汇首页顶部广告位开放合作</text>
    </view>

    <view class="content">
      <view class="preview-card">
        <view class="section-head">
          <view class="section-title">首页首屏展示</view>
          <text class="preview-tag">位置示意</text>
        </view>
        <view class="preview-image-wrap">
          <image class="preview-image" :src="'/static/banners/zhushan-market-comic-v1.jpg'" mode="aspectFill" />
          <view class="preview-overlay">你的活动，可在这里被看见</view>
        </view>
        <text class="caption">横幅位于首页导航栏下方；实际图片和文案以双方确认并通过审核的内容为准。</text>
      </view>

      <view class="panel">
        <view class="section-title">适合展示什么</view>
        <view class="feature-row"><text class="feature-index">01</text><view><view class="feature-title">门店开业与上新</view><text class="feature-detail">让附近居民认识你的门店、服务或新品。</text></view></view>
        <view class="feature-row"><text class="feature-index">02</text><view><view class="feature-title">可兑现的限时福利</view><text class="feature-detail">写清使用条件、日期和名额，点击进入已审核的店铺或活动页面。</text></view></view>
        <view class="feature-row"><text class="feature-index">03</text><view><view class="feature-title">本地主题合作</view><text class="feature-detail">适合商圈活动、节日专题和多店联合推广。</text></view></view>
      </view>

      <view class="panel">
        <view class="section-title">怎么合作</view>
        <view class="step"><text class="step-number">1</text><text>联系竹山街坊汇，说明门店、活动内容和期望展示时间。</text></view>
        <view class="step"><text class="step-number">2</text><text>双方确认展示位置、周期、素材、跳转页面及费用。</text></view>
        <view class="step"><text class="step-number">3</text><text>素材审核通过后上线，并核对实际展示内容。</text></view>
        <view class="terms-note">合作价格与效果按具体方案沟通；本页不预设报价或承诺曝光、到店结果。</view>
      </view>

      <view class="contact-card">
        <text class="contact-kicker">CONTACT</text>
        <view class="contact-title">聊聊你的推广计划</view>
        <text class="contact-name">{{ AD_CONTACT.name }}</text>
        <view class="contact-line"><text>联系电话</text><text>{{ AD_CONTACT.phone }}</text></view>
        <view class="contact-line"><text>商务微信</text><text>{{ AD_CONTACT.wechatId }}</text></view>
        <view class="contact-actions">
          <button class="call-btn" @tap="callContact">拨打电话</button>
          <button class="wechat-btn" @tap="copyWechat">复制微信号</button>
        </view>
        <text class="contact-hint">添加微信时请备注“竹山街坊汇广告合作”，方便核对需求。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { AD_CONTACT } from '@/constants/adContact';

const callContact = () => uni.makePhoneCall({ phoneNumber: AD_CONTACT.phone });
const copyWechat = () => uni.setClipboardData({ data: AD_CONTACT.wechatId });
</script>

<style scoped>
.advertise-page { min-height: 100vh; padding-bottom: 55rpx; background: var(--zs-canvas); }
.hero { padding: 41rpx 29rpx 62rpx; border-radius: 0 0 34rpx 34rpx; color: white; background: linear-gradient(145deg,#17664c,#104b39); }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 1.8rpx; }
.hero-title { margin-top: 13rpx; font-size: 42rpx; line-height: 1.22; font-weight: 800; }
.hero-title-second { margin-top: 0; }
.hero-subtitle { display: block; margin-top: 13rpx; color: #d2e8d9; font-size: 22rpx; }
.content { position: relative; margin: -21rpx 20rpx 0; }
.preview-card, .panel { margin-bottom: 17rpx; padding: 23rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 10rpx; }
.section-title { color: var(--zs-ink); font-size: 28rpx; font-weight: 800; }
.preview-tag { padding: 5rpx 11rpx; border-radius: 8rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 19rpx; }
.preview-image-wrap { position: relative; height: 254rpx; margin-top: 17rpx; overflow: hidden; border-radius: 13rpx; background: #ffd634; }
.preview-image { width: 100%; height: 100%; }
.preview-overlay { position: absolute; left: 15rpx; bottom: 16rpx; padding: 8rpx 13rpx; border-radius: 8rpx; color: #18342b; background: rgba(255,255,255,.87); font-size: 20rpx; font-weight: 750; }
.caption { display: block; margin-top: 13rpx; color: var(--zs-muted); font-size: 20rpx; line-height: 1.5; }
.feature-row { display: flex; gap: 17rpx; padding: 22rpx 0; border-bottom: 1rpx solid var(--zs-border); }
.feature-row:last-child { border-bottom: 0; padding-bottom: 4rpx; }
.feature-index { color: #8db8a0; font-size: 21rpx; font-weight: 800; }
.feature-title { color: var(--zs-ink); font-size: 24rpx; font-weight: 750; }
.feature-detail { display: block; margin-top: 7rpx; color: var(--zs-muted); font-size: 20rpx; line-height: 1.5; }
.step { display: flex; align-items: flex-start; gap: 15rpx; margin-top: 21rpx; color: #4b6555; font-size: 21rpx; line-height: 1.5; }
.step-number { display: flex; justify-content: center; align-items: center; width: 36rpx; height: 36rpx; flex-shrink: 0; border-radius: 18rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 19rpx; font-weight: 800; }
.terms-note { margin-top: 22rpx; padding: 15rpx; border-radius: 10rpx; color: #8d6d3c; background: #fff5e4; font-size: 20rpx; line-height: 1.5; }
.contact-card { padding: 28rpx 23rpx; border-radius: 20rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.contact-kicker { color: #b8dcc4; font-size: 18rpx; letter-spacing: 1.8rpx; font-weight: 700; }
.contact-title { margin-top: 6rpx; font-size: 30rpx; font-weight: 800; }
.contact-name { display: block; margin-top: 11rpx; color: #d5e8d9; font-size: 21rpx; }
.contact-line { display: flex; justify-content: space-between; gap: 13rpx; margin-top: 19rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(255,255,255,.2); font-size: 22rpx; }
.contact-line text:first-child { color: #c9dfcd; }
.contact-line text:last-child { color: white; font-weight: 700; }
.contact-actions { display: flex; gap: 11rpx; margin-top: 23rpx; }
.contact-actions button { flex: 1; margin: 0; height: 67rpx; line-height: 67rpx; border-radius: 34rpx; font-size: 21rpx; font-weight: 750; }
.call-btn { color: var(--zs-green); background: white; }
.wechat-btn { color: white; background: rgba(255,255,255,.17); border: 1rpx solid rgba(255,255,255,.38); }
.contact-hint { display: block; margin-top: 16rpx; color: #c9dfcd; font-size: 19rpx; line-height: 1.45; }
</style>
