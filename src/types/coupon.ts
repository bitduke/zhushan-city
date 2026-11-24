export type CouponUsageMode = 'INSTANT' | 'WALK_IN' | 'BOOKING';
export type CouponType = 'FULL_REDUCTION' | 'DISCOUNT' | 'GIFT' | 'EXPERIENCE';
export type CouponTemplateStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type UserCouponStatus = 'UNUSED' | 'USED' | 'EXPIRED' | 'VOID';

export interface RuleSnapshot {
  title: string;
  type: CouponType;
  condition_amount: number;
  discount_amount: number;
  gift_desc?: string;
  usage_mode: CouponUsageMode;
  booking_required: boolean;
  valid_days: number;
  instructions: string;
}

export interface CouponTemplate {
  _id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_avatar?: string;
  merchant_address?: string;
  merchant_phone?: string;
  title: string;
  type: CouponType;
  usage_mode: CouponUsageMode;
  condition_amount: number;
  discount_amount: number;
  gift_desc?: string;
  booking_required: boolean;
  total_count: number;
  claimed_count: number;
  redeemed_count: number;
  per_user_limit: number;
  start_time: string;
  end_time: string;
  status: CouponTemplateStatus;
  instructions: string;
}

export interface UserCoupon {
  _id: string;
  code: string; // 唯一券码
  user_id: string;
  coupon_id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_address?: string;
  merchant_phone?: string;
  source_merchant_id?: string; // 来源引流店ID (如 A 服装店)
  cooperation_contract_id?: string; // 对应拓客单
  status: UserCouponStatus;
  rule_snapshot: RuleSnapshot;
  claimed_at: string;
  used_at?: string;
  expires_at: string;
  has_appointment?: boolean;
  merchant_suspended?: boolean;
}
