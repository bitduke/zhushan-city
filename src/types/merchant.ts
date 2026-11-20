import type { CouponTemplate } from './coupon';

export type MerchantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface Merchant {
  _id: string;
  owner_id: string;
  name: string;
  category_id: string;
  category_name: string;
  town: string;
  address: string;
  lat?: number;
  lng?: number;
  phone: string;
  avatar: string;
  images: string[];
  description: string;
  business_hours: string;
  status: MerchantStatus;
  qrcode_token?: string; // 短 token
  created_at: string;
}

export interface BenefitPlacement {
  _id: string;
  source_merchant_id: string;   // 展示入口店 (例如 A 服装店)
  target_merchant_id: string;   // 被推广店 (例如 B 美业店)
  target_coupon: CouponTemplate;// 展示的优惠券
  sort: number;                 // 排序 1~3 (限制最多3家)
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  start_date: string;
  end_date: string;
}

export interface CooperationContract {
  _id: string;
  buyer_merchant_id: string;    // 买方 (如 B 美业)
  promoter_merchant_id: string; // 推广方 (如 A 服装)
  target_coupon_id: string;
  pricing_model: 'PER_RESULT' | 'BY_SLOT'; // 按到店新客 或 按周期展位
  price_per_result: number;     // 如 20 元/新客 (含平台服务费)
  platform_fee_rate: number;    // 平台费率如 10%
  total_budget: number;         // 预算上限
  frozen_deposit: number;       // 预存托管额度 (防赖账)
  used_budget: number;
  confirmed_results: number;    // 已核销有效新客数
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}
