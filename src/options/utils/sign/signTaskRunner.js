/**
 * 签到流程
 */

import {createSignTab, closeTabSafe} from "../tab/tabManager.js";
import browser from "webextension-polyfill";
import {sleep} from "../index.js";
import {getSignStrategy} from "./signStrategies/index.js";

/**
 * 宽松的页面加载等待
 * 只要 document.readyState 变为 interactive 或 complete 即可
 * 避免因静态资源（图片、统计脚本）加载超时导致任务失败
 */
async function waitForPageInteractive(tabId, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const results = await chrome.scripting.executeScript({
                target: {tabId},
                func: () => document.readyState
            });
            const state = results[0]?.result;
            // 只要 DOM 结构出来了就可以，不需要等所有资源加载完
            if (state === 'interactive' || state === 'complete') {
                return;
            }
        } catch (err) {
            // 忽略临时错误（如 tab 还没建立好连接），稍后重试
        }
        await new Promise(r => setTimeout(r, 500));
    }
    console.warn(`[Tab ${tabId}] 等待页面 Interactive 超时，尝试强行执行脚本...`);
}

/**
 * 等待CF盾或者雷池的全屏盾
 */

async function waitForVerifyPage(tabId, timeout = 20000) {
    const startTime = Date.now();
    console.log(`[Tab ${tabId}] 开始检测并等待安全盾...`);

    while (Date.now() - startTime < timeout) {
        try {
            // 检查 Tab 是否还存在
            await browser.tabs.get(tabId);

            const results = await chrome.scripting.executeScript({
                target: {tabId},
                func: () => {
                    const text = document.body.innerText;
                    const title = document.title;
                    const keywords = [
                        "Just a moment",
                        "Cloudflare",
                        "验证您是真人",
                        "正在进行安全检测",
                        "雷池 WAF",
                        "验证程序加载",
                        "耐心等待",
                        "正在验证",
                        "验证中",
                        "Checking your browser"
                    ];
                    // 同时检查标题和正文，提高准确率
                    const bodyHas = keywords.some(k => text.includes(k));
                    const titleHas = keywords.some(k => title.includes(k));
                    return bodyHas || titleHas;
                }
            });

            const isShieldPresent = results[0]?.result;

            if (isShieldPresent) {
                console.log(`[Tab ${tabId}] 检测到盾，等待 1s...`);
                await sleep(1000);
            } else {
                console.log(`[Tab ${tabId}] 盾已消失（或未检测到），准备通过。`);
                return true;
            }

        } catch (err) {
            console.warn(`[Tab ${tabId}] 检测盾状态时出错 (可能是页面跳转中):`, err.message);
            await sleep(1000);
        }
    }

    console.warn(`[Tab ${tabId}] 等待盾消失超时 (${timeout}ms)，尝试强行执行...`);
    return false;
}

async function runSignScript(tabId, siteInfo) {
    const strategy = getSignStrategy(siteInfo.siteType);
    if (!strategy) {
        console.warn(`[${siteInfo.name} 签到流程] 未找到策略：${siteInfo.siteType}`);
        return {sign: false};
    }
    try {
        await sleep(1000);
        const results = await chrome.scripting.executeScript({
            target: {tabId},
            func: strategy,
        });

        const result = results[0]?.result ?? {sign: false};
        console.log(`[${siteInfo.name} 签到流程] 执行结果：`, result);

        if (result.pending) {
            console.log(`[${siteInfo.name} 签到流程] 操作已触发，等待页面刷新后重试`);
            return {sign: false, pending: true};
        }

        return result;
    } catch (err) {
        console.error(`[${siteInfo.name}签到流程] 执行失败：`, err);
        return {sign: false};
    }
}

/**
 * 执行签到流程
 * @param siteInfo
 */
export async function handleSignTask(siteInfo) {
    let opts = siteInfo.active ? {active: true} : {active: false, pinned: true};
    const tab = await createSignTab(siteInfo.site, opts);

    try {
        console.log(`[${siteInfo.name} 签到流程] 开始 ${siteInfo.name}`);
        await waitForPageInteractive(tab.id);
        if (!siteInfo.notVerifyPage) {
            await waitForVerifyPage(tab.id);
        }
        let result = await runSignScript(tab.id, siteInfo);

        // 例如U2这种提交页面后刷新页面的情况
        if (result.pending) {
            console.log(`[${siteInfo.name}] 检测到 Pending 状态，等待页面刷新...`);
            await waitForPageInteractive(tab.id);
            if (!siteInfo.notVerifyPage) {
                await waitForVerifyPage(tab.id);
            }
            result = await runSignScript(tab.id, siteInfo);
        }
        return result;
    } catch (err) {
        console.error(`[${siteInfo.name} 签到流程] 异常：`, err);
        return {sign: false, msg: err.message};
    } finally {
        // await closeTabSafe(tab.id);
    }
}