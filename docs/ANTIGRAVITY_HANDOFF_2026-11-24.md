# 竹山街坊汇小程序｜Antigravity 开发与调试交接

> 核对时间：2026-11-24（北京时间）。本文件是当前交接入口。请先打开本机 `D:\Ai movies\zhushan-city`，再按下文检查；公众平台审核、云资源和预览码状态可能变化，执行前重新读取。

## 1. 先读结论与工作边界

- 项目是 **uni-app / Vue 3 / TypeScript / Pinia 微信小程序**，AppID `wx159a3c0644c4f176`。前端当前连接正式小程序云环境 `supporting-vulture-d4cgj6b9b7a15`，`.env.local` 为 `VITE_USE_MOCK=false`。
- **还没有上架，也不能说全功能真机验收通过。** 2026-11-24 公众平台首页显示：基础信息“审核中”、服务类目“已完成”、小程序备案“未备案”、微信认证“未认证”。《小程序用户隐私保护指引》尚待平台开放设置；`src/constants/legal.json` 的 `operatorName` 仍为空。
- 18 个云函数已部署；`cloud_fn_list` 返回 18 个函数，`cloud_db_read_struct listCollections` 返回 33 个集合条目（含系统集合）。近期查询：已审核商家、生效券、生效合作展示位均为 0。因此首页、逛店和联盟页的正式环境空状态是真实结果，不要填入假商家或假优惠。
- TypeScript 检查、小程序构建和 **17/17 项云函数隔离测试**通过；已有 27 个旧页面的演示与云环境冒烟结果，后增商圈联盟、欢迎页、服务协议三页并做定向测试。跨居民、店主、员工、管理员四个独立微信账号的真机链路仍未验收，用户暂时没有可用的测试门店和其他微信号。
- Git 当前为 `master`，最近提交 `d4dc704`，**当前大量源码、云函数和文档仍是未提交的工作区改动**。必须直接打开这个本机文件夹继续；仅克隆 GitHub 远端会缺少本轮实现。先看 `git status --short`，不要在未核对前清理或覆盖工作区。

推荐阅读顺序：本文件 → [上架检查](RELEASE_AUDIT_2026-11-24.md) → [全页面测试](UI_QA_2026-11-24.md) → [产品 PRD](竹山同城_小程序开发PRD_v1.1.md) → [云端联调历史](CLOUD_READINESS.md)。[旧 Codex 交接](CODEX_HANDOFF.md)仅供追溯，里面的默认 Mock、函数数量与完成度不能作为当前事实。

## 2. 目录、配置与功能分层

| 位置 | 用途 |
| --- | --- |
| `src/pages.json` | 30 个页面路由及四栏 Tab：首页、券包、逛店、我的。首屏是 `pages/welcome/index`。 |
| `src/pages/index/index.vue` | 首页：广告横幅、六个便民分类、商圈联盟卡、发布信息卡、最新三条审核信息。 |
| `src/pages/benefit/alliance.vue`、`src/pages/benefit/shop.vue` | 联盟玩法说明；门店福利页先展示本店当场券，再展示有效合作店券。 |
| `src/pages/coupon/` | 本人券包、券码出示、服务券预约。券包是已领记录，逛店是商家目录，两栏走不同路由。 |
| `src/pages/merchant/` | 商家申请、工作台、店铺、建券、员工邀请码、核销、预约、引流榜、合作与对账。 |
| `src/pages/admin/index.vue` | 小程序内运营管理台；正式环境按云端 `ADMIN` 角色授权。无独立 PC 后台。 |
| `src/pages/welcome/index.vue`、`src/pages/help/terms.vue`、`privacy.vue` | 首次告知/同意、服务协议、隐私说明。协议当前为预览草稿，主体名称待核实。 |
| `src/utils/consent.ts`、`src/App.vue`、`src/store/user.ts` | 同意版本 `2026-11-24`；同意前不调用登录云函数；扫码直达页先显示告知，再回到目标页。 |
| `src/api/` | Mock/Cloud 适配层；`adapter.ts` 集中调用云函数。正式模式由 `.env.local` 决定。 |
| `cloudfunctions/`、`cloudbaserc.json` | 18 个 Node.js 云函数及云开发配置；修改源码后须单独部署相应函数。 |
| `cloudfunctions/configManage/base.json` | 17 个乡镇、六个便民分类和商家品类的默认配置；`infoManage`、`merchantManage` 各有同一份 `base.json`，三份须同步。 |
| `src/constants/homeBanners.ts`、`adContact.ts` | 首页广告招商内容及商务微信/电话 `17683944469`。付费广告应标记 `isPaid`。 |
| `src/constants/legal.json` | 运营主体、隐私与帮助电话。两个电话均经用户确认用 `17683944469`；主体名称不可猜填。 |
| `scripts/check-release.mjs` | 本地上架门禁，当前因主体名称空而故意失败。 |
| `dist/build/mp-weixin/` | **构建产物与微信开发者工具项目目录**，包含生成的 `project.config.json`；不要在这里改业务源码。项目根目录没有 `project.config.json`。 |

