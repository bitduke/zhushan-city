<template>
  <view class="merchant-page">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">MERCHANT DESK</text>
      <view class="zs-page-hero__title">商家工作台</view>
      <text class="zs-page-hero__subtitle">核销、预约和合作记录都在这里</text>
    </view>
    <view class="board-card" v-if="USE_MOCK">
      <text>本地演示：切换门店以测试预约和核销，记录只保存在此设备</text>
      <picker :range="demoMerchantNames" :value="selectedMerchantIndex" @change="changeDemoMerchant">
        <view class="preview-btn">当前演示门店：{{ merchant?.name }} ▼</view>
      </picker>
    </view>
    <view class="board-card" v-if="!USE_MOCK && demoMerchants.length > 1">
      <picker :range="demoMerchantNames" :value="selectedMerchantIndex" @change="changeDemoMerchant">
        <view class="preview-btn">当前门店：{{ merchant?.name }} ▼</view>
      </picker>
    </view>
    <!-- 商家头部名片 -->
    <view class="merchant-card" v-if="merchant">
      <view class="info-row">
        <image v-if="showAvatar" class="shop-avatar" :src="merchant.avatar" mode="aspectFill" @error="avatarFailed = true" />
        <view v-else class="shop-avatar avatar-fallback"><image :src="'/static/icons/store.png'" mode="aspectFit" /></view>
        <view class="shop-meta">
          <view class="shop-name-wrap">
            <text class="shop-name">{{ merchant.name }}</text>
            <text class="verified-tag">{{ USE_MOCK ? '演示门店' : merchant.status === 'APPROVED' ? '已审核' : '审核中' }}</text>
          </view>
          <text class="shop-town">{{ merchant.town }} · {{ merchant.category_name }}</text>
        </view>
      </view>

      <view class="qr-action-bar" v-if="merchant.status === 'APPROVED'">
        <text class="qr-text">福利页 · 门店码 {{ merchant.qrcode_token || '待生成' }}</text>
        <button class="preview-btn" @tap="previewBenefitPage">预览顾客端</button>
        <button v-if="!USE_MOCK" class="preview-btn" @tap="showMerchantCode">生成／查看小程序码</button>
      </view>
      <view v-if="!USE_MOCK && codeUrl" class="code-panel">
        <image class="code-image" :src="codeUrl" mode="aspectFit" />
        <text class="code-hint">{{ codeVersion === 'release' ? '正式版门店码；张贴前请真机扫码核对门店。' : '开发／体验版门店码，仅供联调；正式发布后需重新生成。' }}</text>
      </view>
    </view>

    <!-- 今日核心数据看板 (基于 PRD 真实指标) -->
    <view class="board-card" v-if="merchant && USE_MOCK">
      <view class="board-header">
        <text class="board-title">本地演示记录</text>
        <text class="board-date">仅供流程测试</text>
      </view>

      <view class="data-grid">
        <view class="data-item">
          <text class="num">{{ mockCounts.scans }}</text>
          <text class="label">本店码去重扫码</text>
        </view>
        <view class="data-item">
          <text class="num">{{ mockCounts.claimed }}</text>
          <text class="label">本店领券数</text>
        </view>
        <view class="data-item">
          <text class="num highlight">{{ mockCounts.verified }}</text>
          <text class="label">本店核销量</text>
        </view>
        <view class="data-item">
          <text class="num blue">{{ mockCounts.crossClaims }}</text>
          <text class="label">从本店页领合作券</text>
        </view>
        <view class="data-item">
          <text class="num green">{{ mockCounts.confirmedGuests }}</text>
          <text class="label">{{ merchant._id === 'shop_001' ? '双方确认的带出新客' : '双方确认的收到新客' }}</text>
        </view>
      </view>
    </view>

    <!-- 核心操作功能区 -->
    <view class="action-grid" v-if="merchant && merchant.status === 'APPROVED'">
      <view class="menu-card" v-if="canManage" @tap="goToManage">
        <view class="menu-icon"><image :src="'/static/icons/store.png'" mode="aspectFit" /></view>
        <view class="menu-text"><text class="menu-title">店铺资料</text><text class="menu-desc">营业时间、地址与审核状态</text></view>
      </view>
      <view class="menu-card" v-if="canManage" @tap="goToCoupons">
        <view class="menu-icon"><image :src="'/static/icons/ticket.png'" mode="aspectFit" /></view>
        <view class="menu-text"><text class="menu-title">优惠券 & 拓客参谋</text><text class="menu-desc">行业模板一键套用、建券上架</text></view>
      </view>
      <view class="menu-card primary-action" v-if="canVerify" @tap="goToVerify">
        <view class="menu-icon"><image :src="'/static/icons/search.png'" mode="aspectFit" /></view>
        <view class="menu-text">
          <text class="menu-title">扫码 / 输码核销</text>
          <text class="menu-desc">验证顾客优惠券并出库</text>
        </view>
      </view>

      <view class="menu-card" @tap="goToRanking">
        <view class="menu-icon"><image :src="'/static/icons/gem.png'" mode="aspectFit" /></view>
        <view class="menu-text">
          <text class="menu-title">商圈引流榜</text>
          <text class="menu-desc">查看经核对的引流结果</text>
        </view>
      </view>

      <view class="menu-card" v-if="canAppointment" @tap="goToAppointment">
        <view class="menu-icon"><image :src="'/static/icons/clipboard.png'" mode="aspectFit" /></view>
        <view class="menu-text">
          <text class="menu-title">预约处理</text>
          <text class="menu-desc">接单确认与到店核验</text>
        </view>
      </view>

      <view class="menu-card" v-if="canManage" @tap="goToCooperation">
        <view class="menu-icon"><image :src="'/static/icons/box.png'" mode="aspectFit" /></view>
        <view class="menu-text">
          <text class="menu-title">拓客合作与对账</text>
          <text class="menu-desc">发布、接受、核对结果与收付</text>
        </view>
      </view>
      <view class="menu-card" v-if="canManage" @tap="goToStaff">
        <view class="menu-icon"><image :src="'/static/icons/user.png'" mode="aspectFit" /></view>
        <view class="menu-text"><text class="menu-title">员工权限</text><text class="menu-desc">邀请并停用本店员工</text></view>
      </view>
    </view>
    <view v-if="!merchant" class="board-card">当前账号尚无已审核商家，无法使用商家工作台。</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useMerchantStore } from '@/store/merchant';
