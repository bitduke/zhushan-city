const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');
const defaults = require('./base.json');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const uuid = () => crypto.randomUUID().replace(/-/g, '');
const sections = ['towns', 'infoCategories', 'merchantCategories'];

async function admin(reader, openid) {
  const user = (await reader.collection('user').doc(`user_${hash(openid)}`).get()).data;
  return !!user && user.status === 'ACTIVE' && user.role === 'ADMIN';
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, message: '无法确认微信身份' };
  try {
    if (event.action === 'list' || event.action === 'adminList') {
      if (event.action === 'adminList' && !(await admin(db, openid))) return { success: false, message: '无管理员权限' };
      const entries = await Promise.all(sections.map(async section => {
        const result = await db.collection('app_config').doc(section).get();
        const list = result.data?.items || defaults[section];
        return [section, event.action === 'list' ? list.filter(item => item.active) : list];
      }));
      return { success: true, config: Object.fromEntries(entries) };
    }
    if (event.action === 'setActive') {
      const section = String(event.section || '');
      const id = String(event.id || '');
      const active = event.active === true;
      if (!sections.includes(section)) return { success: false, message: '配置类型无效' };
      const result = await db.runTransaction(async transaction => {
        if (!(await admin(transaction, openid))) return { success: false, message: '无管理员权限' };
        const stored = (await transaction.collection('app_config').doc(section).get()).data;
        const items = JSON.parse(JSON.stringify(stored?.items || defaults[section]));
        const item = items.find(entry => entry.id === id);
        if (!item) return { success: false, message: '配置项不存在' };
        if (!active && items.filter(entry => entry.active).length <= 1) return { success: false, message: '至少保留一项可用' };
        item.active = active;
        await transaction.collection('app_config').doc(section).set({ data: { items, updated_at: new Date().toISOString() } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'CONFIG', target_id: `${section}:${id}`, actor_id: hash(openid), action: active ? 'CONFIG_ENABLE' : 'CONFIG_DISABLE', reason: '管理员调整可用范围', created_at: new Date().toISOString() } });
        return { success: true, config: items };
      });
      return result;
    }
    return { success: false, message: '操作无效' };
  } catch (error) {
    console.error('[configManage] failed', { message: error.message });
    return { success: false, message: '配置服务暂不可用' };
  }
};
