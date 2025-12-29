/**
 * 签到流程
 */

import browser from "webextension-polyfill";
import { createSignTab, closeTabSafe } from "../tab/tabManager.js";
import { waitUntilPageReady } from "../tab/throughShield.js";
import { runSignScript } from "./signExecutor.js";

export async function handleSignTask(siteInfo) {
    const tab = await createSignTab(siteInfo.targetUrl);

    try {
        console.log(`[签到流程] 开始 ${siteInfo.name}`);
        await waitUntilPageReady(tab.id);
        return await runSignScript(tab.id, siteInfo);
    } catch (err) {
        console.error("[签到流程] 异常：", err);
        return { sign: false, msg: err.message };
    } finally {
        await closeTabSafe(tab.id);
    }
}
