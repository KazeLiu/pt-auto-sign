/**
 * 签到流程
 */

import {createSignTab, closeTabSafe} from "../tab/tabManager.js";
import {waitUntilPageReady} from "../tab/throughShield.js";
import {runSignScript} from "./signExecutor.js";

export async function handleSignTask(siteInfo) {
    let opts = siteInfo.active ? {active: true} : {active: false, pinned: true};
    const tab = await createSignTab(siteInfo.site, opts);

    try {
        console.log(`[${siteInfo.name} 签到流程] 开始 ${siteInfo.name}`);
        if (!siteInfo.notVerifyPage) {
            await waitUntilPageReady(tab.id);
        }
        let result = await runSignScript(tab.id, siteInfo);
        if (result.pending) {
            // 页面即将刷新，等刷新后再来一次
            if (!siteInfo.notVerifyPage) {
                await waitUntilPageReady(tab.id);
            }
            result = await runSignScript(tab.id, siteInfo);
        }
        return result;
    } catch (err) {
        console.error(`[${siteInfo.name} 签到流程] 异常：`, err);
        return {sign: false, msg: err.message};
    } finally {
        await closeTabSafe(tab.id);
    }
}
