# 竹山同城 · 本地便民信息 + 商家联盟拓客 + 社区 小程序

> 遵循《竹山同城产品与商业闭环完整方案 v1.0》及《微信小程序开发 PRD v1.1》标准构建。  
> 定位：湖北省十堰市竹山县县域本地生活服务与实体商圈互助平台。

---

## 一、 核心业务架构与闭环

```
                   【线下扫码】
             A 服装店收银台/试衣间
                      │ (短 token 规避 scene 32字符限制)
                      ▼
         ┌─────────────────────────┐
         │ pages/benefit/shop      │  <-- A 店专属福利落地页
         │ 1. A 店试衣结账当场立减券 │  (首屏即时核销，满200减20)
         │ 2. 跨店合作福利 (≤3家)  │  (B 美睫美甲 / C 足道体验券)
         └────────────┬────────────┘
                      │ 顾客自主跨店领券 (打上 source_merchant_id = A)
                      ▼
         ┌─────────────────────────┐
         │ pages/coupon/code       │  <-- 券码出示与预约
         │ • 微信订阅消息推送提醒   │
         │ • 提交期望时段到店      │
         └────────────┬────────────┘
                      │ 到 B/C 店消费核销
                      ▼
         ┌─────────────────────────┐
         │ pages/merchant/verify   │  <-- 商家核销工作台
         │ • 严格 4001~4005 状态机 │
         │ • 幂等原子核销防双扣    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │ pages/merchant/ranking  │  <-- 竹山商圈引流贡献榜
         │ • 基于近30天真实带客    │
         │ • 每日 merchant_daily_stat 物化汇总
         └─────────────────────────┘
```

---

## 二、 核心模块工程目录

```
zhushan-city/
├── src/
│   ├── api/                # 抽象接口层（支持 mock 与 cloud 微信云开发无缝切换）
│   │   ├── adapter.ts      # USE_MOCK 开关 (默认 true)
│   │   ├── home.ts         # 首页聚合数据
│   │   ├── shop.ts         # 门店福利页与扫码上报
│   │   ├── coupon.ts       # 领券、我的券包、核销 (含 4001~4005 状态机)
│   │   ├── info.ts         # 便民信息浏览与合规发布
│   │   └── ranking.ts      # 商圈引流贡献榜
│   ├── components/         # 业务公共组件
│   │   ├── CouponCard.vue  # 优惠券卡片 (支持当场用/需预约/已核销等状态)
│   │   ├── InfoCard.vue    # 便民信息卡片 (租房/二手/绿松石，防骚扰拨打)
│   │   └── ShopCard.vue    # 联盟商户卡片
│   ├── constants/          # 常量定义
│   │   ├── errCodes.ts     # 核销业务错误码定义 (4001~4005)
│   │   ├── regions.ts      # 竹山县 17 个乡镇标准列表 (修正人大公报数据)
│   │   └── enums.ts        # 便民分类与商户品类 (网络招聘暂冻结防拒审)
│   ├── mock/               # 深度贴合竹山真实商圈的 Mock 数据集
│   │   ├── home.json
│   │   ├── shopDetail_A.json # 雅致女装 A 店福利页核心数据
│   │   ├── coupons.json
│   │   └── ranking.json
│   ├── pages/              # 页面
│   │   ├── index/index.vue           # 首页 (分类+17乡镇+信息流+联盟好店)
│   │   ├── benefit/shop.vue          # 【核心枢纽】A 店专属福利落地页
│   │   ├── coupon/mine.vue           # 我的券包 (可用/已用/过期)
│   │   ├── coupon/code.vue           # 出示核销与预约处理
│   │   ├── info/list.vue             # 便民信息列表
│   │   ├── info/detail.vue           # 便民信息详情与防诈提示
│   │   ├── info/publish.vue          # 发布便民信息 (号码公开同意书)
│   │   ├── merchant/index.vue        # 商家工作台 (今日扫码/核销看板)
│   │   ├── merchant/verify.vue       # 扫码与输码核销工作台
│   │   ├── merchant/ranking.vue      # 引流贡献榜
│   │   ├── merchant/appointment.vue  # 客户预约确认接待
│   │   └── user/index.vue            # 个人中心
│   ├── store/              # Pinia 状态管理 (userStore, merchantStore)
│   ├── types/              # TypeScript 强类型定义
│   └── utils/              # 工具库 (短token scene解析、订阅消息)
└── cloudfunctions/         # 微信云开发生产级云函数
    ├── login/              # 微信静默授权登录
    ├── scanResolve/        # 扫码日志记录与归因
    ├── couponClaim/        # 原子扣库存领券与规则快照固化
    ├── couponVerify/       # 幂等核销与状态机防并发校验
    └── statSync/           # 定时任务：每日物化汇总商家经营数据
```

---

## 三、 本地运行与调试指引

### 1. 方式一：使用 HBuilderX（推荐，零配置）
1. 打开 **HBuilderX** -> `文件` -> `导入` -> `从本地目录导入`，选择 `D:\Ai movies\zhushan-city`。
2. 点击顶部菜单 `运行` -> `运行到小程序模拟器` -> `微信开发者工具`。
3. 项目默认开启 `USE_MOCK = true`，所有页面、领券、核销、预约、榜单无需后端即可完整模拟真实交互！

### 2. 方式二：使用命令行 (Node / pnpm / Vite)
```bash
cd "D:\Ai movies\zhushan-city"
cmd /c "npm install"
cmd /c "npm run dev:mp-weixin"
```
打包产物位于 `dist/dev/mp-weixin`，用微信开发者工具打开该目录即可预览。

---

## 四、 关键技术特性

1. **场景短 Token 防超标**：微信小程序 `scene` 强制限制 32 字符，系统采用 `scan_token` 映射机制，即使带汉字与多参数也能稳定落地到 `benefit/shop` 页面。
2. **规则快照防篡改**：领取时在 `user_coupon` 集合中固化 `rule_snapshot`，杜绝商家后续篡改规则导致的纠纷。
3. **物化汇总提升性能**：设计 `merchant_daily_stat` 日汇总表，杜绝在云数据库中实时全量扫表聚合。
4. **合规防封**：暂不开启网络招聘分类，便民发布加入《个人信息保护法》电话公开授权勾选与防诈警示。