import { USE_MOCK } from '@/api/adapter';
import { readMockState } from '@/api/mockState';
import { getMyMerchants } from '@/api/merchant';
import { getMerchantCodeImage } from '@/api/merchantCode';
import type { Merchant } from '@/types/merchant';

const merchantStore = useMerchantStore();
const merchant = computed(() => merchantStore.currentMerchant);
const avatarFailed = ref(false);
const showAvatar = computed(() => !!merchant.value?.avatar && !merchant.value.avatar.includes('picsum.photos') && !avatarFailed.value);
const canManage = computed(() => USE_MOCK || merchant.value?.access_role === 'OWNER');
const canVerify = computed(() => USE_MOCK || !!merchant.value?.can_verify);
const canAppointment = computed(() => USE_MOCK || !!merchant.value?.can_handle_appointment);
const demoMerchants = ref<Merchant[]>([]);
const demoMerchantNames = computed(() => demoMerchants.value.map(item => item.name));
const selectedMerchantIndex = computed(() => Math.max(0, demoMerchants.value.findIndex(item => item._id === merchant.value?._id)));
const mockCounts = ref({ scans: 0, claimed: 0, verified: 0, crossClaims: 0, confirmedGuests: 0 });
const codeUrl = ref('');
const codeVersion = ref('develop');

const refreshCounts = async () => {
  if (!USE_MOCK) {
    try {
      demoMerchants.value = await getMyMerchants();
      if (!demoMerchants.value.some(item => item._id === merchant.value?._id)) merchantStore.setCurrentMerchant(demoMerchants.value[0] || null);
    } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '店铺加载失败', icon: 'none' }); }
    return;
  }
  const state = readMockState();
  demoMerchants.value = state.merchants.filter(item => item.status === 'APPROVED');
  if (!demoMerchants.value.some(item => item._id === merchant.value?._id)) {
    merchantStore.setCurrentMerchant(demoMerchants.value[0] || null);
  }
  if (!merchant.value) return;
  const id = merchant.value._id;
  mockCounts.value = {
    scans: state.scanLogs.filter(item => item.source_merchant_id === id).length,
    claimed: state.coupons.filter(item => item.merchant_id === id).length,
    verified: state.verifyLogs.filter(item => item.merchant_id === id).length,
    crossClaims: state.coupons.filter(item => item.source_merchant_id === id && item.merchant_id !== id).length,
    confirmedGuests: state.cooperationResults.filter(item => item.status === 'CONFIRMED' && (id === 'shop_001' ? item.promoter_merchant_id === id : item.buyer_merchant_id === id)).length
  };
};
onShow(refreshCounts);

