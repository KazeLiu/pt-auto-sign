/**
 * 签到流程核心调度器：负责页面准备、拦截态识别、脚本注入与结果归一化。
 */

import browser from "webextension-polyfill";
import { createSignTab, closeTabSafe } from "../tab/tabManager.js";
import { sleep } from "../index.js";
import { getSignStrategy } from "./signStrategies/index.js";
import { getSettingData } from "../storage/settingData.js";

// 页面/流程相关轮询与超时配置
const PAGE_READY_POLL_INTERVAL = 500;
const PAGE_READY_TIMEOUT = 30000;
const VERIFY_POLL_INTERVAL = 1000;
const VERIFY_TIMEOUT = 20000;
const SCRIPT_EXECUTE_DELAY = 1000;
const BARRIER_POLL_INTERVAL = 1000;
const BARRIER_TIMEOUT = 10000;

// 关键字配置（页面识别使用）
const VERIFY_KEYWORDS = [
    "Just a moment", "验证您是真人", "正在进行安全检测", "雷池 WAF",
    "验证程序加载", "耐心等待", "正在验证", "验证中", "Checking your browser", "执行安全验证"
];
const LOGIN_FIELD_KEYWORDS = [
    "用户名", "用户名称", "用戶名", "账号", "帳號", "password", "密码", "密碼",
    "验证码", "驗證碼", "验证图片", "驗證圖片", "security-verification", "2fa",
    "二级验证", "二次验证", "当前服务器时间", "忘记二级验证? 点击这里自助解绑",
    "忘记二级验证", "自助解绑"
];
const LOGIN_BUTTON_KEYWORDS = ["登录", "登錄", "登入", "sign in", "log in"];
const TWO_FACTOR_FIELD_KEYWORDS = [
    "security-verification", "2fa", "二级验证", "二次验证",
    "当前服务器时间", "忘记二级验证", "自助解绑"
];
const TWO_FACTOR_BUTTON_KEYWORDS = ["立即提交", "提交", "验证", "驗證", "verify"];
const SITE_ERROR_KEYWORDS = [
    "无法访问此网站", "无法访问此网页", "无法连接到", "this site can't be reached",
    "this site can’t be reached", "err_", "net::", "dns_probe",
    "connection refused", "连接已重置", "连接被重置"
];
const SITE_STATUS_KEYWORDS = ["404", "403", "500", "502", "503", "504", "520", "521", "522", "523", "524", "525", "526", "527", "530"];
const STATUS_HINT_KEYWORDS = ["not found", "找不到", "页面不存在", "bad gateway", "gateway", "service unavailable", "超时", "timeout"];
const CLOUDFLARE_TIMEOUT_KEYWORDS = ["cloudflare", "error 520", "error 521", "error 522", "error 523", "error 524", "error 525", "error 526", "timeout"];

/**
 * 读取当前签到调试配置。
 *
 * @returns {Promise<{debugSignFlow: boolean, debugPauseMs: number}>} 调试配置。
 */
async function getDebugConfig() {
    const settings = await getSettingData();
    return {
        debugSignFlow: Boolean(settings?.debugSignFlow),
        debugPauseMs: Math.max(Number(settings?.debugPauseMs) || 0, 0),
    };
}

/**
 * 在调试模式下暂停执行，便于手动打开 DevTools 进行排查。
 */
async function pauseForDebug(tabId, phase, siteName) {
    const { debugSignFlow, debugPauseMs } = await getDebugConfig();
    if (!debugSignFlow || debugPauseMs <= 0) return;

    console.log(`[${siteName} 调试模式] ${phase}，标签页 ${tabId} 将暂停 ${debugPauseMs}ms，期间可手动打开 DevTools 进行排查。`);
    await sleep(debugPauseMs);
}

/**
 * 在指定标签页中执行注入脚本，并返回首个执行结果。
 */
async function executeInTab(tabId, func, args = []) {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func, args });
    return results[0]?.result;
}

/**
 * 轮询页面加载状态，等到文档进入可交互或已完成状态。
 */
