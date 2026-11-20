<template>
  <view class="list-page">
    <view class="filter-header">
      <view class="active-category">{{ currentCatName }}</view>
      <text class="filter-tip">共有 {{ infoList.length }} 条当下有效信息</text>
    </view>

    <view class="content-list">
      <InfoCard 
        v-for="item in infoList" 
        :key="item._id" 
        :info="item" 
        @click="goToDetail(item._id)" 
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getInfoList } from '@/api/info';
import { INFO_CATEGORIES } from '@/constants/enums';
import InfoCard from '@/components/InfoCard.vue';

const currentCatName = ref('便民信息');
const infoList = ref<any[]>([]);

onLoad(async (options) => {
  const catId = options?.catId || 'all';
  const cat = INFO_CATEGORIES.find(c => c.id === catId);
  if (cat) {
    currentCatName.value = cat.name;
    uni.setNavigationBarTitle({ title: cat.name });
  }
  const res = await getInfoList({ categoryId: catId });
  infoList.value = res.list || [];
});

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/info/detail?id=${id}` });
};
</script>

<style scoped>
.list-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.active-category {
  font-size: 32rpx;
  font-weight: bold;
  color: #111827;
}

.filter-tip {
  font-size: 22rpx;
  color: #9CA3AF;
}

.content-list {
  display: flex;
  flex-direction: column;
}
</style>
