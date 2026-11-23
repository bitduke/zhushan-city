# 《竹山同城》项目完整开发交接文档（给 Codex 深度接盘续写版）

> **交接目标读者**：Codex / 协同开发 AI Agent  
> **交接时间**：2026 年 11 月 23 日  
> **代码仓库**：[https://github.com/bitduke/zhushan-city](https://github.com/bitduke/zhushan-city)  
> **本地工作区路径**：`D:\Ai movies\zhushan-city`

---

## 0. 给 Codex 的一句话总纲（TL;DR）

**《竹山同城》是一个面向湖北省竹山县（17个乡镇）的本地便民信息 + 实体商家互助拓客小程序。**  
目前 **Phase 1（MVP 闭环）已全部开发完毕并编译通过**。前端采用 `uni-app (Vue3 + TS + Vite + Pinia)`，具备完备的 Mock 适配层（`USE_MOCK = true`），已支持在浏览器 H5（`http://localhost:5173/`）以及微信开发者工具（导入 `dist/build/mp-weixin`）双端无缝预览交互。后端微信云函数（5个核心函数）已编写就绪。

你接手后的核心职责是：**基于现有的规范与数据流，推进 Phase 2 的业务深化（包括云开发真机联调、拓客账单管理、商家入驻审核与管理后台等）。严禁破坏现有的短 Token 机制、核销状态机与合规约束。**

---

## 1. 核心业务与场景闭环（必须掌握的底层逻辑）

系统彻底摒弃了传统县域产品“泛流量+粗暴年费”的自嗨模式，核心抓手是**“线下实体店二维码与当场利益”**：

```
                      【顾客在 A 服装店结账/试衣】
                                  │
                                  ▼
                   扫描收银台桌面亚克力牌专属二维码
                  (scene 携带短 token，防 32 字符超标)
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ pages/benefit/shop.vue  │  <-- A 店专属福利落地页
                    ├─────────────────────────┤
                    │ 1. A 店当场立减券 (满200减20)│  <-- 顾客当场出示核销，促成本店消费
                    │ 2. 合作好店专属引荐 (≤3家) │  <-- 顾客自主选择跨店领券
                    │    • B 美睫美甲 38元体验券 │      (系统自动绑定 source_merchant_id = A)
                    │    • C 足道会所 68元体验券 │
                    └─────────────┬───────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ pages/coupon/code.vue   │  <-- 顾客券包与出示页
                    │ • 微信订阅消息授权       │  (服务类预约变更时提醒)
                    │ • 预约期望到店时段       │
                    └─────────────┬───────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ pages/merchant/verify   │  <-- B/C 店员工核销工作台
                    │ • 严格 4001~4007 状态机 │
                    │ • 防并发双击原子核销     │
                    └─────────────┬───────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ pages/merchant/ranking  │  <-- 竹山商圈引流贡献榜
                    │ • 基于真实带客转化率排行 │  (每日 statSync 物化汇总)
                    └─────────────────────────┘
```

---

## 2. 代码工程全景与文件资产清册

当前项目共 **60 个核心文件**，全部采用标准 TypeScript 强类型编写，各层自包含、高内聚、低耦合。

### 2.1 目录结构与分工

```
zhushan-city/
├── index.html                             # H5 模式入口
├── manifest.json & src/manifest.json      # 微信小程序权限与页面配置
├── package.json & vite.config.ts          # Vue3 + TS + Vite 配置（已锁死 dcloudio 5.37 版本）
├── .npmrc                                 # pnpm shamefully-hoist=true 依赖提平配置
├── tsconfig.json                          # TypeScript 路径别名与编译选项
│
├── src/
│   ├── api/                               # 抽象服务层（Mock 与云开发自由切换）
│   │   ├── adapter.ts                     # USE_MOCK 开关 (默认 true) 与 callCloudFunction 封装
│   │   ├── home.ts                        # 首页聚合数据接口
│   │   ├── shop.ts                        # 门店专属福利页与扫码日志上报
│   │   ├── coupon.ts                      # 领券、券包、核销状态机 (4001~4005)
│   │   ├── info.ts                        # 便民信息列表与发布（含合规授权）
│   │   └── ranking.ts                     # 商圈引流贡献榜数据
│   │
│   ├── components/                        # 公共 UI 组件
│   │   ├── CouponCard.vue                 # 优惠券卡片（支持当场立减/预约体验/失效等状态）
│   │   ├── InfoCard.vue                   # 便民信息卡片（价格、乡镇、一键拨打防扰）
│   │   └── ShopCard.vue                   # 联盟商户卡片（距离、地址、爆款券展示）
│   │
│   ├── constants/                         # 业务常量与约束
│   │   ├── errCodes.ts                    # 核销错误码与提示字典（4001~4007）
│   │   ├── regions.ts                     # 竹山县 17 个乡镇标准列表（订正自县人大公报）
│   │   └── enums.ts                       # 分类枚举（注：网络招聘类目保持禁用防拒审）
│   │
│   ├── mock/                              # 贴合竹山真实商圈的高质量场景数据
│   │   ├── home.json                      # 首页聚合 Mock
│   │   ├── shopDetail_A.json              # 雅致女装 A 店福利落地页 Mock（核心）
│   │   ├── coupons.json                   # 用户卡券包 Mock
│   │   └── ranking.json                   # 引流榜 Mock
│   │
│   ├── pages/                             # 12 个业务页面（在 src/pages.json 完整注册）
│   │   ├── index/index.vue                # 首页（17乡镇选择、搜索、分类九宫格、信息流、联盟好店）
│   │   ├── benefit/shop.vue               # ⭐【核心枢纽】A 门店专属福利落地页
│   │   ├── coupon/mine.vue                # 我的券包（待使用、已核销、已过期）
│   │   ├── coupon/code.vue                # 券码出示、核销码模拟、预约时段处理
│   │   ├── merchant/index.vue             # 商家工作台（今日扫码/核销看板、功能矩阵）
│   │   ├── merchant/verify.vue            # 商家扫码 / 输码核销（状态机拦截反馈）
│   │   ├── merchant/ranking.vue           # 竹山商圈引流贡献榜
│   │   ├── merchant/appointment.vue       # 客户预约处理（接单、拒绝、标记到店）
│   │   ├── info/list.vue                  # 便民信息分类列表页
│   │   ├── info/detail.vue                # 信息详情（安全防诈提示、电话授权展示、举报）
│   │   ├── info/publish.vue               # 发布便民信息（号码公开同意授权勾选）
│   │   └── user/index.vue                 # 个人中心（身份卡片、功能入口、合规协议）
│   │
│   ├── store/                             # Pinia 状态管理
│   │   ├── user.ts                        # 用户信息与当前选择乡镇缓存
│   │   └── merchant.ts                    # 当前操作商户、员工角色权限
│   │
│   ├── types/                             # TypeScript 接口规范
│   │   ├── coupon.ts                      # CouponTemplate, UserCoupon, RuleSnapshot
│   │   ├── merchant.ts                    # Merchant, BenefitPlacement, CooperationContract
│   │   ├── appointment.ts                 # Appointment 状态机 (REQUESTED→CONFIRMED→ARRIVED)
│   │   ├── stat.ts                        # MerchantDailyStat 物化统计表模型
│   │   ├── info.ts, scan.ts, user.ts
│   │
│   └── utils/
│       ├── scene.ts                       # 二维码短 Token 解析器（严控 32 字符内）
│       └── subscribe.ts                   # 微信订阅消息 wx.requestSubscribeMessage 封装
│
├── cloudfunctions/                        # 微信云开发生产级云函数
│   ├── login/index.js                     # 微信静默授权并维护 user 集合
│   ├── scanResolve/index.js               # 短 Token 映射与防刷扫码日志上报
│   ├── couponClaim/index.js               # 原子扣库存 (where claimed < total) 与快照固化
│   ├── couponVerify/index.js              # 幂等核销、防并发双击、记录 verify_log
│   └── statSync/index.js                  # 每日凌晨汇总离线统计至 merchant_daily_stat
│
└── docs/                                  # 方案与演进历史库
    ├── 沟通与架构演进全过程记录.md
    ├── 竹山同城_产品与商业闭环完整方案_v1.0.md
    ├── 竹山同城_小程序开发PRD_v1.1.md
    └── 竹山同城_商家互相拓客与排名机制_v0.3.md
```

---

## 3. 必须坚守的 5 大关键工程约定与防踩坑指南

你在继续编写代码时，**必须严格遵守以下约定，切勿回退或重构**：

### 3.1 微信二维码 Scene 参数 32 字符限制
*   **铁律**：微信 `wxacode.getUnlimited` 接口的 `scene` 最多仅支持 32 个字符。严禁在 scene 中拼接汉字（如小区名、镇名）或长 URL。
*   **实现**：必须通过 `scan_token` 短字符串（如 `t=tk01` 或 `s=shop_001`）传参，由 `src/utils/scene.ts` 解析并由服务端映射商户与活动。

### 3.2 卡券核销状态机与错误码规范（严格遵循 PRD 8.4）
核销接口（`api/coupon.ts` 和 `cloudfunctions/couponVerify`）已严格遵循业务错误码：
*   `4001`：券码不存在或无效
*   `4002`：券不属于本店（如拿美甲券去女装店核销）
*   `4003`：券已被核销（幂等防重）
*   `4004`：券已过有效期
*   `4005`：券未到生效时间
*   `4007`：该服务券需先完成预约确认方可核销
*   **开发约束**：任何核销逻辑改动均需返回上述确切错误码，不可简单抛出泛化网络异常。

### 3.3 券规则快照（`rule_snapshot`）防篡改
*   **铁律**：用户在领券的那一瞬间，系统必须将该券的标题、抵扣金额、使用条件、有效天数完整保存在 `user_coupon.rule_snapshot` 中。
*   **目的**：商家后续在后台修改券模板或降额时，既有已领券的用户权益不受损，防止在线下引发老板与居民的争吵纠纷。

### 3.4 引流榜禁止实时全量聚合（性能瓶颈）
*   **铁律**：微信云数据库（MongoDB 底层）算力有限，引流贡献榜（近 30 天带客、转化率）**严禁每次打开前端时去实时 `$lookup` 联表大聚合**。
*   **实现**：数据依赖 `cloudfunctions/statSync` 每天凌晨离线跑完物化到 `merchant_daily_stat` 表，前端榜单只读物化结果，毫秒级响应。

### 3.5 资质合规避坑（防小程序被封或拒审）
*   **招聘分类**：按人社部 2026 最新要求，网络招聘信息平台必须有人力资源服务许可。V1.0 中 `src/constants/enums.ts` 已经主动隐藏并禁用招聘分类，**在主体资质完备前切勿提前放开**。
*   **便民电话公开授权**：发布页面（`info/publish.vue`）必须保留《电话公开授权勾选框》，满足《个人信息保护法》最小必要原则。
*   **资金二清**：V1.0 坚决不设平台资金池代转提成，商家拓客账单先以线上对账、线下转账为主。

---

## 4. 运行、调试与验证指南

### 4.1 浏览器 H5 调试模式（当前已在本地运行）
项目已配置 `dev:h5` 服务，可以在终端执行：
```bash
cd "D:\Ai movies\zhushan-city"
pnpm run dev:h5
```
服务默认运行在：`http://localhost:5173/`。建议打开 Chrome/Edge DevTools 按 `Ctrl+Shift+M` 切换成手机分辨率（375x667 或 390x844）进行高保真交互。

### 4.2 微信小程序模式编译与真机预览
```bash
cd "D:\Ai movies\zhushan-city"
pnpm run build:mp-weixin
```
编译产物位于 `dist/build/mp-weixin`。  
打开 **微信开发者工具** -> `导入项目` -> 选择 `D:\Ai movies\zhushan-city\dist\build\mp-weixin`，AppID 填测试号即可实时运行。

### 4.3 数据源切换（Mock ↔ 云开发）
打开 `src/api/adapter.ts`：
*   `export const USE_MOCK = true;`：完全使用本地高质量场景 Mock，无网络依赖，随时演示完整业务闭环；
*   `export const USE_MOCK = false;`：自动通过 `wx.cloud.callFunction` 调用微信云函数后端。

---

## 5. Codex 后续建议开发的路线图（Phase 2 待办任务）

你可以根据优先级，直接接手推进以下任务：

### 任务 1：商家端“拓客合作管理”与对账单详情页（P0）
*   **目标**：补充 `pages/merchant/cooperation.vue`。
*   **需求**：
    1. A 店老板可以看到正在帮哪些合作店（B 美业、C 足道）引流；
    2. 查看本周期（按周/按月）的有效新客核销量（带客数）；
    3. 生成应收账单明细（例如：B 店有效核销 5 笔 × 20元 = 100元，状态：待确认 / 已线下结清）；
    4. 带有“对账单核对无误，标记已结算”的双向确认动作。

### 任务 2：微信云开发环境真实联调与部署（P1）
*   **目标**：将 `USE_MOCK` 切为 `false`，在真实微信小程序环境中完成云开发初始化。
*   **步骤**：
    1. 在微信开发者工具中开通云开发环境（获取 `envId`）；
    2. 在云数据库中创建集合：`user`、`merchant`、`merchant_staff`、`coupon`、`user_coupon`、`appointment`、`scan_log`、`verify_log`、`merchant_daily_stat`、`info`；
    3. 右键 `cloudfunctions/` 下的 5 个函数，点击“上传并部署：所有文件”；
    4. 在 `cloudfunctions/statSync` 配置定时触发器（`cron: "0 0 2 * * * *"`，每天凌晨 2 点执行）。

### 任务 3：微信订阅消息真实模板 ID 绑定（P1）
*   **目标**：在 `src/utils/subscribe.ts` 中配置小程序后台申请的真实模板 ID：
    *   `APPOINTMENT_CONFIRM`：预约确认通知模板；
    *   在云函数 `appointmentManage` 中调用 `openapi.subscribeMessage.send`，完成到店预约确认后的微信服务通知闭环。

### 任务 4：PC 端管理后台设计（V1.1 规划）
*   **目标**：在 `admin/` 目录构建轻量 Vue3 + Element Plus 后台，供平台运营团队处理：
    *   新商家入驻资质审核；
    *   便民信息人工审核队列（租房、二手转让）；
    *   用户举报与拒兑申诉仲裁。

---

**文档交付完毕。Codex，请在上述业务架构和代码工程基础上，直接展开 Phase 2 的任务推进！**