const changeDemoMerchant = (event: any) => {
  const selected = demoMerchants.value[Number(event.detail.value)];
  if (!selected) return;
  merchantStore.setCurrentMerchant(selected);
  avatarFailed.value = false;
  codeUrl.value = '';
  refreshCounts();
};

const showMerchantCode = async () => {
  if (USE_MOCK || !merchant.value) return;
  try {
    uni.showLoading({ title: '生成门店码...' });
    const result = await getMerchantCodeImage(merchant.value._id);
    codeUrl.value = result.url;
    codeVersion.value = result.envVersion;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '门店码生成失败', icon: 'none' });
  } finally { uni.hideLoading(); }
};

const previewBenefitPage = () => {
  uni.navigateTo({
    url: `/pages/benefit/shop?shopId=${merchant.value?._id}`
  });
};

const goToVerify = () => {
  uni.navigateTo({ url: '/pages/merchant/verify' });
};

const goToManage = () => uni.navigateTo({ url: '/pages/merchant/manage' });
const goToCoupons = () => uni.navigateTo({ url: '/pages/merchant/coupons' });
const goToStaff = () => uni.navigateTo({ url: '/pages/merchant/staff' });

const goToRanking = () => {
  uni.navigateTo({ url: '/pages/merchant/ranking' });
};

const goToAppointment = () => {
  uni.navigateTo({ url: '/pages/merchant/appointment' });
};

const goToCooperation = () => {
  uni.navigateTo({ url: '/pages/merchant/cooperation' });
};
</script>

<style scoped>
.merchant-page {
  min-height: 100vh;
  background-color: var(--zs-canvas);
  padding: 24rpx;
}

.merchant-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid var(--zs-border);
  box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035);
}

.info-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.shop-avatar {
  width: 110rpx;
  height: 110rpx;
  border-radius: 16rpx;
  background: #E5E7EB;
}
.avatar-fallback { display: flex; align-items: center; justify-content: center; background: #eaf4ee; }
.avatar-fallback image { width: 58rpx; height: 58rpx; }

.shop-meta {
  flex: 1;
}

.shop-name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.shop-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #111827;
}

.verified-tag {
  background: #D1FAE5;
  color: #065F46;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}

.shop-town {
  font-size: 22rpx;
  color: #6B7280;
  margin-top: 6rpx;
  display: block;
}

.qr-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F3F4F6;
}
.code-panel { margin-top: 18rpx; text-align: center; }
.code-image { width: 360rpx; height: 360rpx; }
.code-hint { display: block; margin-top: 10rpx; color: #6b7280; font-size: 21rpx; }

.qr-text {
  font-size: 22rpx;
  color: #4B5563;
}

.preview-btn {
  background: var(--zs-green-soft);
  color: var(--zs-green);
  font-size: 22rpx;
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  font-weight: 500;
  border: none;
}

.board-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid var(--zs-border);
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.board-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #111827;
}

.board-date {
  font-size: 20rpx;
  color: #9CA3AF;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  text-align: center;
}

.data-item {
  display: flex;
  flex-direction: column;
}

.num {
  font-size: 40rpx;
  font-weight: 900;
  color: #111827;
}

.num.highlight {
  color: #DC2626;
}

.num.blue {
  color: var(--zs-green);
}

.num.green {
  color: #10B981;
}

.label {
  font-size: 20rpx;
  color: #6B7280;
  margin-top: 8rpx;
}

.action-grid {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.menu-card {
  background: #ffffff;
  padding: 22rpx;
  border-radius: 17rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border: 1rpx solid var(--zs-border);
}

.primary-action {
  background: linear-gradient(135deg, var(--zs-green-dark), var(--zs-green));
  color: #ffffff;
}

.primary-action .menu-title {
  color: #ffffff;
}

.primary-action .menu-desc {
  color: rgba(255, 255, 255, 0.8);
}

.menu-icon {
  width: 58rpx;
  height: 58rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: var(--zs-green-soft);
}
.menu-icon image { width: 36rpx; height: 36rpx; }
.primary-action .menu-icon { background: rgba(255,255,255,.88); }

.menu-text {
  flex: 1;
}

.menu-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #111827;
  display: block;
}

.menu-desc {
  font-size: 20rpx;
  color: #9CA3AF;
  margin-top: 4rpx;
  display: block;
}
</style>
