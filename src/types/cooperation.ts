export type CooperationStatus = 'OFFERED' | 'PENDING_ADMIN' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED';
export type CooperationResultStatus = 'PENDING_BUYER' | 'PENDING_PROMOTER' | 'CONFIRMED' | 'INELIGIBLE' | 'DISPUTED' | 'INVALIDATED';

/** Local-demo record of terms accepted by the buyer and promoter. Money is stored in cents. */
export interface CooperationOffer {
  _id: string;
  buyer_merchant_id: string;
  promoter_merchant_id: string;
  target_coupon_id: string;
  target_coupon_title?: string;
  buyer_merchant_name?: string;
  promoter_merchant_name?: string;
  pricing_model: 'PER_RESULT' | 'BY_SLOT';
  unit_price_cents: number;
  slot_price_cents?: number;
  platform_fee_cents: number;
  budget_cents: number;
  start_date: string;
  end_date: string;
  new_customer_rule: string;
  new_customer_window_days: number;
  version: number;
  status: CooperationStatus;
  published_at: string;
  accepted_at?: string;
  paused_at?: string;
  admin_review_reason?: string;
  admin_reviewed_at?: string;
  placement_sort?: number;
  placement_active?: boolean;
  slot_delivery_confirmed_at?: string;
  slot_delivery_note?: string;
}

export interface PlacementConfig {
  _id: string;
  cooperation_id: string;
  source_merchant_id: string;
  source_merchant_name: string;
  target_coupon_id: string;
  target_coupon_title: string;
  sort: number;
  status: 'ACTIVE' | 'PAUSED';
}

export interface CooperationResult {
  _id: string;
  cooperation_id: string;
  user_coupon_id: string;
  user_id: string;
  buyer_merchant_id: string;
  promoter_merchant_id: string;
  coupon_code: string;
  status: CooperationResultStatus;
  verified_at: string;
  buyer_note?: string;
  buyer_reviewed_at?: string;
  promoter_note?: string;
  promoter_reviewed_at?: string;
  confirmed_at?: string;
  admin_resolution_reason?: string;
  admin_resolved_at?: string;
}

export interface CooperationPayment {
  _id: string;
  cooperation_id: string;
  amount_cents: number;
  payment_reference: string;
  status: 'PENDING_RECEIPT' | 'CONFIRMED';
  submitted_at: string;
  confirmed_at?: string;
}

export interface CooperationBill {
  cooperation_id: string;
  confirmed_results: number;
  payable_cents: number;
  platform_fee_cents: number;
  promoter_due_cents: number;
  confirmed_paid_cents: number;
  pending_receipt_cents: number;
  remaining_cents: number;
  overpaid_cents: number;
}