角色与入口：居民从首页和“我的”浏览、发布、领券；店主从“我的 → 商家工作台”管理店铺、券、合作；员工用邀请码绑定门店后，仅使用被授予的核销/预约权限；管理员从“我的 → 运营管理台”审核、处理举报和配置。**页面直达码不赋予角色权限。**

主要业务链：顾客扫 A 店福利码 → `App.vue` 解析 `scene` 短 token → `scanResolve` 解析可信门店并记录去重扫码 → `getShopBenefitData` 返回 A 店券与经双方确认的 B/C 券 → `couponClaim` 领券并保留来源 → 券包/预约 → 对应门店员工用 `couponVerify` 核销 → `cooperationManage` 双方确认结果和线下账单。没有线上支付、自动分润或提现；招聘分类仍未开放。

近期产品决定：用户提供过同城小程序首页截图作为视觉参考，顶部黄底漫画招商横幅已做成自有素材；首页六个便民分类中“绿松石名片”已换成“转让/合作”。用户指出重复入口后，首页只留便民分类、商圈联盟卡和红色发布卡；逛店、券包分别走底部导航，“我的发布”用于管理已有内容。用户曾提议 AI 搜索，随后明确暂缓，当前上线前不要自行加回。例行开发和已授权部署用户希望 agent 直接推进；管理员扫码、实名备案和短信核验等本人操作仍须由用户完成。

## 3. 本机可重复的开发流程

本机已见 Node.js `v24.18.0`、pnpm `9.15.9`、Python `3.12.10`、Git `2.55.0.windows.3`。依赖在 `pnpm-lock.yaml` 中，换机器以锁文件和实际构建结果为准。

```powershell
Set-Location -LiteralPath 'D:\Ai movies\zhushan-city'
pnpm install
pnpm exec tsc --noEmit
pnpm run test:cloud
pnpm run build:mp-weixin
pnpm run check:release
```

`check:release` 目前应报告约 **1.17 MiB** 构建文件、主体名称缺失以及订阅消息模板提醒；返回非零是当前上架阻断的证据。DCloud 构建可能提示顶层 AppID 未配置、uni 统计不可用；微信 AppID 位于 `manifest.json` 的 `mp-weixin.appid`，以 `dist/build/mp-weixin/project.config.json` 和开发者工具导入结果核对，不要为了消除统计提示随意改成别的 AppID。

本机演示数据的安全切换方式是在**单次 PowerShell 进程**临时设置环境变量后构建：

```powershell
$env:VITE_USE_MOCK = 'true'
pnpm run build:mp-weixin
```

完成演示后在普通终端重新运行 `pnpm run build:mp-weixin`，并检查 `dist/build/mp-weixin/api/adapter.js` 为 `exports.USE_MOCK=!1`，再生成正式云环境预览码。不要把 Mock 包上传为体验版。模拟数据保存在小程序本机 `zhushan_mock_core_v1`；首次协议同意记录在 `zhushan_service_consent_v1`。调试首次进入时仅清除后一个键，不要无差别清空存储。

开发新功能的顺序：读 PRD 与相关 `src/pages` / `src/api` / `cloudfunctions` → 改源码与云函数 → `tsc`、相关云函数测试、构建 → 模拟器页面与关键操作 → 正式云环境只读验证 → 如确需云写，确认 AppID、env 和现有记录后部署 → 真机跨角色回归 → 再考虑上传与审核。`dist/` 每次构建会重生成。

## 4. 微信开发者工具：CLI 已验证的入口

本机微信开发者工具 CLI：`D:\微信web开发者工具\wechatide.cmd`，技能版本 `0.3.18`。2026-11-24 用 `-c codex` 检查为 `versionRelation: equal`、`loginExpired: false`、`cliTokenRequired: false`。**Antigravity 应改用自己的 `-c antigravity`，首次可能弹出客户端授权；不要沿用 Codex 的客户端身份。**

