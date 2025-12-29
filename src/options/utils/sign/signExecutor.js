/**
 * 注入执行代码
 */

import {getSignStrategy} from "./signStrategies/index.js";

export async function runSignScript(tabId, siteInfo) {
    const strategy = getSignStrategy(siteInfo.siteType);

    if (!strategy) {
        console.warn(`[签到流程] 未找到策略：${siteInfo.siteType}`);
        return {sign: false};
    }

    try {
        const results = await chrome.scripting.executeScript({
            target: {tabId},
            func: strategy,
        });
        let result = results[0]?.result ?? {sign: false};
        console.log(`[签到流程] 签到完毕：`, result)
        return result;
    } catch (err) {
        console.error(`[签到流程] 执行失败：`, err);
        return {sign: false};
    }
}
