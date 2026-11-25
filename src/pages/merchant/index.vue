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

    <!-- 近30日经营与同行对比诊断驾驶舱 (正式云端与演示通用) -->
    <view class="board-card diag-card" v-if="merchant && merchant.status === 'APPROVED'">
      <view class="board-header">
        <text class="board-title">📊 经营诊断 · 获客与转化</text>
        <text class="board-date">近 {{ diagnostics?.periodDays || 30 }} 天 · 含今日实时</text>
      </view>

      <view v-if="diagnostics">
        <!-- 漏斗比率三宫格 -->
        <view class="funnel-grid">
          <view class="funnel-item">
            <text class="num">{{ diagnostics.metrics.scans }}</text>
            <text class="label">扫门店码</text>
          </view>
          <view class="funnel-item">
            <text class="num blue">{{ diagnostics.metrics.acquireRate }}%</text>
            <text class="label">扫码获客率 ({{ diagnostics.metrics.selfClaims }}张)</text>
          </view>
          <view class="funnel-item">
            <text class="num highlight">{{ diagnostics.metrics.verifyRate }}%</text>
            <text class="label">核销转化率 ({{ diagnostics.metrics.selfRedeems }}单)</text>
          </view>
        </view>

        <!-- 跨店联盟与待办条 -->
        <view class="coop-mini-row">
          <view class="coop-mini-pill">🤝 盟友带来新客 <text class="bold">{{ diagnostics.metrics.receivedGuests }}</text></view>
          <view class="coop-mini-pill">🚀 我带出新客 <text class="bold">{{ diagnostics.metrics.broughtGuests }}</text></view>
          <view class="coop-mini-pill warn" v-if="diagnostics.pendingAppointmentsCount > 0" @tap="goToAppointment">
            ⏰ 待处理预约 {{ diagnostics.pendingAppointmentsCount }} ›
          </view>
        </view>

        <!-- 同类店铺基准对比 -->
        <view class="peer-box">
          <view class="peer-head">
            <text class="peer-title">同类店铺对比（竹山 · {{ diagnostics.peer.categoryName }}）</text>
            <text class="peer-count">共 {{ diagnostics.peer.peerCount }} 家店</text>
          </view>

          <view class="peer-bars" v-if="diagnostics.peer.hasEnoughPeerSample">
            <view class="peer-row">
              <view class="peer-row-labels">
                <text>扫码获客率：本店 {{ diagnostics.metrics.acquireRate }}%</text>
                <text class="peer-avg">同行均值 {{ diagnostics.peer.peerAvgAcquireRate }}%</text>
              </view>
              <view class="bar-track">
                <view class="bar-fill own" :style="{ width: Math.min(100, diagnostics.metrics.acquireRate) + '%' }"></view>
                <view class="bar-marker" :style="{ left: Math.min(98, diagnostics.peer.peerAvgAcquireRate) + '%' }"></view>
              </view>
              <text class="peer-rank-note" v-if="diagnostics.peer.beatAcquirePercent !== null">高于全县 {{ diagnostics.peer.beatAcquirePercent }}% 同类门店</text>
            </view>

            <view class="peer-row">
              <view class="peer-row-labels">
                <text>核销转化率：本店 {{ diagnostics.metrics.verifyRate }}%</text>
                <text class="peer-avg">同行均值 {{ diagnostics.peer.peerAvgVerifyRate }}%</text>
              </view>
              <view class="bar-track">
                <view class="bar-fill verify" :style="{ width: Math.min(100, diagnostics.metrics.verifyRate) + '%' }"></view>
                <view class="bar-marker" :style="{ left: Math.min(98, diagnostics.peer.peerAvgVerifyRate) + '%' }"></view>
              </view>
              <text class="peer-rank-note" v-if="diagnostics.peer.beatVerifyPercent !== null">高于全县 {{ diagnostics.peer.beatVerifyPercent }}% 同类门店</text>
            </view>
          </view>
          <view v-else class="peer-empty-note">同业及本店样本正在积累中（需满 5 次以上扫码或领券行为才生成基准对比，避免样本偏差）。</view>
        </view>

        <!-- 智能优化建议 -->
        <view class="suggestions-box" v-if="diagnostics.suggestions.length > 0">
          <view class="sug-heading">💡 对症优化建议</view>
          <view class="sug-item" v-for="(sug, idx) in diagnostics.suggestions" :key="idx" @tap="goSuggestionTarget(sug.targetPage)">
            <view class="sug-main">
              <text class="sug-title">{{ sug.title }}</text>
              <text class="sug-detail">{{ sug.detail }}</text>
            </view>
            <text class="sug-btn">{{ sug.actionLabel }} ›</text>
          </view>
        </view>
      </view>
      <view v-else class="peer-empty-note">正在读取经营统计数据...</view>
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
import { getMerchantDiagnostics } from '@/api/ranking';
import { getMerchantCodeImage } from '@/api/merchantCode';
import type { Merchant } from '@/types/merchant';
import type { MerchantDiagnostics } from '@/types/stat';

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
const diagnostics = ref<MerchantDiagnostics | null>(null);
const codeUrl = ref('');
const codeVersion = ref('develop');

