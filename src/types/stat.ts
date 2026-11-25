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

export interface DiagnosticSuggestion {
  kind: 'IMPROVE_HOOK' | 'IMPROVE_VERIFY' | 'EXPAND_ALLIANCE' | 'KEEP_GROWING';
  title: string;
  detail: string;
  actionLabel: string;
  targetPage: string;
}

export interface MerchantDiagnostics {
  merchantId: string;
  merchantName: string;
  categoryId: string;
  categoryName: string;
  periodDays: number;
  pendingAppointmentsCount: number;
  hasEnoughOwnAcquireSample: boolean;
  hasEnoughOwnVerifySample: boolean;
  metrics: {
    scans: number;
    selfClaims: number;
    totalClaims: number;
    selfRedeems: number;
    broughtGuests: number;
    receivedGuests: number;
    acquireRate: number;
    verifyRate: number;
  };
  peer: {
    categoryName: string;
    peerCount: number;
    hasEnoughPeerSample: boolean;
    peerAvgAcquireRate: number;
    peerAvgVerifyRate: number;
    beatAcquirePercent: number | null;
    beatVerifyPercent: number | null;
  };
  suggestions: DiagnosticSuggestion[];
}
