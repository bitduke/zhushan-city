<template>
  <view class="page">
    <view class="card">
      <view class="state-icon"><image :src="'/static/icons/store.png'" mode="aspectFit" /></view>
      <view class="title">门店码暂不可用</view>
      <view class="reason">{{ reason }}</view>
      <view class="hint">请核对门店张贴的二维码，或从首页寻找已审核的商家。</view>
      <button class="primary" @tap="home">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const reason = ref('门店码不存在或已失效');
onLoad(options => {
  const text = String(options?.reason || '').trim();
  if (text) {
    try { reason.value = decodeURIComponent(text).slice(0, 80); }
    catch { reason.value = '门店码不存在或已失效'; }
  }
});
const home = () => uni.switchTab({ url: '/pages/index/index' });
</script>

<style scoped>
.page { min-height: 100vh; padding: 40rpx 24rpx; background: var(--zs-canvas); }
.card { margin-top: 55rpx; padding: 42rpx 29rpx; border: 1rpx solid var(--zs-border); border-radius: 21rpx; background: #fff; text-align: center; }
.state-icon { display: flex; align-items: center; justify-content: center; width: 110rpx; height: 110rpx; margin: 0 auto 22rpx; border-radius: 28rpx; background: var(--zs-green-soft); }
.state-icon image { width: 62rpx; height: 62rpx; }
.title { color: var(--zs-ink); font-size: 32rpx; font-weight: 800; }
.reason { margin-top: 16rpx; color: #aa6a39; font-size: 24rpx; }
.hint { margin: 20rpx 0 29rpx; color: var(--zs-muted); font-size: 22rpx; line-height: 1.6; }
.primary { height: 74rpx; line-height: 74rpx; border-radius: 37rpx; color: #fff; background: var(--zs-green); font-size: 23rpx; font-weight: 700; }
</style>
