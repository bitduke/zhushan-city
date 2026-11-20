const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || 'anonymous';
  const { token, sourceMerchantId } = event;

  if (!token) {
    return { success: false, message: 'Missing token' };
  }

  // 记录扫码日志
  await db.collection('scan_log').add({
    data: {
      token,
      source_merchant_id: sourceMerchantId || '',
      openid,
      created_at: new Date()
    }
  });

  return {
    success: true,
    token,
    source_merchant_id: sourceMerchantId
  };
};