async function waitForPageInteractive(tabId, timeout = PAGE_READY_TIMEOUT) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const readyState = await executeInTab(tabId, () => document.readyState);
            if (readyState === "interactive" || readyState === "complete") return true;
        } catch {
            // 忽略临时错误，稍后重试
        }
        await sleep(PAGE_READY_POLL_INTERVAL);
    }
    console.log(`[Tab ${tabId}] 等待页面 Interactive 超时，尝试继续执行脚本`);
    return false;
}

/**
 * 等待 Cloudflare、雷池等验证盾页面消失。
 */
async function waitForVerifyPage(tabId, timeout = VERIFY_TIMEOUT) {
    const startTime = Date.now();
    console.log(`[Tab ${tabId}] 开始检测并等待安全盾...`);

    while (Date.now() - startTime < timeout) {
        try {
            await browser.tabs.get(tabId);
            const isShieldPresent = await executeInTab(tabId, (keywords) => {
                const text = `${document.title ?? ""}\n${document.body?.innerText ?? ""}`;
                return keywords.some(keyword => text.includes(keyword));
            }, [VERIFY_KEYWORDS]);

            if (!isShieldPresent) {
                console.log(`[Tab ${tabId}] 盾已消失（或未检测到），准备通过。`);
                return true;
            }
            console.log(`[Tab ${tabId}] 检测到盾，等待 1s...`);
            await sleep(VERIFY_POLL_INTERVAL);
        } catch (err) {
            console.warn(`[Tab ${tabId}] 检测盾状态时出错:`, err?.message);
            await sleep(VERIFY_POLL_INTERVAL);
        }
    }
    console.warn(`[Tab ${tabId}] 等待盾消失超时 (${timeout}ms)，尝试继续执行`);
    return false;
}

/**
 * 检测页面是否加载失败/无法访问/站点错误。
 */
async function detectSiteError(tabId) {
    try {
        return await executeInTab(tabId, (config) => {
            const title = (document.title ?? "").toLowerCase();
            const bodyText = (document.body?.innerText ?? "").toLowerCase();
            const fullText = `${title}\n${bodyText}`;
            const hasKeyword = (kws) => kws.some(k => fullText.includes(k.toLowerCase()));
            const previewDetail = title || bodyText.slice(0, 200);

            if (hasKeyword(config.siteErrorKeywords)) {
                return { status: "site-unreachable", msg: "无法访问站点或网络错误", detail: previewDetail };
            }

            const statusHit = config.siteStatusKeywords.find(code => fullText.includes(code));
            if (statusHit && hasKeyword(config.statusHintKeywords)) {
                return { status: "site-error", msg: `站点返回异常状态（${statusHit}）`, detail: previewDetail };
            }

            if (hasKeyword(config.cloudflareTimeoutKeywords)) {
                return { status: "cloudflare-timeout", msg: "Cloudflare 超时或防护异常", detail: previewDetail };
            }

            return { status: "ready", msg: "", detail: "" };
        }, [{
            siteErrorKeywords: SITE_ERROR_KEYWORDS,
            siteStatusKeywords: SITE_STATUS_KEYWORDS,
            statusHintKeywords: STATUS_HINT_KEYWORDS,
            cloudflareTimeoutKeywords: CLOUDFLARE_TIMEOUT_KEYWORDS
        }]);
    } catch (error) {
        const message = error?.message ?? "";
        if (message.includes("Frame with ID 0 is showing error page")) {
            return { status: "site-unreachable", msg: "无法访问站点或页面加载失败", detail: message };
        }
        return { status: "unknown", msg: message || "页面错误检测失败", detail: "" };
    }
}

/**
 * 检测当前页面是否仍处于登录、验证码或二级认证等不可签到状态。
 */
