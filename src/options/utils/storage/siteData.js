import {storage} from './index';

const STORAGE_KEY = 'site_data';

/**
 * 获取全部站点配置数据。
 *
 * @returns {Promise<Array>} 站点配置列表。
 */
export async function getSiteData() {
    return storage.get(STORAGE_KEY, []);
}

/**
 * 覆盖保存全部站点配置数据。
 *
 * @param {Array} value - 完整站点列表。
 * @returns {Promise<void>}
 */
export async function setSiteData(value) {
    await storage.set(STORAGE_KEY, value);
}

/**
 * 根据站点名称移除站点配置。
 *
 * @param {{name: string}} siteInfo - 至少包含站点名称的站点对象。
 * @returns {Promise<void>}
 */
export async function removeSite(siteInfo) {
    let list = await storage.listRemove(STORAGE_KEY, item => item.name === siteInfo.name)
    console.log(`[站点信息] 站点列表更新成功:`, list);
}

/**
 * 插入新站点或更新已有站点配置。
 *
 * 新增时写入 `createdAt`，更新时刷新 `updatedAt`。
 *
 * @param {Object} siteInfo - 站点配置对象。
 * @returns {Promise<void>}
 */
export async function upsertSite(siteInfo) {
    const list = await storage.listUpsert(
        STORAGE_KEY,
        item => item.name === siteInfo.name,
        () => ({
            ...siteInfo,
            createdAt: Date.now()
        }),
        old => ({
            ...old,
            ...siteInfo,
            updatedAt: Date.now()
        })
    );

    console.log(`[站点信息] 站点已 upsert 成功`, list);
}
