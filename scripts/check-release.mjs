import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const errors = [];
const warnings = [];

const manifest = readJson('manifest.json');
const sourceManifest = readJson('src/manifest.json');
const pages = readJson('src/pages.json');
const legal = readJson('src/constants/legal.json');
const cloudConfig = readJson('cloudbaserc.json');
const envText = fs.existsSync(path.join(root, '.env.local'))
  ? fs.readFileSync(path.join(root, '.env.local'), 'utf8') : '';
const envValue = name => {
  const line = envText.split(/\r?\n/).find(item => item.trim().startsWith(`${name}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
};
const mini = manifest['mp-weixin'] || {};
const sourceMini = sourceManifest['mp-weixin'] || {};
const pagePaths = new Set((pages.pages || []).map(item => item.path));

if (!/^wx[a-f0-9]{16}$/.test(mini.appid || '')) errors.push('正式 AppID 未正确配置');
if (mini.appid !== sourceMini.appid) errors.push('根目录与 src 的 AppID 不一致');
if (manifest.name !== sourceManifest.name || manifest.description !== sourceManifest.description) errors.push('根目录与 src 的小程序名称或简介不一致');
if (envValue('VITE_USE_MOCK') !== 'false') errors.push('正式构建仍启用本地 Mock');
if (!envValue('VITE_CLOUDBASE_ENV_ID')) errors.push('未配置正式小程序云环境 ID');
if (envValue('VITE_CLOUDBASE_ENV_ID') !== cloudConfig.envId) errors.push('前端云环境与 cloudbaserc 不一致');
if (mini.setting?.urlCheck !== true || sourceMini.setting?.urlCheck !== true) errors.push('开发者工具域名校验尚未开启');
if (mini.requiredPrivateInfos?.includes('getLocation') || sourceMini.requiredPrivateInfos?.includes('getLocation')) errors.push('声明了当前版本未使用的定位权限');
if (pages.pages?.[0]?.path !== 'pages/welcome/index') errors.push('首次进入服务告知页不是小程序首屏');
for (const required of ['pages/welcome/index', 'pages/help/terms', 'pages/help/privacy', 'pages/help/contact', 'pages/business/advertise', 'pages/benefit/alliance']) {
  if (!pagePaths.has(required)) errors.push(`缺少页面路由 ${required}`);
}
if (!legal.operatorName.trim()) errors.push('隐私说明缺少微信公众平台认证主体名称');
if (!/^1[3-9]\d{9}$/.test(legal.privacyPhone)) errors.push('隐私联系号码未配置或格式不正确');
if (!/^1[3-9]\d{9}$/.test(legal.supportPhone)) errors.push('用户帮助电话未配置或格式不正确');

const subscribeSource = fs.readFileSync(path.join(root, 'src/utils/subscribe.ts'), 'utf8');
if (subscribeSource.includes('TMPL_APPOINTMENT_CONFIRM_ID')) warnings.push('预约确认订阅消息未接入；当前须从券包查看预约状态');
if (subscribeSource.includes('TMPL_COUPON_EXPIRING_ID')) warnings.push('卡券到期提醒模板尚未配置；此功能未进入当前主要流程');

const output = path.join(root, 'dist/build/mp-weixin');
if (!fs.existsSync(path.join(output, 'app.json'))) errors.push('微信小程序编译产物不存在');
else {
  let bytes = 0;
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (directory === output && entry.name === 'cloudfunctions') continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else bytes += fs.statSync(target).size;
    }
  };
  visit(output);
  if (bytes > 2 * 1024 * 1024) errors.push(`小程序主包超出 2 MiB：${bytes} 字节`);
  else console.log(`小程序构建文件（不含云函数）：${(bytes / 1024 / 1024).toFixed(2)} MiB`);
}

const manualGates = [
  '公众平台：核对认证主体、备案、服务类目和用户隐私保护指引',
  '真机：用居民、店主、员工、管理员四种独立身份做扫码与权限验收',
  '运营：确认首批真实商家、可用券、审核值班与投诉处理方式',
  '提交：上传体验版、填写审核说明，通过微信审核后再发布'
];
console.log(`本地上架门禁：${errors.length ? '未通过' : '通过'}`);
errors.forEach(item => console.log(`阻断：${item}`));
warnings.forEach(item => console.log(`提醒：${item}`));
manualGates.forEach(item => console.log(`待核对：${item}`));
if (errors.length) process.exitCode = 1;
