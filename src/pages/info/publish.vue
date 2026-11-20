<template>
  <view class="publish-page">
    <view class="compliance-notice">
      <text class="notice-icon">⚠️</text>
      <text class="notice-text">为防范电信诈骗与虚假宣传，发布内容需经人工审核通过后公开。请确保信息真实，严禁发布涉黄涉赌与灰产内容。</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">信息类别</text>
        <picker :range="categoryNames" :value="catIndex" @change="onCatChange">
          <view class="picker-val">
            {{ selectedCatName }} <text class="arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">所在乡镇</text>
        <picker :range="townNames" :value="townIndex" @change="onTownChange">
          <view class="picker-val">
            {{ selectedTownName }} <text class="arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">信息标题</text>
        <input 
          class="form-input" 
          placeholder="简明扼要，如：城关二居室整租 (30字内)" 
          v-model="formData.title" 
        />
      </view>

      <view class="form-item">
        <text class="form-label">期望价格</text>
        <input 
          class="form-input" 
          placeholder="如：900元/月 或 面议" 
          v-model="formData.price_desc" 
        />
      </view>

      <view class="form-item-vertical">
        <text class="form-label">详细描述</text>
        <textarea 
          class="form-textarea" 
          placeholder="请详细描述房源户型、物品成色、服务内容等..." 
          v-model="formData.content" 
        />
      </view>

      <view class="form-item">
        <text class="form-label">联系电话</text>
        <input 
          class="form-input" 
          type="number" 
          placeholder="用于意向人联系您" 
          v-model="formData.contact_phone" 
        />
      </view>

      <view class="consent-row">
        <checkbox :checked="formData.contact_consent" @tap="formData.contact_consent = !formData.contact_consent" />
        <text class="consent-text">我已知悉并明确同意将上述联系电话在详情页公开，供本地居民电话联系。</text>
      </view>
    </view>

    <button class="submit-btn" @tap="handleSubmit">提交发布 (进入审核队列)</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { INFO_CATEGORIES } from '@/constants/enums';
import { ZHUSHAN_TOWNS } from '@/constants/regions';
import { publishInfo } from '@/api/info';

const categories = INFO_CATEGORIES;
const categoryNames = categories.map(c => c.name);
const catIndex = ref(0);
const selectedCatName = computed(() => categoryNames[catIndex.value]);

const towns = ZHUSHAN_TOWNS.filter(t => t.id !== 'all');
const townNames = towns.map(t => t.name);
const townIndex = ref(0);
const selectedTownName = computed(() => townNames[townIndex.value]);

const formData = ref({
  category_id: categories[0].id,
  category_name: categories[0].name,
  town: towns[0].name,
  title: '',
  price_desc: '',
  content: '',
  contact_phone: '',
  contact_consent: true
});

const onCatChange = (e: any) => {
  catIndex.value = e.detail.value;
  formData.value.category_id = categories[catIndex.value].id;
  formData.value.category_name = categories[catIndex.value].name;
};

const onTownChange = (e: any) => {
  townIndex.value = e.detail.value;
  formData.value.town = towns[townIndex.value].name;
};

const handleSubmit = async () => {
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '请输入信息标题', icon: 'none' });
    return;
  }
  if (!formData.value.contact_phone.trim()) {
    uni.showToast({ title: '请输入联系电话', icon: 'none' });
    return;
  }
  if (!formData.value.contact_consent) {
    uni.showToast({ title: '请勾选电话公开同意条款', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '提交中...' });
  try {
    const res = await publishInfo(formData.value);
    uni.hideLoading();
    uni.showModal({
      title: '提交成功',
      content: res.message,
      showCancel: false,
      success: () => {
        uni.navigateBack();
      }
    });
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: '提交失败，请重试', icon: 'none' });
  }
};
</script>

<style scoped>
.publish-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
  padding-bottom: 80rpx;
}

.compliance-notice {
  background: #FEF3C7;
  padding: 18rpx 24rpx;
  border-radius: 12rpx;
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.notice-icon {
  font-size: 28rpx;
}

.notice-text {
  font-size: 20rpx;
  color: #B45309;
  line-height: 1.4;
}

.form-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 30rpx;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F3F4F6;
}

.form-item-vertical {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F3F4F6;
}

.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #1F2937;
  width: 160rpx;
}

.picker-val {
  font-size: 26rpx;
  color: #2563EB;
  font-weight: 500;
}

.arrow {
  font-size: 18rpx;
  color: #9CA3AF;
  margin-left: 6rpx;
}

.form-input {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  background: #F9FAFB;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 24rpx;
  margin-top: 12rpx;
  box-sizing: border-box;
}

.consent-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding-top: 24rpx;
}

.consent-text {
  font-size: 20rpx;
  color: #6B7280;
  line-height: 1.4;
}

.submit-btn {
  background: #2563EB;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  border: none;
}
</style>