```powershell
$wechatideCli = 'D:\微信web开发者工具\wechatide.cmd'
$miniProject = 'D:\Ai movies\zhushan-city\dist\build\mp-weixin'
$miniAppId = 'wx159a3c0644c4f176'
$miniEnv = 'supporting-vulture-d4cgj6b9b7a15'

& $wechatideCli -c antigravity check_wechatide_status --skill-version 0.3.18
& $wechatideCli -c antigravity cloud_env_list --appid $miniAppId
& $wechatideCli -c antigravity open_project_window --project $miniProject --window-mode fullMode
```

第一次授权若返回 `pending` 与 `taskId`，在开发者工具完成客户端授权，再用 `polling_task_result --task-id <原 taskId>` 查结果；**不要把“已发起”当成功，也不要重新发起同一写操作**。后续工具参数用 `& $wechatideCli <tool> --help` 查，路径用绝对路径。CLI 目前无需令牌，但 MCP 另有 Token 要求。

### 4.1 页面调试的完整循环

```powershell
# 先让模拟器打开页面；实际顶层页面以 pageStack 再核对。
& $wechatideCli -c antigravity simulator_open_page --project $miniProject --page pages/index/index
& $wechatideCli -c antigravity automation_runtime_info --project $miniProject --action pageStack

# 原生 tabBar 页面用 switchTab；普通页面用 navigateTo / redirectTo。
& $wechatideCli -c antigravity automation_navigate --project $miniProject --action switchTab --url /pages/coupon/mine
& $wechatideCli -c antigravity automation_runtime_info --project $miniProject --action currentPage
& $wechatideCli -c antigravity automation_element_action --project $miniProject --action text --selector .empty-wrap

& $wechatideCli -c antigravity automation_navigate --project $miniProject --action switchTab --url /pages/merchant/list
& $wechatideCli -c antigravity automation_element_action --project $miniProject --action text --selector .list-heading

# 页面节点/按钮先查再点；截图统一用 simulator_screenshot。
& $wechatideCli -c antigravity automation_page_action --project $miniProject --action querySelectorAll --selector .feature-publish
& $wechatideCli -c antigravity automation_element_action --project $miniProject --action tap --selector .feature-publish
& $wechatideCli -c antigravity simulator_screenshot --project $miniProject --path 'D:\Ai movies\outputs\antigravity-page.jpg'

# 出错时对照当前页、console 和 network。
& $wechatideCli -c antigravity get_simulator_console --project $miniProject --command 'grep -i error'
& $wechatideCli -c antigravity get_simulator_network --project $miniProject --command 'grep -i error'
```

`simulator_open_page` 返回 success 仍可能短暂处于启动页，先用 `pageStack/currentPage` 核实；不要同时对同一个模拟器发多个自动化点击。前次实际测试中并行的 `automation_page_action` 曾出现 automator timeout，改为串行即可。若构建后仍看到旧画面，先清**编译缓存**与**项目文件列表缓存**，再关/开项目窗口；不要为刷新界面清除存储：

```powershell
& $wechatideCli -c antigravity debug_clear_cache --project $miniProject --action cleanCompileCache
& $wechatideCli -c antigravity debug_clear_cache --project $miniProject --action cleanProjectFileListCache
& $wechatideCli -c antigravity close_project_window --project $miniProject
& $wechatideCli -c antigravity open_project_window --project $miniProject --window-mode fullMode
```

### 4.2 云端读写与异步确认

```powershell
& $wechatideCli -c antigravity cloud_fn_list --appid $miniAppId --env $miniEnv
& $wechatideCli -c antigravity cloud_fn_info --appid $miniAppId --env $miniEnv --names login,infoManage,merchantManage
& $wechatideCli -c antigravity cloud_db_read_struct --appid $miniAppId --env $miniEnv --action listCollections --limit 100

# 只有在本地测试和读回确认后，才增量部署目标函数的具体文件。
& $wechatideCli -c antigravity cloud_fn_inc_deploy --appid $miniAppId --env $miniEnv --path 'D:\Ai movies\zhushan-city\cloudfunctions\infoManage' --file index.js
& $wechatideCli -c antigravity polling_task_result --task-id '<上一步返回的 taskId>'
```

云函数、数据库、存储的写操作可能返回 `pending`；记录原任务 ID、环境和动作，在开发者工具完成确认后**先查原任务结果**，不要重复部署或写库。复杂查询/更新 JSON 优先写到本地临时文件，传 `--query-file`、`--update-file` 的**绝对路径**；相对文件路径会被 CLI 从微信开发者工具安装目录解析。生产环境里目前仍有历史测试记录，不可把集合非空等同于真实公开供给；读写前按状态筛选并核对目标记录。

### 4.3 预览码与手机测试

