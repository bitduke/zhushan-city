<template>
  <view class="welcome-page">
    <view class="hero">
      <view class="mark">竹</view>
      <text class="kicker">WELCOME TO ZHUSHAN</text>
      <view class="title">欢迎来到竹山街坊汇</view>
      <text class="subtitle">找身边的信息与好店，查看门店福利，管理自己的发布和卡券。</text>
    </view>

    <view class="content">
      <view class="notice" v-if="!LEGAL_PROFILE.operatorName">当前为测试预览，运营主体名称待平台审核后补齐。</view>
      <view class="intro-card">
        <view class="section-title">使用前请了解</view>
        <view class="point"><text class="dot"></text><text>同意后，系统会识别你的微信身份并创建用户编号，用于区分发布、领券与预约记录。</text></view>
        <view class="point"><text class="dot"></text><text>此步骤不读取你的微信头像、昵称或手机号；发布信息、预约门店时填写的联系方式会另行告知用途。</text></view>
        <view class="point"><text class="dot"></text><text>信息与商家需审核后公开；优惠以券面规则和门店确认结果为准。</text></view>
      </view>

      <view class="agreement-row">
        <checkbox id="service-consent" :checked="accepted" @tap="accepted = !accepted" />
        <view class="agreement-text">
          我已阅读并同意
          <text id="welcome-terms-link" class="link" @tap="goToTerms">《用户服务协议》</text>
          和 <text id="welcome-privacy-link" class="link" @tap="goToPrivacy">《隐私说明》</text>
        </view>
      </view>
      <text v-if="privacyContractName" class="official-link" @tap="openOfficialPrivacy">查看微信平台{{ privacyContractName }}</text>
      <text v-if="errorMessage" class="error">{{ errorMessage }}</text>

      <button
        v-if="needsWechatPrivacy"
        id="welcome-agree-native"
        class="enter-button"
        open-type="agreePrivacyAuthorization"
        :disabled="!accepted || busy || checkingPrivacy"
        @agreeprivacyauthorization="handleWechatPrivacyAgree"
      >{{ busy ? '正在确认身份…' : '同意并授权登录' }}</button>
      <button
        v-else
        id="welcome-agree"
        class="enter-button"
        :disabled="!accepted || busy || checkingPrivacy"
        @tap="enter"
      >{{ busy ? '正在确认身份…' : '同意并登录' }}</button>
      <button class="later-button" @tap="decline">暂不同意</button>
      <text v-if="declined" class="decline-note">未同意前不会创建用户记录。你可以先阅读协议，准备好后再选择。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { useUserStore } from '@/store/user';
import { grantServiceConsent, hasServiceConsent, rememberLaunch, takeRememberedLaunch } from '@/utils/consent';
import { parseScene } from '@/utils/scene';
import LEGAL_PROFILE from '@/constants/legal.json';

const accepted = ref(false);
const declined = ref(false);
const busy = ref(false);
const checkingPrivacy = ref(true);
const needsWechatPrivacy = ref(false);
const privacyContractName = ref('');
const errorMessage = ref('');
const userStore = useUserStore();

onLoad((options) => {
  if (options?.next) {
    try { rememberLaunch(JSON.parse(String(options.next))); }
    catch {
      try { rememberLaunch(JSON.parse(decodeURIComponent(String(options.next)))); }
      catch { /* 无效跳转参数忽略，登录后进入首页 */ }
    }
  }
  if (hasServiceConsent()) { uni.switchTab({ url: '/pages/index/index' }); return; }
  // #ifdef MP-WEIXIN
  if (!USE_MOCK && typeof wx !== 'undefined' && typeof (wx as any).getPrivacySetting === 'function') {
    (wx as any).getPrivacySetting({
      success: (result: any) => {
        needsWechatPrivacy.value = result.needAuthorization === true;
        privacyContractName.value = String(result.privacyContractName || '');
      },
      complete: () => { checkingPrivacy.value = false; }
    });
    return;
  }
  // #endif
  checkingPrivacy.value = false;
});

const goToTerms = () => uni.navigateTo({ url: '/pages/help/terms' });
const goToPrivacy = () => uni.navigateTo({ url: '/pages/help/privacy' });
const openOfficialPrivacy = () => {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && typeof (wx as any).openPrivacyContract === 'function') {
    (wx as any).openPrivacyContract({ fail: () => goToPrivacy() });
    return;
  }
  // #endif
  goToPrivacy();
};
const decline = () => { declined.value = true; accepted.value = false; };
const handleWechatPrivacyAgree = () => { if (accepted.value) enter(); };

