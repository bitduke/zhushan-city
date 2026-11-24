import base from '../../cloudfunctions/configManage/base.json';

// 9 镇 8 乡的默认配置；运营端可以停用选项。上线前核对最新区划。
export const ZHUSHAN_TOWNS = [{ id: 'all', name: '全竹山', code: '' }, ...base.towns.map(item => ({ id: item.id, name: item.name, code: item.code }))];
export const DEFAULT_TOWN = '城关镇';
