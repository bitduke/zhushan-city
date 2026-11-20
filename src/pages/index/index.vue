<template>
  <view class="container">
    <!-- 顶部定位与搜索栏 -->
    <view class="top-bar">
      <picker :range="townNames" :value="selectedTownIndex" @change="onTownChange">
        <view class="town-picker">
          <text class="location-icon">📍</text>
          <text class="town-name">{{ currentTown }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>

      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          placeholder="搜索竹山租房、二手、商家福利..." 
          v-model="searchKeyword" 
          @confirm="onSearch"
        />
      </view>
    </view>

    <!-- 分类金刚区九宫格 -->
    <view class="category-grid">
      <view 
        class="grid-item" 
        v-for="cat in categories" 
        :key="cat.id"
        @tap="onCategoryClick(cat.id)"
      >
        <view class="icon-circle">
          <text class="grid-icon">{{ getCategoryIcon(cat.id) }}</text>
        </view>
        <text class="grid-label">{{ cat.name }}</text>
      </view>
    </view>

    <!-- 联盟商家推荐位 (横滑卡片) -->
    <view class="section-container" v-if="featuredShops.length > 0">
      <view class="section-header">
        <view class="title-wrap">
          <text class="section-title">商圈联盟好店</text>
          <text class="section-sub">进店扫码享专属礼遇</text>
        </view>
      </view>

      <scroll-view class="shops-scroll" scroll-x show-scrollbar="false">
        <view class="shops-wrap">
          <view 
            class="featured-shop-card" 
            v-for="shop in featuredShops" 
            :key="shop.id"
            @tap="goToShopBenefit(shop.id)"
          >
            <image class="shop-thumb" :src="shop.avatar" mode="aspectFill" />
            <view class="shop-info">
              <text class="shop-name">{{ shop.name }}</text>
              <text class="shop-hot">{{ shop.hot_coupon }}</text>
              <view class="shop-bottom">
                <text class="distance">{{ shop.distance }}</text>
                <text class="go-btn">进店领券</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 最新便民信息流 -->
    <view class="section-container">
      <view class="section-header">
        <text class="section-title">最新便民信息</text>
        <view class="category-tabs">
          <text 
            class="tab-item" 
            :class="{ active: currentTab === 'all' }" 
            @tap="switchTab('all')"
          >全部</text>
          <text 
            class="tab-item" 
            :class="{ active: currentTab === 'house' }" 
            @tap="switchTab('house')"
          >租房</text>
          <text 
            class="tab-item" 
            :class="{ active: currentTab === 'idle' }" 
            @tap="switchTab('idle')"
          >二手</text>
          <text 
            class="tab-item" 
            :class="{ active: currentTab === 'turquoise' }" 
            @tap="switchTab('turquoise')"
          >绿松石</text>
        </view>
      </view>

      <view class="info-list">
        <InfoCard 
          v-for="item in filteredInfos" 
          :key="item._id" 
          :info="item" 
          @click="goToInfoDetail(item._id)" 
        />
      </view>
    </view>

    <!-- 悬浮快速发布按钮 -->
    <view class="fab-btn" @tap="goToPublish">
      <text class="fab-icon">＋</text>
      <text class="fab-text">发布便民</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ZHUSHAN_TOWNS } from '@/constants/regions';
import { INFO_CATEGORIES } from '@/constants/enums';
import { getHomeData } from '@/api/home';
import { useUserStore } from '@/store/user';
import InfoCard from '@/components/InfoCard.vue';

const userStore = useUserStore();
const currentTown = computed(() => userStore.selectedTown);
const townNames = ZHUSHAN_TOWNS.map(t => t.name);
const selectedTownIndex = computed(() => {
  const idx = townNames.indexOf(currentTown.value);
  return idx >= 0 ? idx : 0;
});

const searchKeyword = ref('');
const categories = INFO_CATEGORIES;
const featuredShops = ref<any[]>([]);
const infoList = ref<any[]>([]);
const currentTab = ref('all');

onMounted(async () => {
  userStore.initUser();
  await loadData();
});

