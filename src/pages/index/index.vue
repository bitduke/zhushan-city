<template>
  <view class="container">
    <!-- 1. 顶部手绘漫画招商横幅 -->
    <view class="banner-section" @tap="onBannerClick">
      <view class="banner-card">
        <image 
          class="banner-bg" 
          :src="bannerImg" 
          mode="aspectFill" 
        />
        <view class="banner-overlay">
          <view class="banner-tag">首页广告位招商</view>
          <view class="banner-title">
            <text class="title-line">让竹山看见</text>
            <text class="title-line">你的好生意</text>
          </view>
          <text class="banner-sub">首页首屏大图 · 开放合作</text>
          <view class="banner-btn">
            <text class="btn-text">了解详情</text>
            <text class="btn-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 2. 标语与乡镇定位胶囊 -->
    <view class="subbar-section">
      <text class="slogan-text">竹山生态，刚好竹山达</text>
      <picker :range="townNames" :value="selectedTownIndex" @change="onTownChange">
        <view class="town-capsule">
          <text class="location-pin">📍</text>
          <text class="town-name">{{ currentTown }}</text>
          <text class="dropdown-arrow">▾</text>
        </view>
      </picker>
    </view>

    <!-- 3. 清爽国风搜索栏 -->
    <view class="search-section">
      <view class="search-box">
        <image class="search-ico" :src="searchIcon" mode="aspectFit" />
        <input 
          class="search-input" 
          placeholder="搜租房、二手、享商超好客" 
          placeholder-class="search-ph"
          v-model="searchKeyword" 
          @confirm="onSearch"
        />
        <text class="search-btn" @tap="onSearch">搜索</text>
      </view>
    </view>

    <!-- 3.5 动态千人千面角色驾驶舱 -->
    <!-- A. 管理员工作巡检条 -->
    <view class="cockpit-card admin-cockpit" v-if="isAdmin" @tap="goToAdmin">
      <view class="cockpit-row">
        <view class="cockpit-left">
          <text class="cockpit-badge admin">运营巡检</text>
          <text class="cockpit-title">前往审核入驻商家、便民动态与跨店合作</text>
        </view>
        <text class="cockpit-arrow">进入管理台 ›</text>
      </view>
    </view>

    <!-- B. 商家店主 / 店员经营诊断驾驶舱 -->
    <view class="cockpit-card merchant-cockpit" v-if="activeMerchant">
      <view class="mc-top" @tap="goToMerchantDesk">
        <view class="mc-name-wrap">
          <text class="cockpit-badge shop">商家驾驶舱</text>
          <text class="mc-shop-name">{{ activeMerchant.name }}</text>
        </view>
        <text class="mc-link">完整诊断 ›</text>
      </view>

      <view class="mc-metrics" v-if="merchantDiagnostics">
        <view class="mc-metric">
          <text class="mc-val">{{ merchantDiagnostics.metrics.scans }}</text>
          <text class="mc-lbl">扫码人数</text>
        </view>
        <view class="mc-metric">
          <text class="mc-val green">{{ merchantDiagnostics.metrics.acquireRate }}%</text>
          <text class="mc-lbl">扫码获客率</text>
        </view>
        <view class="mc-metric">
          <text class="mc-val orange">{{ merchantDiagnostics.metrics.verifyRate }}%</text>
          <text class="mc-lbl">核销转化率</text>
        </view>
      </view>

      <view class="mc-tip" v-if="merchantDiagnostics && merchantDiagnostics.suggestions.length > 0" @tap="goSuggestion(merchantDiagnostics.suggestions[0].targetPage)">
        <text class="mc-tip-txt">💡 {{ merchantDiagnostics.suggestions[0].title }}</text>
        <text class="mc-tip-go">{{ merchantDiagnostics.suggestions[0].actionLabel }} ›</text>
      </view>

      <view class="mc-actions">
        <view class="mc-act-btn primary" @tap="goToVerify">📷 扫码核销</view>
        <view class="mc-act-btn" @tap="goToCoupons">✨ 参谋建券</view>
        <view class="mc-act-btn" @tap="goToAppointment" v-if="merchantDiagnostics && merchantDiagnostics.pendingAppointmentsCount > 0">
          ⏰ 预约({{ merchantDiagnostics.pendingAppointmentsCount }})
        </view>
        <view class="mc-act-btn" @tap="goToCooperation" v-else>🤝 跨店合作</view>
      </view>
    </view>

    <!-- C. 普通居民省钱小账本 & 到期倒计时（有领券或已省过钱时才显示，绝不显示刺眼 0） -->
    <view class="cockpit-card resident-cockpit" v-if="showResidentSavings">
      <view class="rc-top" @tap="goToWallet">
        <view class="rc-saved">
          <text class="rc-label">💰 街坊惠已为您省钱</text>
          <view class="rc-amount">
            <text class="rc-yen">¥</text>
            <text class="rc-num">{{ couponSummary.totalSavedYuan }}</text>
            <text class="rc-sub">（已核销 {{ couponSummary.usedCount }} 笔）</text>
          </view>
        </view>
        <view class="rc-wallet-pill">
          <text class="rc-unused-num">{{ couponSummary.unusedCount }}</text>
          <text class="rc-unused-txt">张待用 ›</text>
        </view>
      </view>

      <view class="rc-countdown-bar" v-if="couponSummary.nearestExpiring" @tap="goToCouponCode(couponSummary.nearestExpiring.code)">
        <text class="rc-cd-txt">⏳「{{ couponSummary.nearestExpiring.rule_snapshot.title }}」仅剩 {{ formatCountdown(couponSummary.nearestExpiring.expires_at, nowTick) }}</text>
        <text class="rc-cd-go">去亮码 ›</text>
      </view>
    </view>

    <!-- 3.8 按行业找竹山好店优惠（精简横向胶囊条，不显臃肿） -->
    <view class="industry-bar-section">
      <view class="ind-head">
        <text class="ind-title">🏷️ 优惠按行业找好店</text>
        <text class="ind-count" @tap="goToShops('all')">{{ featuredShopCount > 0 ? `共 ${featuredShopCount} 家入驻好店 ›` : '浏览商家目录 ›' }}</text>
      </view>
      <scroll-view class="ind-scroll" scroll-x show-scrollbar="false">
        <view class="ind-row">
          <view
            v-for="ind in industryShortcuts"
            :key="ind.id"
            class="ind-pill"
            @tap="goToShops(ind.id)"
          >
            <text class="ind-emoji">{{ ind.emoji }}</text>
            <text class="ind-name">{{ ind.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 4. 便民分类金刚区卡片【你想找什么】 -->
    <view class="card-wrap category-card">
      <view class="card-head">
        <view class="head-left">
          <text class="en-sub">EXPLORE ZHUSHAN</text>
          <text class="main-title">你想找什么</text>
        </view>
        <text class="head-right-tip">移步同城寻好物</text>
      </view>

      <view class="category-grid">
        <view 
          class="grid-item" 
          v-for="cat in categories" 
          :key="cat.id"
          @tap="onCategoryClick(cat.id)"
          hover-class="item-hover"
          :hover-stay-time="100"
        >
          <view class="cat-icon-circle" :style="{ backgroundColor: cat.bg }">
            <image 
              v-if="cat.iconPath" 
              class="cat-img" 
              :src="cat.iconPath" 
              mode="aspectFit" 
            />
            <text v-else class="cat-badge-txt" :style="{ color: cat.textColor }">{{ cat.shortText }}</text>
          </view>
          <text class="cat-label">{{ cat.name }}</text>
        </view>
      </view>
    </view>

    <!-- 5. 双色高对比行动大卡片 -->
    <view class="action-cards-section">
      <!-- 商圈联盟卡片 -->
      <view 
        class="action-card alliance-card" 
        @tap="goToAlliance"
        hover-class="card-hover"
        :hover-stay-time="100"
      >
        <view class="action-content">
          <text class="action-title">商圈联盟</text>
          <text class="action-desc">凭券到店享福利</text>
        </view>
        <image class="action-bg-icon" :src="ticketIcon" mode="aspectFit" />
      </view>

      <!-- 发布信息卡片 -->
      <view 
        class="action-card publish-card" 
        @tap="goToPublish"
        hover-class="card-hover"
        :hover-stay-time="100"
      >
        <view class="action-content">
          <text class="action-title">发布信息</text>
          <text class="action-desc">租房 · 买卖 · 求助</text>
        </view>
        <image class="action-bg-icon" :src="plusIcon" mode="aspectFit" />
      </view>
    </view>

    <!-- 6. 身边的新消息流 -->
    <view class="card-wrap feed-section">
      <view class="card-head">
        <view class="head-left">
          <text class="en-sub">NEIGHBORHOOD</text>
          <text class="main-title">身边的新消息</text>
        </view>
        <view class="more-link" @tap="goToInfoList">
          <text>更多信息</text>
          <text class="link-arrow">›</text>
        </view>
      </view>

      <!-- 信息流内容 -->
      <view class="feed-content" v-if="infoList.length > 0">
        <InfoCard 
          v-for="item in infoList" 
          :key="item._id" 
          :info="item" 
          @click="goToInfoDetail(item._id)" 
        />
      </view>

      <!-- 雅致国风空状态 -->
      <view class="empty-state" v-else>
        <view class="empty-icon-box">🏡</view>
        <text class="empty-title">{{ currentTown }}暂无审核便民信息</text>
        <text class="empty-subtitle">本镇街坊动态正在收录中，首发便民信息直享置顶关注</text>
        <view class="empty-action-btn" @tap="goToPublish">
          <text>＋ 免费发布第一条</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onHide, onUnload, onPullDownRefresh, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { ZHUSHAN_TOWNS } from '@/constants/regions';
import { getHomeData } from '@/api/home';
import { getMyCoupons, summarizeMyCoupons, formatCountdown } from '@/api/coupon';
import { getMyMerchants } from '@/api/merchant';
import { getMerchantDiagnostics } from '@/api/ranking';
import { USE_MOCK } from '@/api/adapter';
import { hasServiceConsent } from '@/utils/consent';
import { useUserStore } from '@/store/user';
import { useMerchantStore } from '@/store/merchant';
import type { UserCoupon } from '@/types/coupon';
import type { Merchant } from '@/types/merchant';
import type { MerchantDiagnostics } from '@/types/stat';
import InfoCard from '@/components/InfoCard.vue';

// 静态图片路径常量（避免 vite vue 插件将其转为缺失的 common/assets.js）
const bannerImg = '/static/banners/zhushan-market-comic-v1.jpg';
const searchIcon = '/static/icons/search.png';
const ticketIcon = '/static/icons/tab-ticket.png';
const plusIcon = '/static/icons/plus.png';

const userStore = useUserStore();
const merchantStore = useMerchantStore();
const currentTown = computed(() => userStore.selectedTown);
const townNames = ['全竹山', ...ZHUSHAN_TOWNS.map(t => t.name)];
const selectedTownIndex = computed(() => {
  const idx = townNames.indexOf(currentTown.value);
  return idx >= 0 ? idx : 1; // 默认城关镇
});

const searchKeyword = ref('');
const infoList = ref<any[]>([]);
const featuredShopCount = ref(0);
const myCoupons = ref<UserCoupon[]>([]);
const activeMerchant = ref<Merchant | null>(null);
const merchantDiagnostics = ref<MerchantDiagnostics | null>(null);
const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

const isAdmin = computed(() => userStore.profile?.role === 'ADMIN' || userStore.isDemoAdmin);
const couponSummary = computed(() => summarizeMyCoupons(myCoupons.value, nowTick.value));
const showResidentSavings = computed(() => couponSummary.value.unusedCount > 0 || couponSummary.value.usedCount > 0);

// 行业优惠快筛
const industryShortcuts = [
  { id: 'catering', name: '特色美食', emoji: '🍜' },
  { id: 'beauty', name: '美容美甲', emoji: '💅' },
  { id: 'foot_bath', name: '足道养生', emoji: '💆' },
  { id: 'apparel', name: '服装女装', emoji: '👗' },
  { id: 'car_care', name: '汽车美容', emoji: '🚗' },
  { id: 'parenting', name: '亲子游乐', emoji: '👶' }
];

// 分类与专属图标配置（与原图 100% 精确匹配）
const categories = [
  { id: 'house', name: '房屋租售', iconPath: '/static/icons/house.png', bg: '#EBF5FF', shortText: '' },
  { id: 'idle', name: '二手闲置', iconPath: '/static/icons/box.png', bg: '#FEF3C7', shortText: '' },
  { id: 'housekeeping', name: '家政保洁', iconPath: '/static/icons/broom.png', bg: '#FEE2E2', shortText: '' },
  { id: 'carpool', name: '拼车互助', iconPath: '/static/icons/car.png', bg: '#E0F2FE', shortText: '' },
  { id: 'transfer', name: '转让/合作', iconPath: '', bg: '#FEF9C3', shortText: '转', textColor: '#B45309' },
  { id: 'other', name: '其他便民', iconPath: '', bg: '#F3E8FF', shortText: '自', textColor: '#7E22CE' }
];

const loadRoleCockpit = async () => {
  if (!hasServiceConsent()) return;
  try {
    const couponsTask = getMyCoupons().catch(() => [] as UserCoupon[]);
    const merchantsTask = getMyMerchants().catch(() => [] as Merchant[]);
    const [couponsRes, merchantsRes] = await Promise.all([couponsTask, merchantsTask]);
    myCoupons.value = couponsRes;

    const approvedMerchant = merchantsRes.find(m => m.status === 'APPROVED') || null;
    activeMerchant.value = approvedMerchant;
    if (approvedMerchant && !merchantStore.currentMerchant) {
      merchantStore.setCurrentMerchant(approvedMerchant);
    }
    if (approvedMerchant) {
      merchantDiagnostics.value = await getMerchantDiagnostics(approvedMerchant._id).catch(() => null);
    } else {
      merchantDiagnostics.value = null;
    }
  } catch (err) {
    console.warn('Role cockpit load warning:', err);
  }
};

const loadData = async () => {
  try {
    const townParam = currentTown.value === '全竹山' ? '' : currentTown.value;
    const data = await getHomeData({ town: townParam });
    infoList.value = data.recent_infos || [];
    featuredShopCount.value = (data.featured_shops || []).length;
  } catch (err) {
    console.error('Failed to load home data:', err);
  }
};

const startTicker = () => {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
};

const stopTicker = () => {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
};

onShow(async () => {
  await userStore.initUser();
  nowTick.value = Date.now();
  await Promise.all([loadData(), loadRoleCockpit()]);
  startTicker();
});

onHide(stopTicker);
onUnload(stopTicker);

const onTownChange = (e: any) => {
  const idx = Number(e.detail.value);
  const town = townNames[idx];
  userStore.setTown(town);
  loadData();
};

const onSearch = () => {
  const kw = searchKeyword.value.trim();
  if (!kw) {
    uni.navigateTo({ url: '/pages/search/index' });
    return;
  }
  uni.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(kw)}` });
};

const onBannerClick = () => uni.navigateTo({ url: '/pages/business/advertise' });
const onCategoryClick = (catId: string) => uni.navigateTo({ url: `/pages/info/list?catId=${catId}` });
const goToAlliance = () => uni.navigateTo({ url: '/pages/benefit/alliance' });
const goToPublish = () => uni.navigateTo({ url: '/pages/info/publish' });
const goToInfoList = () => uni.navigateTo({ url: '/pages/info/list' });
const goToInfoDetail = (id: string) => uni.navigateTo({ url: `/pages/info/detail?id=${id}` });
const goToWallet = () => uni.switchTab({ url: '/pages/coupon/mine' });
const goToCouponCode = (code: string) => uni.navigateTo({ url: `/pages/coupon/code?code=${encodeURIComponent(code)}` });
const goToMerchantDesk = () => uni.navigateTo({ url: '/pages/merchant/index' });
const goToVerify = () => uni.navigateTo({ url: '/pages/merchant/verify' });
const goToCoupons = () => uni.navigateTo({ url: '/pages/merchant/coupons' });
const goToAppointment = () => uni.navigateTo({ url: '/pages/merchant/appointment' });
const goToCooperation = () => uni.navigateTo({ url: '/pages/merchant/cooperation' });
const goSuggestion = (url: string) => { if (url) uni.navigateTo({ url }); };
const goToAdmin = () => {
  if (USE_MOCK) userStore.enterDemoAdmin();
  uni.navigateTo({ url: '/pages/admin/index' });
};
const goToShops = (catId: string) => {
  if (catId && catId !== 'all') {
    uni.setStorageSync('zhushan_merchant_filter_cat', catId);
  }
  uni.switchTab({ url: '/pages/merchant/list' });
};

// 下拉刷新支持
onPullDownRefresh(async () => {
  await Promise.all([loadData(), loadRoleCockpit()]);
  uni.stopPullDownRefresh();
});

// 微信好友/群转发分享
onShareAppMessage(() => ({
  title: '竹山街坊惠 - 咱竹山人自己的便民生活与商圈好礼！',
  path: '/pages/index/index',
  imageUrl: bannerImg
}));

// 朋友圈分享
onShareTimeline(() => ({
  title: '竹山街坊惠 - 咱竹山人的便民生活与商圈好礼',
  query: ''
}));
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F6F8F7;
  padding: 16rpx 24rpx 80rpx;
  box-sizing: border-box;
}

/* 1. 顶部手绘漫画广告横幅 */
.banner-section {
  width: 100%;
  margin-bottom: 20rpx;
}

.banner-card {
  position: relative;
  width: 100%;
  height: 280rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 24rpx rgba(224, 155, 30, 0.18);
}

.banner-bg {
  width: 100%;
  height: 100%;
  display: block;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 2;
}

.banner-tag {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  color: #78350F;
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: 16rpx;
}

.banner-title {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.title-line {
  font-size: 38rpx;
  font-weight: 900;
  color: #1F2937;
  line-height: 1.15;
  letter-spacing: 1rpx;
}

.banner-sub {
  font-size: 20rpx;
  color: #4B5563;
  font-weight: 500;
}

.banner-btn {
  background: #111827;
  color: #FFFFFF;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.btn-text {
  font-size: 22rpx;
  font-weight: 600;
}

.btn-arrow {
  font-size: 24rpx;
  font-weight: bold;
  line-height: 1;
}

/* 2. 标语与乡镇定位 */
.subbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 4rpx;
}

.slogan-text {
  font-size: 22rpx;
  color: #6B7280;
  font-weight: 500;
}

.town-capsule {
  display: flex;
  align-items: center;
  background: #E8F5EF;
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  gap: 8rpx;
}

.location-pin {
  font-size: 22rpx;
}

.town-name {
  font-size: 22rpx;
  font-weight: 600;
  color: #17664C;
}

.dropdown-arrow {
  font-size: 18rpx;
  color: #17664C;
}

/* 3. 搜索栏 */
.search-section {
  margin-bottom: 20rpx;
}

.search-box {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 36rpx;
  padding: 12rpx 24rpx;
  border: 1.5rpx solid #E5E7EB;
  gap: 14rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.search-ico {
  width: 28rpx;
  height: 28rpx;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  font-size: 24rpx;
  color: #1F2937;
}

.search-ph {
  color: #9CA3AF;
  font-size: 24rpx;
}

.search-btn {
  font-size: 24rpx;
  font-weight: 600;
  color: #17664C;
  padding-left: 14rpx;
  border-left: 1rpx solid #E5E7EB;
}

/* 3.5 动态千人千面角色驾驶舱 */
.cockpit-card {
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 20rpx 22rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.05);
}

.cockpit-badge {
  font-size: 18rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
  color: #fff;
}
.cockpit-badge.admin { background: #b45309; }
.cockpit-badge.shop { background: #17664c; }

.admin-cockpit {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1rpx solid #fde68a;
}
.cockpit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
}
.cockpit-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}
.cockpit-title {
  font-size: 22rpx;
  font-weight: 700;
  color: #78350f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cockpit-arrow {
  font-size: 21rpx;
  font-weight: 700;
  color: #b45309;
  white-space: nowrap;
}

/* 商家驾驶舱 */
.merchant-cockpit {
  border-top: 6rpx solid #17664c;
  background: linear-gradient(180deg, #f3faf6 0%, #ffffff 42%);
}
.mc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}
.mc-name-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}
.mc-shop-name {
  font-size: 25rpx;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-link {
  font-size: 21rpx;
  font-weight: 700;
  color: #17664c;
  white-space: nowrap;
}
.mc-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin-bottom: 14rpx;
}
.mc-metric {
  background: #f8faf8;
  border-radius: 14rpx;
  padding: 12rpx 8rpx;
  text-align: center;
}
.mc-val {
  display: block;
  font-size: 30rpx;
  font-weight: 900;
  color: #111827;
}
.mc-val.green { color: #17664c; }
.mc-val.orange { color: #e05d26; }
.mc-lbl {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #6b7280;
}
.mc-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff7ed;
  border: 1rpx solid #fed7aa;
  border-radius: 12rpx;
  padding: 10rpx 14rpx;
  margin-bottom: 14rpx;
}
.mc-tip-txt {
  font-size: 20rpx;
  font-weight: 700;
  color: #9a3412;
}
.mc-tip-go {
  font-size: 20rpx;
  font-weight: 700;
  color: #e05d26;
}
.mc-actions {
  display: flex;
  gap: 12rpx;
}
.mc-act-btn {
  flex: 1;
  height: 58rpx;
  line-height: 58rpx;
  text-align: center;
  border-radius: 14rpx;
  background: #eef6f1;
  color: #17664c;
  font-size: 21rpx;
  font-weight: 700;
}
.mc-act-btn.primary {
  background: #17664c;
  color: #fff;
}

/* 居民省钱账本驾驶舱 */
.resident-cockpit {
  background: linear-gradient(135deg, #fffaf0 0%, #ffffff 100%);
  border: 1.5rpx solid #fde6c4;
}
.rc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rc-label {
  font-size: 20rpx;
  font-weight: 700;
  color: #92400e;
}
.rc-amount {
  display: flex;
  align-items: baseline;
  margin-top: 4rpx;
}
.rc-yen {
  font-size: 24rpx;
  font-weight: 800;
  color: #e05d26;
}
.rc-num {
  font-size: 40rpx;
  font-weight: 900;
  color: #e05d26;
  margin: 0 6rpx 0 2rpx;
  line-height: 1;
}
.rc-sub {
  font-size: 19rpx;
  color: #78716c;
}
.rc-wallet-pill {
  background: #17664c;
  color: #fff;
  padding: 10rpx 20rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.rc-unused-num {
  font-size: 26rpx;
  font-weight: 900;
}
.rc-unused-txt {
  font-size: 20rpx;
}
.rc-countdown-bar {
  margin-top: 14rpx;
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  background: #fff1eb;
  border: 1rpx solid #fcd5c4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10rpx;
}
.rc-cd-txt {
  font-size: 20rpx;
  font-weight: 700;
  color: #c74714;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rc-cd-go {
  font-size: 20rpx;
  font-weight: 800;
  color: #e05d26;
  white-space: nowrap;
}

/* 3.8 行业找好店横向胶囊条 */
.industry-bar-section {
  margin-bottom: 20rpx;
}
.ind-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 0 4rpx;
}
.ind-title {
  font-size: 23rpx;
  font-weight: 800;
  color: #1f2937;
}
.ind-count {
  font-size: 20rpx;
  font-weight: 600;
  color: #17664c;
}
.ind-scroll {
  width: 100%;
  white-space: nowrap;
}
.ind-row {
  display: inline-flex;
  gap: 12rpx;
  padding-bottom: 4rpx;
}
.ind-pill {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 18rpx;
  background: #ffffff;
  border: 1rpx solid #e5ebe7;
  border-radius: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.03);
}
.ind-emoji {
  font-size: 24rpx;
}
.ind-name {
  font-size: 21rpx;
  font-weight: 600;
  color: #374151;
}

/* 卡片统一白色圆角容器 */
.card-wrap {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24rpx;
}

.head-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.en-sub {
  font-size: 18rpx;
  font-weight: 700;
  color: #9CA3AF;
  letter-spacing: 2rpx;
}

.main-title {
  font-size: 32rpx;
  font-weight: 900;
  color: #111827;
}

.head-right-tip {
  font-size: 22rpx;
  color: #9CA3AF;
}

/* 4. 分类金刚区九宫格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28rpx 16rpx;
  padding: 10rpx 0;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.15s ease;
}

.item-hover {
  transform: scale(0.96);
  opacity: 0.9;
}

.cat-icon-circle {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.cat-img {
  width: 52rpx;
  height: 52rpx;
}

.cat-badge-txt {
  font-size: 38rpx;
  font-weight: 900;
}

.cat-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #374151;
}

/* 5. 双色高对比行动大卡片 */
.action-cards-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.action-card {
  position: relative;
  height: 140rpx;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease;
}

.card-hover {
  transform: scale(0.98);
}

.alliance-card {
  background: linear-gradient(135deg, #125741, #1E795B);
}

.publish-card {
  background: linear-gradient(135deg, #E85042, #F2675A);
}

.action-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.action-title {
  font-size: 32rpx;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 1rpx;
}

.action-desc {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.action-bg-icon {
  position: absolute;
  right: 16rpx;
  bottom: 12rpx;
  width: 52rpx;
  height: 52rpx;
  opacity: 0.25;
  filter: brightness(200%);
}

/* 6. 身边的新消息 */
.more-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #17664C;
}

.link-arrow {
  font-size: 24rpx;
  line-height: 1;
}

.feed-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 雅致空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 24rpx;
}

.empty-icon-box {
  width: 90rpx;
  height: 90rpx;
  border-radius: 45rpx;
  background: #E8F5EF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: 20rpx;
}

.empty-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.empty-subtitle {
  font-size: 22rpx;
  color: #9CA3AF;
  text-align: center;
  margin-bottom: 28rpx;
  line-height: 1.4;
}

.empty-action-btn {
  background: #FFFFFF;
  border: 2rpx solid #17664C;
  color: #17664C;
  font-size: 24rpx;
  font-weight: 600;
  padding: 12rpx 36rpx;
  border-radius: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(23, 102, 76, 0.08);
}
</style>
