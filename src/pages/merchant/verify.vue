<template>
  <view class="verify-page">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">VERIFY BENEFITS</text>
      <view class="zs-page-hero__title">优惠券核销</view>
      <text class="zs-page-hero__subtitle">扫码或输入券码，确认顾客权益</text>
    </view>
    <view class="scan-card demo-notice" v-if="USE_MOCK">本地演示核销，不会产生真实优惠或门店结算</view>
    <view class="scan-card">
      <view class="scan-header">
        <text class="scan-title">核销顾客卡券</text>
        <text class="shop-tag">{{ merchant?.name }}</text>
      </view>

      <button class="camera-btn" @tap="handleScanCode">
        <image class="cam-icon" :src="'/static/icons/search.png'" mode="aspectFit" />
        <text class="cam-text">开启摄像头扫码核销</text>
      </button>

      <view class="divider">
        <text class="div-text">或手动输入券码</text>
      </view>

      <view class="input-row">
        <input 
          class="code-input" 
          placeholder="请输入 10-12 位券码 (例如 ZS2026112001)" 
          v-model="inputCode" 
        />
        <button class="verify-btn" @tap="handleManualVerify">确认核销</button>
      </view>
    </view>

    <!-- 最近核销成功记录 -->
    <view class="history-card" v-if="historyList.length > 0">
      <view class="hist-title">本店核销记录</view>
      <view class="hist-item" v-for="(item, idx) in historyList" :key="idx">
        <view class="item-left">
          <text class="item-name">{{ item.coupon_title }}</text>
          <text class="item-time">核销时间：{{ item.verify_time }}</text>
        </view>
        <text class="item-status">已核销</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useMerchantStore } from '@/store/merchant';
import { verifyCoupon, getVerifyLogs } from '@/api/coupon';
import { USE_MOCK } from '@/api/adapter';

const merchantStore = useMerchantStore();
const merchant = computed(() => merchantStore.currentMerchant);

const inputCode = ref('');
const historyList = ref<any[]>([]);
const loadHistory = async () => {
  historyList.value = merchant.value ? (await getVerifyLogs(merchant.value._id)).map(item => ({
    coupon_title: item.coupon_title,
    verify_time: new Date(item.verified_at).toLocaleString(),
    code: item.coupon_code
  })) : [];
};
onShow(loadHistory);

const executeVerify = async (code: string) => {
  if (!code.trim()) {
    uni.showToast({ title: '请输入券码', icon: 'none' });
    return;
  }
  if (!merchant.value) {
    uni.showToast({ title: '当前账号没有可操作的商家', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '核销中...' });
  try {
    const res = await verifyCoupon({
      code: code.trim(),
      operatorMerchantId: merchant.value._id
    });

    uni.hideLoading();

    if (res.success) {
      // 成功核销给予柜台触觉反馈
      uni.vibrateShort({ type: 'heavy' });
      uni.showModal({
        title: '核销成功',
        content: USE_MOCK
          ? `本地演示已核销【${res.coupon?.rule_snapshot?.title}】，不会产生实际抵扣。`
          : `已核销【${res.coupon?.rule_snapshot?.title}】。`,
        showCancel: false
      });
      await loadHistory();
      inputCode.value = '';
    } else {
      // 严格输出 PRD 8.4 错误码
      uni.showModal({
        title: '核销失败',
        content: `[错误码 ${res.code}] ${res.message}`,
        showCancel: false
      });
    }
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: '网络异常，核销失败', icon: 'none' });
  }
};

const handleScanCode = () => {
  uni.scanCode({
    onlyFromCamera: true,
    success: (res) => {
      if (res.result) {
        executeVerify(res.result);
      }
    },
    fail: () => {
      uni.showToast({ title: '扫码已取消', icon: 'none' });
    }
  });
};

const handleManualVerify = () => {
  executeVerify(inputCode.value);
};
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  background-color: var(--zs-canvas);
  padding: 24rpx;
}

.scan-card {
  background: #ffffff;
  border-radius: 19rpx;
  padding: 26rpx;
  border: 1rpx solid var(--zs-border);
  box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035);
  margin-bottom: 18rpx;
}
.demo-notice { color: #896c3b; background: #fff5e5; font-size: 20rpx; line-height: 1.5; }

.scan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.scan-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #111827;
}

.shop-tag {
  font-size: 20rpx;
  color: var(--zs-green);
  background: var(--zs-green-soft);
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
}

.camera-btn {
  background: linear-gradient(135deg, var(--zs-green-dark), var(--zs-green));
  color: #ffffff;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: bold;
  border: none;
}

.cam-icon {
  width: 35rpx;
  height: 35rpx;
  filter: brightness(0) invert(1);
}

.divider {
  text-align: center;
  margin: 36rpx 0 24rpx;
  position: relative;
}

.div-text {
  font-size: 22rpx;
  color: #9CA3AF;
  background: #ffffff;
  padding: 0 20rpx;
  position: relative;
  z-index: 2;
}

.input-row {
  display: flex;
  gap: 16rpx;
}

.code-input {
  flex: 1;
  background: #F9FAFB;
  border: 1rpx solid #E5E7EB;
  border-radius: 12rpx;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 24rpx;
}

.verify-btn {
  background: #10B981;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: bold;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 28rpx;
  border-radius: 12rpx;
  border: none;
}

.history-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
}

.hist-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #374151;
  margin-bottom: 20rpx;
}

.hist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F3F4F6;
}

.item-name {
  font-size: 24rpx;
  color: #1F2937;
  font-weight: 500;
  display: block;
}

.item-time {
  font-size: 20rpx;
  color: #9CA3AF;
  margin-top: 4rpx;
  display: block;
}

.item-status {
  font-size: 22rpx;
  color: #10B981;
  font-weight: bold;
}
</style>