```powershell
# 预览可直接推送到开发者微信；指定页面可用 --page-path。
& $wechatideCli -c antigravity auto_preview --project $miniProject --page-path pages/index/index

# 要扫码图时可窗口展示；如需保存为图片，二维码命令会输出很大的 Buffer，请重定向命令输出并检查目标文件。
& $wechatideCli -c antigravity create_preview_qrcode --project $miniProject --qr-format window --page-path pages/index/index

# 当前发布门禁未通过，不把预览等同于体验版上传或正式发布。
```

旧预览码可能对应旧构建；每次重要前端改动后重建并生成新码。页面直达码不会授权店主或管理员身份。`upload` 属于发布体验版操作，只有用户明确要求并完成上架前检查后再做；上传后仍需公众平台版本审核与发布。

## 5. Antigravity 接入本机 WeChatIDE MCP

**当前已验证的是 `wechatide -c` CLI，不是 Antigravity 中的 MCP 连接。** 本机 `wechatide mcp` 在未提供 MCP Token 时提示缺少 Token；`check_wechatide_status` 显示 `mcpTokenRequired: true`、`cliTokenRequired: false`。两种 Token 不通用，交接文件和仓库内不存 Token。

1. 在微信开发者工具打开 **设置 → 安全**，复制工具提供的完整 **MCP 配置**（含当前有效的 MCP Token）。不要从本地安装目录猜或翻找 Token。
2. 在 Antigravity 的 Agent 面板打开 **MCP Servers → Manage MCP Servers → View raw config**；独立 Antigravity 2.0 也可在 **Settings → Customizations → Installed MCP Servers → Open MCP Config** 打开配置。将微信开发者工具给出的服务项合并到现有 `mcpServers`，不要覆盖其他服务。Google 官方文档给出的全局配置位置为 `%USERPROFILE%\.gemini\config\mcp_config.json`；具体字段以开发者工具复制的配置为准。
3. 重新加载 Antigravity 的 MCP 服务，先调用只读的 `check_wechatide_status` / `cloud_env_list`；核对 AppID、env、项目路径，再按上面的“页面调试循环”调用同名工具。若 MCP 提示 `mcp_token_required` / `mcp_token_invalid`，回到开发者工具重新复制配置。
4. 如果 Antigravity MCP 暂时未连上，直接用上节**已经验证的 CLI**继续开发和调试，不要把连接问题当成业务代码失败。

### 5.1 MCP 连上后的逐步调试顺序

Antigravity 应从 MCP 工具 schema 读取参数名，不把 CLI 的旗标直接当成 MCP JSON 字段。每一步都检查工具返回的 `success`、当前页面和实际画面：

1. `check_wechatide_status`：核对技能版本、登录态与客户端授权；`cloud_env_list`：核对唯一正式环境。
2. `open_project_window`：项目传 `D:\Ai movies\zhushan-city\dist\build\mp-weixin`，按需要选择完整窗口。
3. `simulator_open_page` 打开目标页，再用 `automation_runtime_info(pageStack/currentPage)` 核对顶层路由。启动阶段页面可能短暂是欢迎页。
4. `automation_page_action(querySelectorAll)` 找稳定选择器；`automation_element_action(text/outerWxml)` 读内容；`automation_element_action(tap/input)` 执行用户动作。底部原生 Tab 用 `automation_navigate(switchTab)`。
5. `simulator_screenshot` 留证；若结果不符，再读 `get_simulator_console` 与 `get_simulator_network`（`command` 用 `grep -i error` 等 grep 语句），按当前页和报错定位源码。
6. 涉及云端时，先 `cloud_fn_info` 或 `cloud_db_read_struct` / `cloud_db_read_doc` 只读核对，再考虑部署或写入。`pending` 必须保存 `taskId`，确认后用 `polling_task_result` 查原任务，不重发。

示例验收“券包与逛店是否重合”：对 `pages/coupon/mine` 和 `pages/merchant/list` 各调用一次 `switchTab`、`currentPage`、页面文本及截图；预期分别是“我的卡券包/暂无相关卡券”和“本地商家/为你找到 N 家好店”。这两个 Tab 的路由不同，券包空状态中此前误导性的“逛逛好店”二次跳转已删除。

本机安装的技能说明可由 Antigravity 直接阅读：`C:\Users\1\.codex\skills\wechatide-skill\SKILL.md`（及 `skills/automator`、`skills/debugger`、`skills/cloudbase-operator`、`skills/previewer` 子目录）。Antigravity 未必会自动加载 Codex 的技能目录，需要显式让它阅读。微信**开放文档 MCP** `https://developers.weixin.qq.com/doc/mcp` 是另一项只读文档服务，不是本机 `wechatide mcp`。