async function detectPageBarrier(tabId) {
    try {
        console.log(`[Tab ${tabId}] 开始识别页面拦截态...`);
        return await executeInTab(tabId, (config) => {
            const title = (document.title ?? "").toLowerCase();
            const bodyText = (document.body?.innerText ?? "").toLowerCase();
            const inputs = Array.from(document.querySelectorAll("input"));

            const placeholderText = inputs.map(n => n.getAttribute("placeholder") || "").join("\n").toLowerCase();
            const inputMetaText = inputs.map(n => `${n.name || ""} ${n.id || ""} ${n.autocomplete || ""}`).join("\n").toLowerCase();
            const fullText = `${title}\n${bodyText}\n${placeholderText}\n${inputMetaText}`;

            const hasKeyword = (kws) => kws.some(k => fullText.includes(k.toLowerCase()));
            const hasLoginFormLike = Boolean(document.querySelector('input[type="password"], form'));

            const visibleSubmitControls = Array.from(document.querySelectorAll("button, input[type='submit'], input[type='button']"))
                .map(node => (node.innerText || node.value || "").trim().toLowerCase())
                .filter(Boolean);

            const checkButtonKeywords = (keywords) => keywords.some(k =>
                visibleSubmitControls.some(text => text.replace(/\s+/g, "").includes(k.replace(/\s+/g, "").toLowerCase()))
            );

            const hasLoginButton = checkButtonKeywords(config.loginButtonKeywords);
            const hasLoginFieldKeyword = hasKeyword(config.loginFieldKeywords);
            const hasTwoFactorFieldKeyword = hasKeyword(config.twoFactorFieldKeywords);
            const hasTwoFactorButton = checkButtonKeywords(config.twoFactorButtonKeywords);

            const hasTwoFactorBarrier = hasLoginFormLike && hasTwoFactorFieldKeyword &&
                (hasTwoFactorButton || ["二次验证", "二级验证", "2fa"].some(k => title.includes(k)));

            const hasVerificationKeyword = ["验证码", "驗證碼", "验证图片", "驗證圖片"].some(k => fullText.includes(k));

            if (hasTwoFactorBarrier) {
                return { status: "login-2fa", msg: "检测到二次验证页面，需要人工处理", detail: title || bodyText.slice(0, 200) };
            }

            if ((hasLoginFormLike || hasLoginFieldKeyword) && hasLoginButton) {
                const status = hasVerificationKeyword ? "login-captcha" : "login-required";
                return {
                    status,
                    msg: hasVerificationKeyword ? "检测到登录验证码页面" : "检测到登录页面，可能已退出登录",
                    detail: title || bodyText.slice(0, 200)
                };
            }

            return { status: "ready", msg: "", detail: "" };
        }, [{
            loginFieldKeywords: LOGIN_FIELD_KEYWORDS,
            loginButtonKeywords: LOGIN_BUTTON_KEYWORDS,
            twoFactorFieldKeywords: TWO_FACTOR_FIELD_KEYWORDS,
            twoFactorButtonKeywords: TWO_FACTOR_BUTTON_KEYWORDS
        }]);
    } catch (error) {
        return { status: "unknown", msg: error?.message ?? "页面状态识别失败", detail: "" };
    }
}

/**
 * 等待页面 DOM 稳定或登录相关元素渲染出来，避免过早判断登录/验证码页面。
 */
async function waitForBarrierDomReady(tabId, timeout = BARRIER_TIMEOUT) {
    const startTime = Date.now();
    let lastTextLen = 0, stableCount = 0;

    while (Date.now() - startTime < timeout) {
        try {
            const snapshot = await executeInTab(tabId, () => ({
                readyState: document.readyState,
                hasBody: Boolean(document.body),
                textLen: document.body?.innerText?.length ?? 0,
                // 一次查询命中所有可能的表单/输入框特征元素
                hasLoginDom: Boolean(document.querySelector("form, input[type='password'], input[name], input[id], input[placeholder]"))
            }));

            if (snapshot?.hasLoginDom) return true;

            if (snapshot?.readyState === "complete" && snapshot?.hasBody) {
                stableCount = Math.abs((snapshot.textLen) - lastTextLen) <= 5 ? stableCount + 1 : 0;
                lastTextLen = snapshot.textLen;
                if (stableCount >= 2) return true;
            }
        } catch {
            // 忽略页面初始化阶段的临时错误
        }
        await sleep(BARRIER_POLL_INTERVAL);
    }
    return false;
}

/**
 * 在页面可交互后继续等待一段时间，给异步渲染登录框/二级验证组件留出时间。
 */
async function waitForPageBarrier(tabId) {
    console.log(`[Tab ${tabId}] 开始检测页面拦截态...`);
    try {
        await waitForPageInteractive(tabId);
        await waitForBarrierDomReady(tabId);
        await browser.tabs.get(tabId);

        const result = await detectPageBarrier(tabId);
        if (result.status !== "ready") {
            console.log(`[Tab ${tabId}] 检测到页面拦截态：${result.status}，停止等待。`);
        }
        return result;
    } catch (err) {
        return { status: "unknown", msg: err?.message ?? "页面拦截态识别失败", detail: "" };
    }
}

