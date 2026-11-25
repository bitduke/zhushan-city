import type { CouponDraftInput } from '@/api/couponManage';

export type AdvisorGoal = 'ALL' | 'ALLIANCE_NEW' | 'TICKET_BOOST' | 'PEER_FISSION' | 'IDLE_FILL';

export interface AdvisorPlaybook {
  id: string;
  categoryId: 'common' | 'catering' | 'beauty' | 'foot_bath' | 'apparel' | 'car_care' | 'parenting';
  categoryName: string;
  goal: Exclude<AdvisorGoal, 'ALL'>;
  goalLabel: string;
  badge: string;
  isAllianceRecommended: boolean;
  validDays: number;
  partnerAdvice: string;
  cashierScript: string;
  profitGuard: string;
  draft: Omit<CouponDraftInput, 'start_time' | 'end_time'>;
}

export const ADVISOR_GOALS: Array<{ id: AdvisorGoal; label: string }> = [
  { id: 'ALL', label: '全部方案' },
  { id: 'ALLIANCE_NEW', label: '盟友跨店拉新' },
  { id: 'TICKET_BOOST', label: '店内凑单提客' },
  { id: 'PEER_FISSION', label: '1+1转赠裂变' },
  { id: 'IDLE_FILL', label: '错峰救闲时' }
];

export const ADVISOR_CATEGORIES = [
  { id: 'common', name: '全行业通用' },
  { id: 'catering', name: '特色美食' },
  { id: 'beauty', name: '美容美甲' },
  { id: 'foot_bath', name: '足道养生' },
  { id: 'apparel', name: '服装女装' },
  { id: 'car_care', name: '汽车美容' },
  { id: 'parenting', name: '亲子游乐' }
] as const;

