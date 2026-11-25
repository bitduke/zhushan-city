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
import { ref, computed, onMounted } from 'vue';
import { onPullDownRefresh, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { ZHUSHAN_TOWNS } from '@/constants/regions';
import { getHomeData } from '@/api/home';
import { useUserStore } from '@/store/user';
import InfoCard from '@/components/InfoCard.vue';

// 静态图片路径常量（避免 vite vue 插件将其转为缺失的 common/assets.js）
const bannerImg = '/static/banners/zhushan-market-comic-v1.jpg';
const searchIcon = '/static/icons/search.png';
const ticketIcon = '/static/icons/tab-ticket.png';
const plusIcon = '/static/icons/plus.png';

const userStore = useUserStore();
const currentTown = computed(() => userStore.selectedTown);
const townNames = ['全竹山', ...ZHUSHAN_TOWNS.map(t => t.name)];
const selectedTownIndex = computed(() => {
  const idx = townNames.indexOf(currentTown.value);
  return idx >= 0 ? idx : 1; // 默认城关镇
});

const searchKeyword = ref('');
const infoList = ref<any[]>([]);

// 分类与专属图标配置（与原图 100% 精确匹配）
const categories = [
  { id: 'house', name: '房屋租售', iconPath: '/static/icons/house.png', bg: '#EBF5FF', shortText: '' },
  { id: 'idle', name: '二手闲置', iconPath: '/static/icons/box.png', bg: '#FEF3C7', shortText: '' },
  { id: 'housekeeping', name: '家政保洁', iconPath: '/static/icons/broom.png', bg: '#FEE2E2', shortText: '' },
  { id: 'carpool', name: '拼车互助', iconPath: '/static/icons/car.png', bg: '#E0F2FE', shortText: '' },
  { id: 'transfer', name: '转让/合作', iconPath: '', bg: '#FEF9C3', shortText: '转', textColor: '#B45309' },
  { id: 'other', name: '其他便民', iconPath: '', bg: '#F3E8FF', shortText: '自', textColor: '#7E22CE' }
];

onMounted(async () => {
  userStore.initUser();
  await loadData();
});

const loadData = async () => {
  try {
    const townParam = currentTown.value === '全竹山' ? '' : currentTown.value;
    const data = await getHomeData({ town: townParam });
    infoList.value = data.recent_infos || [];
  } catch (err) {
    console.error('Failed to load home data:', err);
  }
};

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

const onBannerClick = () => {
  uni.navigateTo({ url: '/pages/business/advertise' });
};

const onCategoryClick = (catId: string) => {
  uni.navigateTo({ url: `/pages/info/list?catId=${catId}` });
};

const goToAlliance = () => {
  uni.navigateTo({ url: '/pages/benefit/alliance' });
};

const goToPublish = () => {
  uni.navigateTo({ url: '/pages/info/publish' });
};

const goToInfoList = () => {
  uni.navigateTo({ url: '/pages/info/list' });
};

const goToInfoDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/info/detail?id=${id}` });
};

// 下拉刷新支持
onPullDownRefresh(async () => {
  await loadData();
  uni.stopPullDownRefresh();
});

// 微信好友/群转发分享
onShareAppMessage(() => ({
  title: '竹山街坊汇 - 咱竹山人自己的便民生活与商圈好礼！',
  path: '/pages/index/index',
  imageUrl: bannerImg
}));

// 朋友圈分享
onShareTimeline(() => ({
  title: '竹山街坊汇 - 咱竹山人的便民生活与商圈好礼',
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
  margin-bottom: 24rpx;
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
