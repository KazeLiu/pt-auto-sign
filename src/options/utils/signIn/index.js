import browser from "webextension-polyfill";
import {haidanMain} from "./haidan.js";
import {btSchoolMain} from "./btSchool.js";
import {nexusMain} from "./nexusPHP.js";
import {ttgMain} from "./ttg.js";
import {hanhanMain} from "./hanhan.js";
import {u2Main} from "./u2.js";

// 测试开关：设置为 true 可开启“刷新保持注入”测试
const ENABLE_REFRESH_TEST = false;

// 接受签到任务
export async function handleSignTask(siteInfo) {
    const tab = await browser.tabs.create({url: siteInfo.targetUrl, active: true});

    // 🧪 如果开启了测试模式，启动持久化监听
    if (ENABLE_REFRESH_TEST) {
        startRefreshTest(tab.id);
    }

    try {
        // 等待页面加载，并智能跳过 Cloudflare 验证页
        await waitForRealContent(tab.id);
        // 继续执行签到逻辑
        let result = await checkSign(tab.id, siteInfo);
        await browser.tabs.remove(tab.id);
        return result;
    } catch (error) {
        console.error("[签到流程] 签到流程异常:", error);
        return {sign: false, msg: error.message};
    }
}

/**
 * 测试专用函数：验证 Tab ID 在刷新后是否改变，以及是否能持续注入代码
 */
function startRefreshTest(tabId) {
    console.log(`[Test Mode] 已启动刷新监控，目标 Tab ID: ${tabId}`);

    const testListener = async (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
            console.log(`[Test Mode] 检测到 Tab ${tabId} 加载完成/刷新，正在尝试注入测试代码...`);

            try {
                await chrome.scripting.executeScript({
                    target: {tabId},
                    func: (tId) => {
                        // 这段代码会在页面控制台执行
                        console.group("%c🧪 刷新测试 (Refresh Test)", "color: #ff007f; font-size: 14px;");
                        console.log(`%c当前时间: ${new Date().toLocaleString()}`, "color: blue;");
                        console.log(`%c原始 Tab ID (来自插件): ${tId}`, "color: green; font-weight: bold;");
                        console.log(`页面地址: ${location.href}`);
                        console.log("✅ 注入成功，Tab ID 未丢失！");
                        console.groupEnd();
                    },
                    args: [tabId]
                });
                console.log(`[Test Mode] Tab ${tabId} 测试代码注入成功！`);
            } catch (err) {
                console.error(`[Test Mode] Tab ${tabId} 注入失败 (可能页面已关闭或权限不足):`, err);
            }
        }
    };

    browser.tabs.onUpdated.addListener(testListener);
}

/**
 * 等待真正的页面内容加载
 * 如果检测到 Cloudflare 或类似的验证页面，会继续等待跳转，直到超时或加载到真实页面
 */
async function waitForRealContent(tabId) {
    return new Promise((resolve, reject) => {
        // 设置一个较长的超时时间，因为 Cloudflare 验证有时需要十几秒
        const maxWaitTime = 60000;
        const timer = setTimeout(() => {
            browser.tabs.onUpdated.removeListener(listener);
            reject(new Error('Cloudflare 太久了，我不等了'));
        }, maxWaitTime);

        const listener = async (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                try {
                    // 检测当前页面是否是 Cloudflare 验证页
                    const isCF = await isCloudflarePage(tabId);
                    if (isCF) {
                        console.log(`[Tab ${tabId}] 检测到 Cloudflare 验证页，继续等待跳转...`);
                        return;
                    }
                    // 如果不是验证页，说明是真正的目标页面
                    console.log(`[Tab ${tabId}] 目标页面加载完毕，准备注入脚本`);
                    clearTimeout(timer);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();

                } catch (err) {
                    // 如果注入检测脚本都失败了（比如页面崩溃），可能需要处理
                    console.warn(`[Tab ${tabId}] 检测 Cloudflare 状态失败，尝试继续流程:`, err);
                    clearTimeout(timer);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            }
        };
        browser.tabs.onUpdated.addListener(listener);
    });
}

/**
 * 注入脚本检测当前页面特征，判断是否为 CF 盾
 */
async function isCloudflarePage(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: {tabId},
            func: () => {
                const title = document.title;
                const bodyText = document.body.innerText;

                // 常见的 Cloudflare 验证页标题或特征文字
                // 可以根据实际遇到的情况补充关键词
                const cfKeywords = [
                    "Just a moment",
                    "Attention Required",
                    "Security Check",
                    "Cloudflare",
                    "DDoS-Guard"
                ];

                const isTitleMatch = cfKeywords.some(kw => title.includes(kw));
                // 有些盾可能没有明确标题，但内容里有特定提示
                const isContentMatch = bodyText.includes("Checking your browser") ||
                    bodyText.includes("DDoS protection by Cloudflare");

                return isTitleMatch || isContentMatch;
            }
        });
        return results[0]?.result;
    } catch (e) {
        return false;
    }
}

// 页面加载完毕后执行js脚本
export async function checkSign(tabId, siteInfo) {
    let func = getFunctionByType(siteInfo);
    if (func) {
        try {
            console.log(`[签到流程] 开始为 ${siteInfo.name} 签到流程`);
            const results = await chrome.scripting.executeScript({
                target: {tabId},
                func,
            });
            console.log(`[签到流程] ${siteInfo.name} 签到成功：`, results[0]?.result);
            return results[0]?.result;
        } catch (err) {
            console.error(`[签到流程] ${siteInfo.name} 签到失败：`, err);
            return {
                sign: false
            };
        }
    } else {
        return {
            sign: false
        }
    }
}

// 根据网址类型适配不同的签到策略与检测方法
function getFunctionByType(siteInfo) {
    if (siteInfo.siteType === 'NexusPHP') {
        return nexusMain;
    }
    if (siteInfo.siteType === 'HanHan') {
        return hanhanMain;
    }
    if (siteInfo.siteType === 'HaiDan') {
        return haidanMain;
    }
    if (siteInfo.siteType === 'btSchool') {
        return btSchoolMain;
    }
    if (siteInfo.siteType === 'ttg') {
        return ttgMain;
    }
    if (siteInfo.siteType === 'U2') {
        return u2Main;
    }
    return null;
}