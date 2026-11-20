export type ScanTokenType = 'SHOP_BENEFIT' | 'ACTIVITY' | 'PUBLIC';

export interface ScanToken {
  token: string;
  type: ScanTokenType;
  target_id: string; // 如 merchant_id
  created_at: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface ScanLog {
  _id?: string;
  token: string;
  type: ScanTokenType;
  source_merchant_id?: string;
  openid: string;
  created_at: string;
}