export const COUPON_ADVISOR_PLAYBOOKS: AdvisorPlaybook[] = [
  // ==================== 全行业通用（3套） ====================
  {
    id: 'common_alliance_icebreaker',
    categoryId: 'common',
    categoryName: '全行业通用',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '盟友必配 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '挂在客流大但不同行的盟友门店（如餐馆挂洗车店，女装挂美甲店），用小礼物破冰拉新。',
    cashierScript: '“老板，扫桌上竹山街坊汇码，不光能减咱家钱，还能顺便领旁边几家好店的免费福利券！”',
    profitGuard: '设置30元实付门槛防白嫖，赠品选2~4元低成本高感知物，确保第一单即保本。',
    draft: {
      title: '盟友新客满30元赠招牌体验礼',
      type: 'EXPERIENCE',
      usage_mode: 'WALK_IN',
      condition_amount: '30',
      discount_amount: '10',
      total_count: '200',
      per_user_limit: '1',
      instructions: '限未通过联盟渠道领券的新客以后到店使用，正价实付满30元免费赠送店内指定体验礼一份，每人限领1次，不折现不找零。'
    }
  },
  {
    id: 'common_peer_fission',
    categoryId: 'common',
    categoryName: '全行业通用',
    goal: 'PEER_FISSION',
    goalLabel: '1+1转赠裂变',
    badge: '可转赠好友',
    isAllianceRecommended: false,
    validDays: 30,
    partnerAdvice: '老客领完2张自己留1张，可在“券包出示页”点转发直接送1张给微信闺蜜/邻居一起同行。',
    cashierScript: '“今天一人可以领两张券，您自己留一张下次用，另一张点分享发给朋友一起过来最划算！”',
    profitGuard: '门槛设在98元保证双人客单，15元让利相当于约85折，带新客进店零广告费。',
    draft: {
      title: '街坊同行消费满98立减15元',
      type: 'FULL_REDUCTION',
      usage_mode: 'INSTANT',
      condition_amount: '98',
      discount_amount: '15',
      total_count: '120',
      per_user_limit: '2',
      instructions: '支持转赠微信好友或两人结伴到店使用，单笔实付满98元可抵扣15元，特价商品除外，结账前请主动出示券码核销。'
    }
  },
  {
    id: 'common_ticket_boost',
    categoryId: 'common',
    categoryName: '全行业通用',
    goal: 'TICKET_BOOST',
    goalLabel: '店内凑单提客',
    badge: '最抗亏满减',
    isAllianceRecommended: false,
    validDays: 30,
    partnerAdvice: '放在自家收银台扫码页面，当顾客刚坐下准备下单时引导凑单。',
    cashierScript: '“差几块钱就凑够58减8啦，加个小菜或配件相当于白送，扫码直接减！”',
    profitGuard: '门槛58元大于减免8元（约86折），实付50元进账，杜绝小单亏本风险。',
    draft: {
      title: '本店专享满58元立减8元',
      type: 'FULL_REDUCTION',
      usage_mode: 'INSTANT',
      condition_amount: '58',
      discount_amount: '8',
      total_count: '150',
      per_user_limit: '1',
      instructions: '适用于本店当场正价消费，单笔订单实付金额满58元立减8元，特价促销及烟酒品除外，不可与其他会员卡折扣同享。'
    }
  },

  // ==================== 特色美食 (catering) ====================
  {
    id: 'catering_alliance_new',
    categoryId: 'catering',
    categoryName: '特色美食',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '等位截流 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '优先与【汽车美容】【亲子游乐】结盟！车主洗车等30分钟、家长遛完娃出来正好需要解决吃饭。',
    cashierScript: '“刚在隔壁洗完车/逛完街吧？咱街坊汇领的券满38直接送凉菜/饮品一份，马上给您端上来！”',
    profitGuard: '饮品/小份凉菜成本仅1.5~3元，但能促使邻店新客专程走过来点主食菜品。',
    draft: {
      title: '盟友专享满38元送特色饮品小菜',
      type: 'EXPERIENCE',
      usage_mode: 'WALK_IN',
      condition_amount: '38',
      discount_amount: '10',
      total_count: '200',
      per_user_limit: '1',
      instructions: '限首次通过竹山街坊汇联盟渠道领取的新客以后到店堂食使用，实付满38元赠指定饮品或招牌小菜一份，每桌限用1张不外带。'
    }
  },
  {
    id: 'catering_ticket_boost',
    categoryId: 'catering',
    categoryName: '特色美食',
    goal: 'TICKET_BOOST',
    goalLabel: '店内凑单提客',
    badge: '保酒水利润',
    isAllianceRecommended: false,
    validDays: 30,
    partnerAdvice: '搭配“钩子体验券”使用：新客吃完第一顿后，店员引导领此大券锁定下次家庭/朋友聚餐。',
    cashierScript: '“这单刚核销完，顺手再领张下次满128减20的聚餐券存券包里，下次带朋友来吃直接省20！”',
    profitGuard: '规则明确排除酒水饮料与锅底，守住餐饮店毛利最高的酒水线。',
    draft: {
      title: '好友聚餐堂食满128立减20元',
      type: 'FULL_REDUCTION',
      usage_mode: 'INSTANT',
      condition_amount: '128',
      discount_amount: '20',
      total_count: '100',
      per_user_limit: '1',
      instructions: '适用于堂食正餐菜品消费（不含酒水饮料、锅底及特价菜），单桌实付满128元整单立减20元，请点单核销或买单前出示。'
    }
  },

  // ==================== 美容美甲 (beauty) ====================
  {
    id: 'beauty_alliance_new',
    categoryId: 'beauty',
    categoryName: '美容美甲',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '女性精流 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '强烈推荐与【服装女装】【亲子游乐】结盟！来逛女装的爱美女士与妈妈群是最精准的潜客。',
    cashierScript: '“小姐姐，预约过来了呀！这套护甲/护理体验券抵20元，先选色号，下次还能带闺蜜一起来。”',
    profitGuard: '设为需预约错峰到店，避免周末扎堆；48元门槛即可覆盖基础耗材与人工工时。',
    draft: {
      title: '盟友新客纯色美甲护理满48抵20',
      type: 'EXPERIENCE',
      usage_mode: 'BOOKING',
      condition_amount: '48',
      discount_amount: '20',
      total_count: '80',
      per_user_limit: '1',
      instructions: '限联盟渠道新客提前2小时在线预约到店排期，正价基础美甲或护理满48元可抵20元，仅限首次体验，不可与会员充卡折扣叠加。'
    }
  },
  {
    id: 'beauty_peer_fission',
    categoryId: 'beauty',
    categoryName: '美容美甲',
    goal: 'PEER_FISSION',
    goalLabel: '1+1转赠裂变',
    badge: '闺蜜拼单',
    isAllianceRecommended: false,
    validDays: 45,
    partnerAdvice: '做美甲最喜欢叫上闺蜜陪着聊天，一人领券后可直接转赠微信好友约同一时段来。',
    cashierScript: '“这个两人拼单减30最划算，您点分享发给闺蜜看下款式，下周一起预约过来！”',
    profitGuard: '两单合计168元才减30元，拉长单次产值，技师一次性接待效率高。',
    draft: {
      title: '闺蜜同行预约美护满168减30元',
      type: 'FULL_REDUCTION',
      usage_mode: 'BOOKING',
      condition_amount: '168',
      discount_amount: '30',
      total_count: '60',
      per_user_limit: '2',
      instructions: '闺蜜两人同约到店消费美甲美睫或皮肤护理合计满168元可抵扣30元，支持转赠好友，需提前选定预约时段到店确认。'
    }
  },

  // ==================== 足道养生 (foot_bath) ====================
  {
    id: 'foot_bath_alliance_new',
    categoryId: 'foot_bath',
    categoryName: '足道养生',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '饭后解乏 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '最佳盟友是附近【烧烤/火锅餐馆】和【洗车店】！吃完晚饭解乏或洗完车累了直接进店体验。',
    cashierScript: '“您扫了街坊汇券过来呀！做主项目免费送一次艾灸/热敷肩颈，先帮您烧水泡脚！”',
    profitGuard: '赠送加钟体验项目成本主要是技师闲时时间，零额外物料负担且体验极好。',
    draft: {
      title: '盟友新客足疗满68赠艾灸热敷礼',
      type: 'EXPERIENCE',
      usage_mode: 'WALK_IN',
      condition_amount: '68',
      discount_amount: '28',
      total_count: '150',
      per_user_limit: '1',
      instructions: '限首次通过商圈联盟领券的新客以后到店使用，正价消费任意主项目满68元免费加赠特色肩颈热敷或艾灸体验1次，不折现。'
    }
  },
  {
    id: 'foot_bath_idle_fill',
    categoryId: 'foot_bath',
    categoryName: '足道养生',
    goal: 'IDLE_FILL',
    goalLabel: '错峰救闲时',
    badge: '盘活下午场',
    isAllianceRecommended: false,
    validDays: 45,
    partnerAdvice: '针对下午12点~18点房间和技师空置痛点，吸引退休老人、自由职业者白天来放松。',
    cashierScript: '“下午两点过来做脚最安静还省20块钱，在小程序点个预约把房间给您留好！”',
    profitGuard: '严格锁定12:00-18:00闲时使用，不挤占晚上高价黄金包间，且不与充卡折扣冲突。',
    draft: {
      title: '下午闲时养生预约满98减20元',
      type: 'FULL_REDUCTION',
      usage_mode: 'BOOKING',
      condition_amount: '98',
      discount_amount: '20',
      total_count: '80',
      per_user_limit: '2',
      instructions: '限每日12:00至18:00期间提前预约到店核销使用，正价足道推拿项目满98元立减20元，黄金晚间时段及充卡支付不可用。'
    }
  },

  // ==================== 服装女装 (apparel) ====================
  {
    id: 'apparel_alliance_new',
    categoryId: 'apparel',
    categoryName: '服装女装',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '逛街引流 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '优先挂在【美容美甲】【餐馆甜品】店里！女生做完指甲/吃完饭逛街试衣服顺水推舟。',
    cashierScript: '“美女看您领了我们店的新客券，正价新款满128直接减25，先随便试穿看看版型！”',
    profitGuard: '门槛128减25相当于约8折试新礼，退换货明确按实付不退券额。',
    draft: {
      title: '盟友专享当季正价女装满128减25',
      type: 'FULL_REDUCTION',
      usage_mode: 'WALK_IN',
      condition_amount: '128',
      discount_amount: '25',
      total_count: '150',
      per_user_limit: '1',
      instructions: '限商圈联盟新客以后逛店使用，全场当季正价服饰单笔实付满128元立减25元，特价清仓区及饰品配件除外，退换不退券额。'
    }
  },
  {
    id: 'apparel_ticket_boost',
    categoryId: 'apparel',
    categoryName: '服装女装',
    goal: 'TICKET_BOOST',
    goalLabel: '店内凑单提客',
    badge: '提连带率',
    isAllianceRecommended: false,
    validDays: 30,
    partnerAdvice: '上衣配裤子/连衣裙配开衫最容易破298门槛，试衣间门口直接口播。',
    cashierScript: '“这件衬衫配这条裤子刚好凑够两件298，扫码直接省50块钱，相当于白捡条腰带！”',
    profitGuard: '通过两件满减快速走货提连带率，298减50后实收248依然保留充足服装毛利。',
    draft: {
      title: '两件搭配满298元当场立减50元',
      type: 'FULL_REDUCTION',
      usage_mode: 'INSTANT',
      condition_amount: '298',
      discount_amount: '50',
      total_count: '100',
      per_user_limit: '2',
      instructions: '选购店内任意两件及以上正价服饰合计实付满298元可当场直减50元，清仓特价款除外，请收银台结账前出示核销。'
    }
  },

  // ==================== 汽车美容 (car_care) ====================
  {
    id: 'car_care_alliance_new',
    categoryId: 'car_care',
    categoryName: '汽车美容',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '车主吸客 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '强烈建议和【餐馆酒楼】【足道养生】互相挂券！竹山有车一族吃饭洗车场景高度重叠。',
    cashierScript: '“哥，扫了盟友店的洗车券吧！普洗立减12只要十来块，顺便免费帮您查下胎压和玻璃水！”',
    profitGuard: '低价普洗只为把车开进工位，靠顺带检查空调滤芯、雨刮、漆面打蜡赚大头。',
    draft: {
      title: '盟友车主新客标准普洗满25抵12',
      type: 'EXPERIENCE',
      usage_mode: 'WALK_IN',
      condition_amount: '25',
      discount_amount: '12',
      total_count: '200',
      per_user_limit: '1',
      instructions: '限7座及以下私家车主首次通过联盟渠道领券使用，标准外观普洗满25元可抵扣12元，到店按序排队核销，不含精洗及底盘。'
    }
  },
  {
    id: 'car_care_idle_fill',
    categoryId: 'car_care',
    categoryName: '汽车美容',
    goal: 'IDLE_FILL',
    goalLabel: '错峰救闲时',
    badge: '工位免排队',
    isAllianceRecommended: false,
    validDays: 45,
    partnerAdvice: '精洗、打蜡施工耗时长达1.5小时，用预约券把车主锁到周中工位空闲时施工。',
    cashierScript: '“周六洗车太挤，您领这张预约立减35的精洗打蜡券，周中提前约个点来不用等！”',
    profitGuard: '高客单精洗项目158减35利润可观，且工位提前锁定不空耗。',
    draft: {
      title: '精洗打蜡漆面养护预约满158减35',
      type: 'FULL_REDUCTION',
      usage_mode: 'BOOKING',
      condition_amount: '158',
      discount_amount: '35',
      total_count: '60',
      per_user_limit: '1',
      instructions: '适用于全车精洗、打蜡或空调杀菌养护项目，施工约1.5小时请提前在线预约工位免排队，实付满158元立减35元。'
    }
  },

  // ==================== 亲子游乐 (parenting) ====================
  {
    id: 'parenting_alliance_new',
    categoryId: 'parenting',
    categoryName: '亲子游乐',
    goal: 'ALLIANCE_NEW',
    goalLabel: '跨店拉新（挂盟友店）',
    badge: '错峰引流 · 60天',
    isAllianceRecommended: true,
    validDays: 60,
    partnerAdvice: '推荐挂在【家常菜馆】【服装女装】收银台！周末平时带娃逛街吃饭的家庭看重性价比。',
    cashierScript: '“宝妈工作日带娃人少更干净，这张联盟新客券周中过来直接减12元！”',
    profitGuard: '明确限制周一至周五使用，完美绕开原本就爆满的周末，提高周一到周五门票收入。',
    draft: {
      title: '盟友新客工作日遛娃满39减12元',
      type: 'FULL_REDUCTION',
      usage_mode: 'WALK_IN',
      condition_amount: '39',
      discount_amount: '12',
      total_count: '150',
      per_user_limit: '1',
      instructions: '限周一至周五非节假日入园使用（周末及法定节假日不可用），单次正价门票消费满39元立减12元，入园请穿防滑袜遵守安全守则。'
    }
  },
  {
    id: 'parenting_peer_fission',
    categoryId: 'parenting',
    categoryName: '亲子游乐',
    goal: 'PEER_FISSION',
    goalLabel: '1+1转赠裂变',
    badge: '妈妈群晒券',
    isAllianceRecommended: false,
    validDays: 30,
    partnerAdvice: '爸爸妈妈爷爷奶奶喜欢一起陪娃进园，送个大人陪同名额或几块钱的手工材料包最受好评。',
    cashierScript: '“带家里老人或约另一个宝妈一起来吧！这张券满35免费多送1位大人陪同名额！”',
    profitGuard: '增加陪同大人几乎零边际成本，却能极大提高家长带娃进店频次和园内饮料消费。',
    draft: {
      title: '购畅玩票满35赠大人陪同或手工礼',
      type: 'EXPERIENCE',
      usage_mode: 'INSTANT',
      condition_amount: '35',
      discount_amount: '15',
      total_count: '120',
      per_user_limit: '2',
      instructions: '购买正价儿童畅玩票满35元，凭证免费加赠额外1名家长陪同名额或手工DIY材料包一份，支持转赠邻里宝妈，每单限兑一份。'
    }
  }
];