Antigravity 配置入口参考：[Google Antigravity MCP 官方说明](https://antigravity.google/docs/mcp?tab=ide)、[Google Developers 的 Antigravity 配置示例](https://developers.google.com/knowledge/mcp?tab=google-antigravity)。

## 6. 当前测试证据与已知问题

| 项目 | 现状 |
| --- | --- |
| TypeScript / 构建 / 云函数隔离测试 | `tsc --noEmit`、`build:mp-weixin` 通过；`test:cloud` 17/17 通过。 |
| UI | 原 27 页在 Mock 与 Cloud 两种构建中逐页冒烟；后增联盟、欢迎、协议三页并定向验证。详情见 [全页面测试](UI_QA_2026-11-24.md)，机器记录见 `artifacts/release/ui-page-smoke-2026-11-24.json`。 |
| 首次使用 | 未勾选时登录按钮禁用；拒绝后本机无同意记录；服务协议/隐私说明可打开；同意后才调用登录并进入目标页面。已同意用户重开直达首页。微信平台原生隐私授权的 `needAuthorization=true` 分支尚待平台指引配置及真机测试。 |
| 底部导航 | “券包”是 `pages/coupon/mine`，“逛店”是 `pages/merchant/list`。原空券包跳逛店的按钮已移除。正式环境当前显示 0 张可用券/0 家已审核店。 |
| 商圈联盟 | 首页可见玩法入口；实际福利只在参与门店码落地页显示。本店券、合作店券、来源归因、预约/核销的核心状态机已有隔离测试，但真实门店与手机扫码仍待验。 |
| 已修问题 | 空券包卡片标题、租房搜索词、停用门店券/预约权限提示、重复首页入口等已修并定向回测。 |

正式环境中不能用 Mock 内容冒充真实商家或可兑券。预览二维码在 `D:\Ai movies\outputs\`，仅作历史证据；改动后应重新生成，不要把旧二维码当作当前构建。云端环境真实权限、图片私有访问和角色隔离须用不同微信身份继续测试。

## 7. 优先级明确的后续工作

1. **等基础信息审核结果并复核**：正式名“竹山街坊汇”、简称“街坊汇”、头像、简介已提交，当前仍是“审核中”；若被驳回，按平台原因修正。公众平台请从 `https://mp.weixin.qq.com/` 正常登录，不要复用交接材料里的旧会话 URL 或 token。
2. **补运营主体与隐私**：审核通过后在后台核对注册主体，填写 `src/constants/legal.json` 的 `operatorName`，请用户确认服务协议草稿；在公众平台配置相匹配的《小程序用户隐私保护指引》，覆盖实际使用的微信身份、图片选择/上传、剪贴板等信息类型，再测原生隐私授权分支。参考 [微信官方隐私授权指引](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)。
3. **备案**：按[微信备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record/guidelines.html)准备与主体匹配的证件和负责人核验；平台初审后注意 `12381` 短信核验。验证码、身份证件与签署承诺应由本人按平台流程处理，不放进仓库。
4. **拿到真实供给后做真机验收**：至少一间已同意测试的真实门店，以及店主/员工/普通居民等不同微信身份；验证申请→审核→建券→扫码→领券→预约→到店核销→双方合作确认与对账，并核对私有资质图片访问。用户目前确认暂无测试门店和其他微信号，此项未完成。
5. **发布**：`check:release` 及人工清单通过后，生成最新预览码、上传体验版、提交版本审核，审核通过后由有权限账号正式发布。微信认证目前未完成，公众平台提示它不阻断版本发布，但会影响被搜索/被分享能力。

## 8. 可直接给 Antigravity 的开场指令

> 打开本机 `D:\Ai movies\zhushan-city`，先读 `docs/ANTIGRAVITY_HANDOFF_2026-11-24.md`、`docs/RELEASE_AUDIT_2026-11-24.md` 和 `docs/UI_QA_2026-11-24.md`。这是未提交工作区，勿从 GitHub 克隆后覆盖本地，也勿清理现有改动。先运行 `git status --short`、`pnpm exec tsc --noEmit`、`pnpm run test:cloud`、`pnpm run build:mp-weixin`、`pnpm run check:release`，核对 AppID/云环境。微信开发者工具项目是 `dist/build/mp-weixin`；优先用已验证的 `D:\微信web开发者工具\wechatide.cmd` CLI 调试，如需 MCP，按交接文档从开发者工具「设置 → 安全」复制配置到 Antigravity。继续处理名称审核、主体/隐私、备案和真实跨账号验收，不把模拟器冒烟结果说成已上架。
