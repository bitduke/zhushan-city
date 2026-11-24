export type HomeBanner = {
  id: string;
  image?: string;
  label: string;
  title: string;
  subtitle: string;
  cta: string;
  action: 'merchantList' | 'merchantDetail' | 'infoList' | 'publishInfo' | 'advertise';
  merchantId?: string;
  isPaid?: boolean;
};

// 平台自有招商位；将来接入商家投放时，付费内容须将 isPaid 设为 true。
export const HOME_BANNERS: HomeBanner[] = [
  {
    id: 'ad-recruitment',
    image: '/static/banners/zhushan-market-comic-v1.jpg',
    label: '首页广告位招商',
    title: '让竹山看见\n你的好生意',
    subtitle: '首页首屏大图，开放合作',
    cta: '了解招商',
    action: 'advertise',
    isPaid: false
  }
];
