<template>
  <view class="privacy-page">
    <view class="hero">
      <text class="kicker">PRIVACY</text>
      <view class="hero-title">隐私与信息处理说明</view>
      <text class="hero-subtitle">了解竹山街坊惠如何使用你提供的信息</text>
    </view>
    <view class="body">
      <view class="notice" v-if="!LEGAL_PROFILE.operatorName || !LEGAL_PROFILE.privacyPhone">{{ !LEGAL_PROFILE.operatorName ? '运营主体名称尚未核对，当前页面仅供上线前检查。' : '隐私联系方式尚未配置，当前页面仅供上线前检查。' }}</view>
      <view class="card">
        <view class="section-title">运营主体</view>
        <text class="paragraph">{{ LEGAL_PROFILE.operatorName || '待补充微信公众平台认证主体名称' }}</text>
        <text class="paragraph muted">本说明更新于 {{ LEGAL_PROFILE.updatedAt }}。</text>
      </view>
      <view class="card">
        <view class="section-title">我们处理哪些信息</view>
        <text class="paragraph">你阅读并同意服务协议与隐私说明后，我们通过微信云函数识别你的微信身份，并保存用于区分用户的标识摘要、同意版本及账号状态。你手动选择的乡镇保存在本机，用于筛选本地内容；当前版本不获取手机精确定位。</text>
        <text class="paragraph">发布便民信息时，我们处理你填写的标题、正文、图片、乡镇和联系电话。联系电话仅在你明确勾选公开同意、且信息审核通过后，才会展示给其他用户。</text>
        <text class="paragraph">申请商家入驻时，我们处理门店名称、地址、电话、营业资料和你提交的资质图片；资质图片供平台审核，不在公开店铺页展示。</text>
        <text class="paragraph">领券、预约及核销时，我们记录券、门店、预约时段与状态；你提交的预约称呼和联系电话提供给接待门店处理预约。扫码与核销记录用于履约核对和异常处理。</text>
      </view>
      <view class="card">
        <view class="section-title">如何使用与展示</view>
        <text class="paragraph">公开列表只展示审核通过、未下架且未过期的信息和商家。你主动公开的联系电话会出现在对应信息详情页；预约联系方式只用于该次服务接待。我们不会把一家店的顾客联系方式作为名单交给其他合作店。</text>
        <text class="paragraph">云开发服务用于保存业务记录和图片。审核、举报、券和合作记录只向有相应权限的用户或工作人员开放。</text>
      </view>
      <view class="card">
        <view class="section-title">保存与个人选择</view>
        <text class="paragraph">便民信息到期或下架后不再出现在公开列表。券、预约、商家审核及操作记录会保留以便处理履约和争议；当前版本没有自动清除这些后台记录的功能。</text>
        <text class="paragraph">你可以在“我的发布”编辑或下架自己的信息。若需查询、更正或申请删除其他个人信息，请联系下方隐私联系人；运营人员核实身份与相关服务记录后处理。</text>
      </view>
      <view class="card">
        <view class="section-title">隐私联系</view>
        <text class="paragraph">{{ LEGAL_PROFILE.privacyPhone || '联系方式待补充' }}</text>
        <button v-if="LEGAL_PROFILE.privacyPhone" class="contact-button" @tap="callPrivacy">拨打隐私联系电话</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import LEGAL_PROFILE from '@/constants/legal.json';

const callPrivacy = () => {
  if (LEGAL_PROFILE.privacyPhone) uni.makePhoneCall({ phoneNumber: LEGAL_PROFILE.privacyPhone });
};
</script>

<style scoped>
.privacy-page { min-height: 100vh; background: var(--zs-canvas); padding-bottom: 50rpx; }
.hero { padding: 39rpx 28rpx 56rpx; border-radius: 0 0 32rpx 32rpx; color: white; background: linear-gradient(145deg,#17664c,#104b39); }
.kicker { color: #c8e7d2; font-size: 18rpx; letter-spacing: 2rpx; font-weight: 700; }
.hero-title { margin-top: 8rpx; font-size: 35rpx; font-weight: 800; }
.hero-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; }
.body { position: relative; margin: -18rpx 20rpx 0; }
.notice { margin-bottom: 15rpx; padding: 16rpx 18rpx; border-radius: 12rpx; color: #915e25; background: #fff3dd; font-size: 20rpx; line-height: 1.5; }
.card { margin-bottom: 15rpx; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 18rpx; background: white; }
.section-title { color: var(--zs-ink); font-size: 27rpx; font-weight: 800; }
.paragraph { display: block; margin-top: 14rpx; color: #4b6555; font-size: 22rpx; line-height: 1.7; }
.muted { color: #819184; font-size: 20rpx; }
.contact-button { margin: 20rpx 0 0; height: 70rpx; line-height: 70rpx; border-radius: 35rpx; color: white; background: var(--zs-green); font-size: 22rpx; font-weight: 700; }
</style>
