<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { parseScene } from '@/utils/scene';
import { resolveScanToken } from '@/api/shop';
import { useUserStore } from '@/store/user';
import { hasServiceConsent, rememberLaunch } from '@/utils/consent';

let ready: Promise<void> = Promise.resolve();
let lastScene = '';
let lastSceneAt = 0;

const handleScene = async (options: any) => {
  if (!hasServiceConsent()) return;
  const scene = options?.query?.scene;
  if (!scene) return;
  const now = Date.now();
  if (scene === lastScene && now - lastSceneAt < 5 * 60000) return;
  lastScene = scene;
  lastSceneAt = now;
  await ready;
  const params = parseScene(scene);
  const token = params.t || scene;
  try {
    const { merchantId } = await resolveScanToken(token);
    setTimeout(() => {
      uni.navigateTo({ url: `/pages/benefit/shop?shopId=${merchantId}&scene=${encodeURIComponent(token)}` });
    }, 100);
  } catch (error) {
    const message = error instanceof Error ? error.message : '门店码无效';
    setTimeout(() => {
      uni.navigateTo({ url: `/pages/benefit/invalid?reason=${encodeURIComponent(message)}` });
    }, 100);
  }
};

onLaunch(async (options) => {
  if (!hasServiceConsent()) {
    rememberLaunch(options);
    if (options?.query?.scene) {
      lastScene = options.query.scene;
      lastSceneAt = Date.now();
    }
    if (options?.path !== 'pages/welcome/index') {
      const next = encodeURIComponent(JSON.stringify({ path: options?.path || 'pages/index/index', query: options?.query || {} }));
      setTimeout(() => uni.reLaunch({ url: '/pages/welcome/index?next=' + next }), 0);
    }
    return;
  }
  ready = useUserStore().initUser();
  await ready;
  await handleScene(options);
});

onShow(handleScene);
</script>

<style>
/* 全局基础样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #f6f7f2;
  color: #18342b;
  box-sizing: border-box;
}

view, text, button, input, textarea {
  box-sizing: border-box;
}

button::after {
  border: none;
}
</style>