/**
 * 根据站点类型注入对应签到策略，并将其返回值整理为统一结构。
 */
async function runSignScript(tabId, siteInfo) {
    const strategy = getSignStrategy(siteInfo.siteType);
    if (!strategy) {
        return { sign: false, pending: false, status: "strategy-missing", msg: `未找到策略：${siteInfo.siteType}` };
    }

    try {
        await pauseForDebug(tabId, "页面已打开，准备执行签到脚本", siteInfo.name);
        await sleep(SCRIPT_EXECUTE_DELAY);

        const rawResult = (await executeInTab(tabId, strategy)) || {};

        // 使用解构赋默认值，替代多重判断
        const {
            sign = false,
            pending = false,
            status = rawResult.status ?? (rawResult.sign ? "signed" : "failed"),
            title = "",
            text = "",
            msg = rawResult.msg || "策略未返回结果",
            detail = rawResult.detail ?? rawResult.text ?? ""
        } = rawResult;

        const normalizedResult = { sign, pending, status, title, text, msg, detail };
        console.log(`[${siteInfo.name} 签到流程] 执行结果：`, normalizedResult);
        return normalizedResult;
    } catch (err) {
        return { sign: false, pending: false, status: "script-error", msg: err?.message ?? "执行脚本失败" };
    }
}

/**
 * 在执行签到前等待页面可交互，并视配置等待验证盾通过后再识别页面拦截态。
 */
async function waitUntilSignable(tabId, skipVerifyPage) {
    await waitForPageInteractive(tabId);
    const siteError = await detectSiteError(tabId);
    if (siteError.status !== "ready" && siteError.status !== "unknown") return siteError;

    if (!skipVerifyPage) await waitForVerifyPage(tabId);
    return waitForPageBarrier(tabId);
}

/**
 * 执行单个站点的完整签到任务。
 */
export async function handleSignTask(siteInfo) {
    const debugConfig = await getDebugConfig();
    const tabOptions = siteInfo.active || debugConfig.debugSignFlow ? { active: true } : { active: false, pinned: true };
    const tab = await createSignTab(siteInfo.site, tabOptions);

    try {
        console.log(`[${siteInfo.name} 签到流程] 开始 ${siteInfo.name}`);

        // 阶段一：等待并校验可签到状态
        let pageBarrier = await waitUntilSignable(tab.id, siteInfo.notVerifyPage);
        if (pageBarrier.status !== "ready" && pageBarrier.status !== "unknown") {
            return { sign: false, pending: false, status: pageBarrier.status, msg: pageBarrier.msg, detail: pageBarrier.detail };
        }

        // 阶段二：执行签到脚本
        let result = await runSignScript(tab.id, siteInfo);

        // 阶段三：处理 Pending 重试态（无嵌套，提前返回）
        if (!result.pending) return result;

        const skipRetryStatuses = ["login-required", "login-captcha", "login-2fa"];
        if (skipRetryStatuses.includes(result.status) || siteInfo.notVerifyPage) {
            console.log(`[${siteInfo.name}] 站点不需要二次验证或遇到拦截，跳过二次重试。`);
            return { ...result, pending: false };
        }

        console.log(`[${siteInfo.name}] 检测到 Pending 状态，等待页面刷新...`);
        pageBarrier = await waitUntilSignable(tab.id, siteInfo.notVerifyPage);
        if (pageBarrier.status !== "ready" && pageBarrier.status !== "unknown") {
            return { sign: false, pending: false, status: pageBarrier.status, msg: pageBarrier.msg, detail: pageBarrier.detail };
        }

        return await runSignScript(tab.id, siteInfo);

    } catch (err) {
        console.error(`[${siteInfo.name} 签到流程] 异常：`, err);
        return { sign: false, pending: false, status: "task-error", msg: err?.message };
    } finally {
        if (!debugConfig.debugSignFlow) {
            await closeTabSafe(tab.id);
        } else {
            console.log(`[${siteInfo.name} 调试模式] 已保留标签页 ${tab.id}，可继续手动检查页面与控制台。`);
        }
    }
}