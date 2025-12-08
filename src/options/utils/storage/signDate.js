import {storage} from './index';

const STORAGE_KEY = 'site_sign_records';

/**
 * 记录签到日期
 * @param {string} siteKey - 站点名称，比如 'HaiDan'
 * @param {string} dateStr - 日期字符串，比如 '2025-12-08'
 */
export async function addSignDate(siteKey, dateStr) {
    const records = await storage.get(STORAGE_KEY, []);
    let siteRecord = records.find(item => item.key === siteKey);
    if (siteRecord) {
        if (!siteRecord.dates.includes(dateStr)) {
            siteRecord.dates.push(dateStr);
            siteRecord.lastUpdate = Date.now();
        } else {
            return;
        }
    } else {
        siteRecord = {
            key: siteKey,
            dates: [dateStr],
            lastUpdate: Date.now()
        };
        records.push(siteRecord);
    }
    await storage.set(STORAGE_KEY, records);
    console.log(`[${siteKey}] 签到记录更新成功:`, siteRecord);
}