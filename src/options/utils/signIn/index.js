import browser from "webextension-polyfill";
import {haidanMain} from "./haidan.js";
import {btSchoolMain} from "./btSchool.js";
import {nexusMain} from "./nexusPHP.js";
import {ttgMain} from "./ttg.js";
import {hanhanMain} from "./hanhan.js";

// 接受签到任务
export async function handleSignTask(siteInfo) {
    const tab = await browser.tabs.create({url: siteInfo.targetUrl, active: true});

    // 2. 监听页面加载完毕
    await new Promise((resolve) => {
        const listener = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        browser.tabs.onUpdated.addListener(listener);
    });

    let result = await checkSign(tab.id, siteInfo);
    await browser.tabs.remove(tab.id);
    return result;
}

// 页面加载完毕后执行js脚本
export async function checkSign(tabId, siteInfo) {
    let func = getFunctionByType(siteInfo);
    if (func) {
        try {
            const results = await chrome.scripting.executeScript({
                target: {tabId},
                func,
            });
            return results[0]?.result;
        } catch (err) {
            console.error("注入或执行脚本失败:", err);
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
    return null;
}
