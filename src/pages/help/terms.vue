<template>
  <view class="terms-page">
    <view class="hero">
      <text class="kicker">TERMS OF SERVICE</text>
      <view class="hero-title">用户服务协议</view>
      <text class="hero-subtitle">使用竹山街坊汇前，请了解服务范围与使用规则</text>
    </view>
    <view class="body">
      <view class="notice" v-if="!LEGAL_PROFILE.operatorName">运营主体名称尚未核对，当前协议仅供上线前预览。</view>
      <view class="card">
        <view class="section-title">服务提供方</view>
        <text class="paragraph">{{ LEGAL_PROFILE.operatorName || '待补充微信公众平台登记主体名称' }}</text>
        <text class="paragraph muted">本协议更新于 {{ LEGAL_PROFILE.updatedAt }}。如有疑问，可拨打 {{ LEGAL_PROFILE.supportPhone || '待公布的帮助电话' }} 联系平台。</text>
      </view>
      <view class="card">
        <view class="section-title">1. 服务内容</view>
        <text class="paragraph">竹山街坊汇提供本地便民信息浏览与发布、已审核商家展示、门店优惠券领取与出示、服务预约，以及商家申请和管理功能。当前版本不提供小程序内在线支付。</text>
        <text class="paragraph">部分优惠须在门店扫码后进入该店福利页；合作店优惠仅在双方确认、券仍有效且符合展示条件时出现。</text>
      </view>
      <view class="card">
        <view class="section-title">2. 发布与账号使用</view>
        <text class="paragraph">发布信息、申请商家入驻时，请提交真实、准确且有权使用的内容与图片，不冒用他人身份，不发布违法、虚假、侵权或诱导交易的信息。</text>
        <text class="paragraph">信息与商家资料提交后先进入人工审核。审核未通过或被下架时，平台会在相应记录中展示状态或原因；你可以修改、下架自己的信息，并通过帮助电话联系平台处理争议。</text>
      </view>
      <view class="card">
        <view class="section-title">3. 优惠券与预约</view>
        <text class="paragraph">优惠券的适用门店、使用门槛、有效期、数量和预约要求以领取时展示的券面规则为准。领取成功不等于预约成功；需预约的服务以接待门店确认的时段为准。</text>
        <text class="paragraph">到店使用时，请向对应门店出示券码，由有权限的店员核销。若门店无法兑现券面承诺，请保留券码和沟通情况，通过“帮助与反馈”联系平台核对。</text>
      </view>
      <view class="card">
        <view class="section-title">4. 信息与隐私</view>
        <text class="paragraph">同意登录后，小程序会通过微信云函数识别你的微信身份并建立用户编号。发布、入驻、预约等场景会另行告知所需信息及公开范围。详细处理方式请阅读《隐私说明》。</text>
        <button class="link-button" @tap="goToPrivacy">查看隐私说明</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import LEGAL_PROFILE from '@/constants/legal.json';
const goToPrivacy = () => uni.navigateTo({ url: '/pages/help/privacy' });
</script>

<style scoped>
.terms-page { min-height: 100vh; padding-bottom: 55rpx; background: var(--zs-canvas); }
.hero { padding: 39rpx 28rpx 56rpx; border-radius: 0 0 32rpx 32rpx; color: white; background: linear-gradient(145deg,#17664c,#104b39); }
.kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 8rpx; font-size: 37rpx; font-weight: 800; }
.hero-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; line-height: 1.5; }
.body { position: relative; margin: -18rpx 20rpx 0; }
.notice { margin-bottom: 15rpx; padding: 16rpx 18rpx; border-radius: 12rpx; color: #915e25; background: #fff3dd; font-size: 20rpx; line-height: 1.5; }
.card { margin-bottom: 15rpx; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 18rpx; background: white; }
.section-title { color: var(--zs-ink); font-size: 27rpx; font-weight: 800; }
.paragraph { display: block; margin-top: 14rpx; color: #4b6555; font-size: 22rpx; line-height: 1.7; }
.muted { color: #819184; font-size: 20rpx; }
.link-button { margin: 18rpx 0 0; height: 67rpx; line-height: 67rpx; border-radius: 34rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; font-weight: 750; }
</style>
