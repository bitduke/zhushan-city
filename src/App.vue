<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { parseScene } from '@/utils/scene';
import { reportScanLog } from '@/api/shop';
import { useUserStore } from '@/store/user';

onLaunch((options) => {
  console.log('App Launch:', options);

  // 初始化用户状态
  const userStore = useUserStore();
  userStore.initUser();

  // 微信扫码解析 scene (短 token 模式)
  if (options?.query?.scene) {
    const params = parseScene(options.query.scene);
    console.log('Parsed Scene Params:', params);
    // 例如 scene 为 "s=shop_001" 或短 token "t=tk_01"
    const shopId = params.s || params.shopId || 'shop_001';
    const token = params.t || options.query.scene;

    // 上报扫码归因
    reportScanLog(token, shopId);

    // 跳转到 A 门店福利页
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/benefit/shop?shopId=${shopId}&scene=${token}`
      });
    }, 100);
  }
});

onShow(() => {
  console.log('App Show');
});
</script>

<style>
/* 全局基础样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #F4F5F7;
  color: #1F2937;
  box-sizing: border-box;
}

view, text, button, input, textarea {
  box-sizing: border-box;
}

button::after {
  border: none;
}
</style>