const enter = async () => {
  if (!accepted.value || busy.value) return;
  busy.value = true;
  errorMessage.value = '';
  grantServiceConsent();
  await userStore.initUser();
  if (!userStore.isLoggedIn) {
    errorMessage.value = '微信身份确认失败，请检查网络后重试。';
    busy.value = false;
    return;
  }
  const target = takeRememberedLaunch();
  if (target?.query?.scene) {
    const scene = target.query.scene;
    const token = parseScene(scene).t || scene;
    uni.switchTab({ url: '/pages/index/index', success: () => {
      setTimeout(() => uni.navigateTo({ url: '/pages/benefit/shop?scene=' + encodeURIComponent(token) }), 100);
    } });
    return;
  }
  const path = target?.path || 'pages/index/index';
  const tabPaths = ['pages/index/index', 'pages/coupon/mine', 'pages/merchant/list', 'pages/user/index'];
  if (tabPaths.includes(path)) { uni.switchTab({ url: '/' + path }); return; }
  const query = target?.query || {};
  const suffix = Object.entries(query).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
  uni.switchTab({ url: '/pages/index/index', success: () => {
    setTimeout(() => uni.navigateTo({ url: '/' + path + (suffix ? '?' + suffix : '') }), 100);
  } });
};
</script>

<style scoped>
.welcome-page { min-height: 100vh; background: var(--zs-canvas); }
.hero { padding: 80rpx 40rpx 90rpx; border-radius: 0 0 44rpx 44rpx; color: white; background: linear-gradient(145deg,#17664c,#104b39); }
.mark { width: 95rpx; height: 95rpx; display: flex; align-items: center; justify-content: center; border-radius: 26rpx; color: #17664c; background: #fff3da; font-size: 55rpx; font-weight: 900; }
.kicker { display: block; margin-top: 37rpx; color: #c8e7d2; font-size: 18rpx; letter-spacing: 2rpx; font-weight: 700; }
.title { margin-top: 9rpx; font-size: 40rpx; line-height: 1.2; font-weight: 850; }
.subtitle { display: block; margin-top: 16rpx; color: #e2f0e6; font-size: 23rpx; line-height: 1.6; }
.content { position: relative; margin: -28rpx 22rpx 0; padding-bottom: 55rpx; }
.notice { margin-bottom: 15rpx; padding: 15rpx 18rpx; border-radius: 13rpx; color: #8a632d; background: #fff2da; font-size: 20rpx; line-height: 1.5; }
.intro-card { padding: 28rpx 24rpx; border: 1rpx solid var(--zs-border); border-radius: 21rpx; background: white; box-shadow: 0 7rpx 22rpx rgba(19,53,35,.05); }
.section-title { color: var(--zs-ink); font-size: 29rpx; font-weight: 800; }
.point { display: flex; gap: 14rpx; margin-top: 21rpx; color: #506a58; font-size: 21rpx; line-height: 1.6; }
.dot { flex-shrink: 0; width: 11rpx; height: 11rpx; margin-top: 12rpx; border-radius: 50%; background: #df9d43; }
.agreement-row { display: flex; align-items: flex-start; gap: 10rpx; margin: 29rpx 8rpx 0; }
.agreement-row checkbox { flex-shrink: 0; }
.agreement-text { flex: 1; color: var(--zs-muted); font-size: 21rpx; line-height: 1.65; }
.link, .official-link { color: var(--zs-green); font-weight: 750; }
.official-link { display: block; margin: 13rpx 10rpx 0; font-size: 20rpx; }
.error { display: block; margin: 18rpx 9rpx 0; color: #b34f43; font-size: 20rpx; }
.enter-button { margin: 30rpx 0 0; height: 82rpx; line-height: 82rpx; border-radius: 41rpx; color: white; background: var(--zs-green); font-size: 25rpx; font-weight: 800; }
.enter-button[disabled] { opacity: .47; }
.later-button { margin: 12rpx 0 0; height: 70rpx; line-height: 70rpx; color: var(--zs-muted); background: transparent; font-size: 22rpx; }
.decline-note { display: block; margin: 0 10rpx; color: #88968b; font-size: 19rpx; line-height: 1.5; text-align: center; }
</style>