const loadData = async () => {
  try {
    const data = await getHomeData({ town: currentTown.value });
    featuredShops.value = data.featured_shops || [];
    infoList.value = data.recent_infos || [];
  } catch (err) {
    console.error('Failed to load home data:', err);
  }
};

const onTownChange = (e: any) => {
  const idx = e.detail.value;
  const town = townNames[idx];
  userStore.setTown(town);
  loadData();
};

const getCategoryIcon = (id: string) => {
  const map: Record<string, string> = {
    house: '🏠',
    idle: '📦',
    housekeeping: '🧹',
    carpool: '🚗',
    turquoise: '💎',
    other: '📋'
  };
  return map[id] || '📌';
};

const switchTab = (tab: string) => {
  currentTab.value = tab;
};

const filteredInfos = computed(() => {
  if (currentTab.value === 'all') return infoList.value;
  return infoList.value.filter(item => {
    if (currentTab.value === 'house') return item.category_name === '房屋租售';
    if (currentTab.value === 'idle') return item.category_name === '二手闲置';
    if (currentTab.value === 'turquoise') return item.category_name === '绿松石名片';
    return true;
  });
});

const onSearch = () => {
  if (!searchKeyword.value.trim()) return;
  uni.showToast({ title: `搜: ${searchKeyword.value}`, icon: 'none' });
};

const onCategoryClick = (catId: string) => {
  uni.navigateTo({ url: `/pages/info/list?catId=${catId}` });
};

const goToShopBenefit = (shopId: string) => {
  uni.navigateTo({ url: `/pages/benefit/shop?shopId=${shopId}` });
};

const goToInfoDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/info/detail?id=${id}` });
};

const goToPublish = () => {
  uni.navigateTo({ url: '/pages/info/publish' });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding-bottom: 120rpx;
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #ffffff;
  gap: 16rpx;
  border-bottom: 1rpx solid #E5E7EB;
}

.town-picker {
  display: flex;
  align-items: center;
  background: #F3F4F6;
  padding: 12rpx 18rpx;
  border-radius: 30rpx;
  gap: 6rpx;
}

.location-icon {
  font-size: 24rpx;
}

.town-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #1F2937;
}

.arrow {
  font-size: 16rpx;
  color: #9CA3AF;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F3F4F6;
  padding: 10rpx 20rpx;
  border-radius: 30rpx;
  gap: 12rpx;
}

.search-icon {
  font-size: 24rpx;
}

.search-input {
  font-size: 24rpx;
  width: 100%;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  background: #ffffff;
  padding: 28rpx 10rpx;
  margin-bottom: 20rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: #EFF6FF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
}

.grid-icon {
  font-size: 36rpx;
}

.grid-label {
  font-size: 20rpx;
  color: #4B5563;
  font-weight: 500;
}

.section-container {
  padding: 0 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16rpx;
}

.title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #111827;
}

.section-sub {
  font-size: 20rpx;
  color: #9CA3AF;
}

.category-tabs {
  display: flex;
  gap: 16rpx;
}

.tab-item {
  font-size: 24rpx;
  color: #6B7280;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.tab-item.active {
  color: #2563EB;
  background: #EFF6FF;
  font-weight: 600;
}

.shops-scroll {
  width: 100%;
}

.shops-wrap {
  display: flex;
  gap: 20rpx;
  padding-bottom: 10rpx;
}

.featured-shop-card {
  width: 320rpx;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.05);
}

.shop-thumb {
  width: 100%;
  height: 180rpx;
  background: #E5E7EB;
}

.shop-info {
  padding: 16rpx;
}

.shop-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #1F2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.shop-hot {
  font-size: 20rpx;
  color: #DC2626;
  margin-top: 6rpx;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14rpx;
}

.distance {
  font-size: 20rpx;
  color: #9CA3AF;
}

.go-btn {
  font-size: 20rpx;
  background: #2563EB;
  color: #ffffff;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  font-weight: 500;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 140rpx;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: #ffffff;
  padding: 16rpx 28rpx;
  border-radius: 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(37, 99, 235, 0.35);
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.fab-icon {
  font-size: 32rpx;
  font-weight: bold;
}

.fab-text {
  font-size: 26rpx;
  font-weight: 600;
}
</style>
