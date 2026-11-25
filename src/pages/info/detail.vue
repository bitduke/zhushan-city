<template>
  <view class="detail-page" v-if="info">
    <view class="header-card">
      <view class="cat-bar">
        <text class="cat-tag">{{ info.category_name }}</text>
        <text class="town-tag">{{ info.town }}</text>
        <text class="time-tag">发布时间：{{ formatTime(info.created_at) }}</text>
      </view>
      <view class="town-tag" v-if="info.status !== 'APPROVED'">当前状态：{{ info.status }} {{ info.review_reason || '' }}</view>

      <view class="title">{{ info.title }}</view>

      <view class="price-box" v-if="info.price_desc || info.price">
        <text class="price-num">{{ info.price_desc || '¥' + info.price }}</text>
      </view>
    </view>

    <view class="content-card">
      <view class="sec-label">详细说明</view>
      <view class="body-text">{{ info.content }}</view>

      <view class="images-box" v-if="visibleImages.length > 0">
        <image 
          class="detail-img" 
          v-for="(img, idx) in visibleImages"
          :key="idx" 
          :src="img" 
          mode="widthFix" 
          @tap="previewImage(img)"
        />
      </view>
    </view>

    <view class="safety-banner">
      <text class="safe-icon">安全提醒</text>
      <text class="safe-desc">平台仅提供便民信息展示。线下看房或交易请核实对方证件与实物，切勿提前转账定金或押金。</text>
    </view>

    <view class="bottom-bar">
      <view class="author-wrap">
        <text class="author-label">发布方：</text>
        <text class="author-name">{{ info.author_name }}</text>
      </view>

      <view class="act-wrap">
        <button id="report-info" class="report-btn" v-if="info.status === 'APPROVED'" @tap="handleReport">举报</button>
        <button class="call-action-btn" v-if="info.contact_consent && info.contact_phone" @tap="makeCall">
          联系发布方
        </button>
        <text v-else>联系电话未公开</text>
      </view>
    </view>
  </view>
  <view class="detail-page" v-else>信息不存在、未审核或已下架。</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { getInfoDetail, reportInfo } from '@/api/info';
import type { InfoItem } from '@/types/info';

const info = ref<InfoItem | null>(null);
const infoId = ref('');
const reasons = ['虚假信息 / 已售已租', '涉诈或要求提前转账', '联系方式无效', '其他违规'];
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};
const visibleImages = computed(() => (info.value?.images || []).filter(src => !src.includes('picsum.photos')));

const previewImage = (current: string) => {
  uni.previewImage({
    current,
    urls: visibleImages.value
  });
};

const load = async () => { if (infoId.value) info.value = await getInfoDetail(infoId.value); };
onLoad((options) => { infoId.value = options?.id || ''; load(); });
onShow(load);

const makeCall = () => {
  if (info.value?.contact_consent && info.value.contact_phone) {
    uni.showModal({
      title: '联系发布方',
      content: `是否呼叫 ${info.value.contact_phone}（${info.value.author_name}）？`,
      confirmText: '呼叫',
      confirmColor: '#17664c',
      success: (res) => {
        if (res.confirm) {
          uni.makePhoneCall({ phoneNumber: info.value!.contact_phone });
        }
      }
    });
  }
};

onShareAppMessage(() => ({
  title: info.value ? `【${info.value.category_name}】${info.value.title}` : '竹山街坊惠便民信息',
  path: `/pages/info/detail?id=${infoId.value}`
}));

onShareTimeline(() => ({
  title: info.value ? `【竹山便民】${info.value.title}` : '竹山街坊惠',
  query: `id=${infoId.value}`
}));

const handleReport = () => {
  uni.showActionSheet({
    itemList: reasons,
    success: async (selection) => {
      try {
        await reportInfo(infoId.value, reasons[selection.tapIndex]);
        uni.showToast({ title: USE_MOCK ? '已进入本地演示举报队列' : '举报已提交', icon: 'none' });
      } catch (error) {
        uni.showToast({ title: error instanceof Error ? error.message : '举报失败', icon: 'none' });
      }
    }
  });
};
</script>

<style scoped>
.detail-page { min-height: 100vh; padding: 22rpx 20rpx 150rpx; background: var(--zs-canvas); }
.header-card, .content-card { padding: 25rpx; border: 1rpx solid var(--zs-border); border-radius: 20rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.header-card { border-top: 7rpx solid var(--zs-green); }
.cat-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 9rpx; }
.cat-tag, .town-tag { padding: 5rpx 12rpx; border-radius: 7rpx; font-size: 19rpx; }
.cat-tag { color: var(--zs-green); background: var(--zs-green-soft); font-weight: 700; }
.town-tag { color: #708477; background: #f1f4ee; }
.time-tag { margin-left: auto; color: #94a298; font-size: 19rpx; }
.title { margin-top: 22rpx; color: var(--zs-ink); font-size: 33rpx; line-height: 1.38; font-weight: 800; }
.price-box { display: inline-block; margin-top: 15rpx; }
.price-num { color: var(--zs-orange); font-size: 38rpx; font-weight: 850; }
.content-card { margin-top: 18rpx; }
.sec-label { color: var(--zs-ink); font-size: 26rpx; font-weight: 750; }
.body-text { margin-top: 16rpx; color: #4e6656; font-size: 25rpx; line-height: 1.7; white-space: pre-wrap; }
.images-box { display: flex; flex-direction: column; gap: 15rpx; margin-top: 20rpx; }
.detail-img { width: 100%; border-radius: 12rpx; }
.safety-banner { display: flex; flex-direction: column; gap: 9rpx; margin-top: 18rpx; padding: 19rpx 22rpx; border: 1rpx solid #f2dfba; border-radius: 17rpx; background: #fff7e8; }
.safe-icon { color: #a36723; font-size: 22rpx; font-weight: 750; }
.safe-desc { color: #8c6b3c; font-size: 21rpx; line-height: 1.5; }
.bottom-bar { position: fixed; z-index: 5; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding: 16rpx 20rpx 23rpx; border-top: 1rpx solid var(--zs-border); background: #fff; }
.author-wrap { display: flex; flex-direction: column; min-width: 0; }
.author-label { color: #8c9a8e; font-size: 18rpx; }
.author-name { max-width: 190rpx; color: var(--zs-ink); font-size: 22rpx; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.act-wrap { display: flex; align-items: center; gap: 9rpx; color: var(--zs-muted); font-size: 19rpx; }
.report-btn { margin: 0; padding: 0 17rpx; height: 61rpx; line-height: 61rpx; border-radius: 31rpx; color: #8b968d; background: #f2f4ef; font-size: 20rpx; }
.call-action-btn { margin: 0; padding: 0 20rpx; height: 65rpx; line-height: 65rpx; border-radius: 33rpx; color: white; background: var(--zs-green); font-size: 21rpx; font-weight: 700; white-space: nowrap; }
</style>
