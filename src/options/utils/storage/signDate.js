import { storage } from './index';

const STORAGE_KEY = 'site_sign_records';

/**
 * 记录签到日期
 * @param {string} siteKey - 站点名称，比如 'M-Team'
 * @param {string} dateStr - 日期字符串，比如 '2025-12-01'
 */
export async function addSignDate(siteKey, dateStr) {
    const list = await storage.listUpsert(
        STORAGE_KEY,
        item => item.key === siteKey,
        () => ({
            key: siteKey,
            dates: [dateStr],
            lastUpdate: Date.now()
        }),
        old => ({
            ...old,
            dates: old.dates.includes(dateStr)
                ? old.dates
                : [...old.dates, dateStr],
            lastUpdate: Date.now()
        })
    );
    console.log(`签到记录更新成功`, list);
}