const loadDiagnostics = async (targetMerchant: Merchant | null) => {
  diagnostics.value = null;
  if (!targetMerchant || targetMerchant.status !== 'APPROVED') return;
  try {
    diagnostics.value = await getMerchantDiagnostics(targetMerchant._id);
  } catch (err) {
    console.warn('Diagnostics load skipped or failed:', err);
  }
};

const refreshCounts = async () => {
  if (!USE_MOCK) {
    try {
      demoMerchants.value = await getMyMerchants();
      if (!demoMerchants.value.some(item => item._id === merchant.value?._id)) merchantStore.setCurrentMerchant(demoMerchants.value[0] || null);
      await loadDiagnostics(merchantStore.currentMerchant);
    } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '店铺加载失败', icon: 'none' }); }
    return;
  }
  const state = readMockState();
  demoMerchants.value = state.merchants.filter(item => item.status === 'APPROVED');
  if (!demoMerchants.value.some(item => item._id === merchant.value?._id)) {
    merchantStore.setCurrentMerchant(demoMerchants.value[0] || null);
  }
  await loadDiagnostics(merchant.value);
};
onShow(refreshCounts);

const goSuggestionTarget = (url: string) => {
  if (url) uni.navigateTo({ url });
};

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

/* 经营诊断与同业对比样式 */
.diag-card { border-top: 6rpx solid var(--zs-green); }
.funnel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-bottom: 18rpx; }
.funnel-item { background: #f8faf8; padding: 18rpx 10rpx; border-radius: 14rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.funnel-item .num { font-size: 34rpx; font-weight: 900; }
.funnel-item .label { font-size: 18rpx; color: #64748b; margin-top: 6rpx; }

.coop-mini-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 20rpx; }
.coop-mini-pill { background: #f1f5f3; color: #334e41; font-size: 20rpx; padding: 8rpx 16rpx; border-radius: 20rpx; }
.coop-mini-pill .bold { font-weight: 800; color: var(--zs-green); margin-left: 4rpx; }
.coop-mini-pill.warn { background: #fff3ed; color: #d9521e; font-weight: 700; }

.peer-box { background: #fbfdfb; border: 1rpx solid #e3ebe6; border-radius: 16rpx; padding: 18rpx; margin-bottom: 18rpx; }
.peer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.peer-title { font-size: 22rpx; font-weight: 800; color: var(--zs-ink); }
.peer-count { font-size: 19rpx; color: var(--zs-muted); }
.peer-bars { display: flex; flex-direction: column; gap: 18rpx; }
.peer-row-labels { display: flex; justify-content: space-between; font-size: 20rpx; color: #374151; font-weight: 600; margin-bottom: 8rpx; }
.peer-avg { color: #6b7280; font-weight: 500; }
.bar-track { position: relative; height: 14rpx; border-radius: 7rpx; background: #e5ebe7; overflow: visible; }
.bar-fill { height: 100%; border-radius: 7rpx; }
.bar-fill.own { background: linear-gradient(90deg, #17664c, #279973); }
.bar-fill.verify { background: linear-gradient(90deg, #e05d26, #f5885b); }
.bar-marker { position: absolute; top: -4rpx; width: 4rpx; height: 22rpx; background: #1f2937; border-radius: 2rpx; z-index: 2; }
.peer-rank-note { display: block; margin-top: 6rpx; font-size: 19rpx; color: var(--zs-green); font-weight: 700; }
.peer-empty-note { font-size: 21rpx; color: var(--zs-muted); line-height: 1.5; }

.suggestions-box { display: flex; flex-direction: column; gap: 12rpx; }
.sug-heading { font-size: 22rpx; font-weight: 800; color: var(--zs-ink); }
.sug-item { display: flex; justify-content: space-between; align-items: center; gap: 12rpx; background: #fff9f5; border: 1rpx solid #fadbc9; border-radius: 14rpx; padding: 16rpx 18rpx; }
.sug-main { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.sug-title { font-size: 22rpx; font-weight: 800; color: #b84214; }
.sug-detail { font-size: 19rpx; color: #6b574d; line-height: 1.45; }
.sug-btn { flex-shrink: 0; font-size: 20rpx; font-weight: 700; color: #e05d26; background: #fff; padding: 8rpx 14rpx; border-radius: 20rpx; border: 1rpx solid #f6c2aa; }
</style>
