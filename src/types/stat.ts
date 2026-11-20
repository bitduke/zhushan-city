export interface MerchantDailyStat {
  _id: string; // 如 "20261120_merchant_001"
  date: string;
  merchant_id: string;
  scan_count: number;         // 门店码扫码人数
  claim_self_count: number;   // 本店券领取量
  redeem_self_count: number;  // 本店券当场核销量
  claim_cross_count: number;  // 帮合作店引流领券量
  bring_new_guest_count: number; // 带来合作店实际到店新客量
  received_guest_count: number;  // 本店接收到的外来新客量
}

export interface MerchantRankingItem {
  merchant_id: string;
  merchant_name: string;
  category_name: string;
  town: string;
  avatar: string;
  total_brought_guests: number; // 近30天累计带客
  coop_merchants_count: number; // 合作商家数
  conversion_rate: number;      // 核销转化率
  sample_size: number;          // 样本量
  is_new_partner?: boolean;
}
