import {storage} from './index';

const STORAGE_KEY = 'site_data';

export async function getSiteData() {
    return storage.get(STORAGE_KEY, []);
}

export async function setSiteData(value) {
    await storage.set(STORAGE_KEY, value);
}

export async function removeSite(siteInfo) {
    let list = await storage.listRemove(STORAGE_KEY, item => item.name === siteInfo.name)
    console.log(`[站点信息] 站点列表更新成功:`, list);
}

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