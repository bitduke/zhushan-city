const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '未获取到 openid' };
  }

  // 查或建用户
  const userCol = db.collection('user');
  const userRes = await userCol.where({ openid }).get();

  let user = null;
  if (userRes.data.length === 0) {
    const addRes = await userCol.add({
      data: {
        openid,
        nickname: event.nickname || '竹山居民',
        avatar: event.avatar || '',
        town: event.town || '城关镇',
        created_at: new Date()
      }
    });
    user = { _id: addRes._id, openid };
  } else {
    user = userRes.data[0];
  }

  return {
    success: true,
    user
  };
};
