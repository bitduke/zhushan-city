import type { CouponTemplate } from './coupon';
import type { CooperationOffer } from './cooperation';

export type MerchantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface MerchantApplication {
  _id: string;
  merchant_id?: string;
  applicant_user_id: string;
  name: string;
  category_id: string;
  category_name: string;
  town: string;
  address: string;
  contact_phone: string;
  business_hours: string;
  daily_booking_limit?: number;
  qualification_note: string;
  qualification_images: string[];
  qualification_image_urls?: string[]; // 管理员查看私有资质图的临时链接
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  review_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface MerchantStaff {
  _id?: string;
  merchant_id: string;
  user_id: string;
  role: StaffRole;
  status: 'ACTIVE' | 'DISABLED';
  can_verify: boolean;
  can_handle_appointment: boolean;
}

export interface StaffInvite {
  token: string;
  merchant_id: string;
  can_verify: boolean;
  can_handle_appointment: boolean;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  expires_at: string;
}

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
  daily_booking_limit?: number;
  status: MerchantStatus;
  qrcode_token?: string; // 短 token
  access_role?: StaffRole;
  can_verify?: boolean;
  can_handle_appointment?: boolean;
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

export type CooperationContract = CooperationOffer;
