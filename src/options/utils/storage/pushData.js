import {storage} from './index';

/**
 * 记录iyuu推送信息
 * @param {string} id - iyuuId
 */
export async function setIyuuKey(id) {
    await storage.set(`iyuu_data_key`, id);
    console.log(`[推送模块] IyuuId更新成功:`, id);
}

/**
 * 获取iyuu推送信息
 */
export async function getIyuuKey() {
    let id = await storage.get(`iyuu_data_key`);
    console.log(`[推送模块] IyuuId获取成功:`, id);
    return id || null;
}