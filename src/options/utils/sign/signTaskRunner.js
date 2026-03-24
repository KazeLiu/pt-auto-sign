/**
 * 签到流程核心调度器：负责页面准备、拦截态识别、脚本注入与结果归一化。
 */

import browser from "webextension-polyfill";
import {createSignTab, closeTabSafe} from "../tab/tabManager.js";
import {sleep} from "../index.js";
import {getSignStrategy} from "./signStrategies/index.js";
import {getSettingData} from "../storage/settingData.js";

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
    "Just a moment",
    "验证您是真人",
    "正在进行安全检测",
    "雷池 WAF",
    "验证程序加载",
    "耐心等待",
    "正在验证",
    "验证中",
    "Checking your browser"
];
const LOGIN_FIELD_KEYWORDS = [
    "用户名",
    "用户名称",
    "用戶名",
    "账号",
    "帳號",
    "password",
    "密码",
    "密碼",
    "验证码",
    "驗證碼",
    "验证图片",
    "驗證圖片"
];
const LOGIN_BUTTON_KEYWORDS = ["登录", "登錄", "登入", "sign in", "log in"];
const SITE_ERROR_KEYWORDS = [
    "无法访问此网站",
    "无法访问此网页",
    "无法连接到",
    "this site can't be reached",
    "this site can’t be reached",
    "err_",
    "net::",
    "dns_probe",
    "connection refused",
    "连接已重置",
    "连接被重置"
];
const SITE_STATUS_KEYWORDS = [
    "404",
    "403",
    "500",
    "502",
    "503",
    "504",
    "520",
    "521",
    "522",
    "523",
    "524",
    "525",
    "526",
    "527",
    "530"
];
const STATUS_HINT_KEYWORDS = [
    "not found",
    "找不到",
    "页面不存在",
    "bad gateway",
    "gateway",
    "service unavailable",
    "超时",
    "timeout"
];
const CLOUDFLARE_TIMEOUT_KEYWORDS = [
    "cloudflare",
    "error 520",
    "error 521",
    "error 522",
    "error 523",
    "error 524",
    "error 525",
    "error 526",
    "timeout"
];

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
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {string} phase - 当前调试阶段说明。
 * @param {string} siteName - 站点名称。
 * @returns {Promise<void>}
 */
async function pauseForDebug(tabId, phase, siteName) {
    const {debugSignFlow, debugPauseMs} = await getDebugConfig();
    if (!debugSignFlow || debugPauseMs <= 0) {
        return;
    }

    console.log(`[${siteName} 调试模式] ${phase}，标签页 ${tabId} 将暂停 ${debugPauseMs}ms，期间可手动打开 DevTools 进行排查。`);
    await sleep(debugPauseMs);
}

/**
 * 在指定标签页中执行注入脚本，并返回首个执行结果。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {Function} func - 需要注入页面上下文执行的函数。
 * @param {any[]} [args=[]] - 传递给注入函数的参数列表。
 * @returns {Promise<any>} 页面脚本返回的结果。
 */
async function executeInTab(tabId, func, args = []) {
    const results = await chrome.scripting.executeScript({
        target: {tabId},
        func,
        args
    });
    return results[0]?.result;
}

/**
 * 轮询页面加载状态，等到文档进入可交互或已完成状态。
 *
 * 这里不强依赖 complete，避免图片、统计脚本等静态资源拖慢签到流程。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {number} [timeout=PAGE_READY_TIMEOUT] - 最大等待时长，单位毫秒。
 * @returns {Promise<boolean>} 是否在超时前进入可执行状态。
 */
async function waitForPageInteractive(tabId, timeout = PAGE_READY_TIMEOUT) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const readyState = await executeInTab(tabId, () => document.readyState);
            if (readyState === "interactive" || readyState === "complete") {
                return true;
            }
        } catch {
            // 忽略临时错误（如 tab 还没建立好连接），稍后重试
        }
        await sleep(PAGE_READY_POLL_INTERVAL);
    }
    console.log(`[Tab ${tabId}] 等待页面 Interactive 超时，尝试继续执行脚本`);
    return false;
}

/**
 * 等待 Cloudflare、雷池等验证盾页面消失。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {number} [timeout=VERIFY_TIMEOUT] - 最大等待时长，单位毫秒。
 * @returns {Promise<boolean>} 是否在超时前通过验证页。
 */
async function waitForVerifyPage(tabId, timeout = VERIFY_TIMEOUT) {
    const startTime = Date.now();
    console.log(`[Tab ${tabId}] 开始检测并等待安全盾...`);

    while (Date.now() - startTime < timeout) {
        try {
            await browser.tabs.get(tabId);
            const isShieldPresent = await executeInTab(tabId, (keywords) => {
                const bodyText = document.body?.innerText ?? "";
                const pageTitle = document.title ?? "";
                return keywords.some(keyword => bodyText.includes(keyword) || pageTitle.includes(keyword));
            }, [VERIFY_KEYWORDS]);

            if (!isShieldPresent) {
                console.log(`[Tab ${tabId}] 盾已消失（或未检测到），准备通过。`);
                return true;
            }

            console.log(`[Tab ${tabId}] 检测到盾，等待 1s...`);
            await sleep(VERIFY_POLL_INTERVAL);
        } catch (err) {
            console.warn(`[Tab ${tabId}] 检测盾状态时出错 (可能是页面跳转中):`, err?.message);
            await sleep(VERIFY_POLL_INTERVAL);
        }
    }

    console.warn(`[Tab ${tabId}] 等待盾消失超时 (${timeout}ms)，尝试继续执行`);
    return false;
}

/**
 * 检测页面是否加载失败/无法访问/站点错误（如 4xx/5xx、Cloudflare 超时）。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @returns {Promise<{status: string, msg: string, detail: string}>} 页面状态识别结果。
 */
async function detectSiteError(tabId) {
    try {
        const result = await executeInTab(tabId, (config) => {
            const title = (document.title ?? "").toLowerCase();
            const bodyText = (document.body?.innerText ?? "").toLowerCase();
            const fullText = `${title}\n${bodyText}`;
            const hasKeyword = (keywords) => keywords.some(keyword => fullText.includes(keyword.toLowerCase()));

            if (hasKeyword(config.siteErrorKeywords)) {
                return {
                    status: "site-unreachable",
                    msg: "无法访问站点或网络错误",
                    detail: title || bodyText.slice(0, 200)
                };
            }

            const statusHit = config.siteStatusKeywords.find(code => fullText.includes(code));
            if (statusHit && hasKeyword(config.statusHintKeywords)) {
                return {
                    status: "site-error",
                    msg: `站点返回异常状态（${statusHit}）`,
                    detail: title || bodyText.slice(0, 200)
                };
            }

            if (hasKeyword(config.cloudflareTimeoutKeywords)) {
                return {
                    status: "cloudflare-timeout",
                    msg: "Cloudflare 超时或防护异常",
                    detail: title || bodyText.slice(0, 200)
                };
            }

            return {status: "ready", msg: "", detail: ""};
        }, [{
            siteErrorKeywords: SITE_ERROR_KEYWORDS,
            siteStatusKeywords: SITE_STATUS_KEYWORDS,
            statusHintKeywords: STATUS_HINT_KEYWORDS,
            cloudflareTimeoutKeywords: CLOUDFLARE_TIMEOUT_KEYWORDS
        }]);
        return result;
    } catch (error) {
        const message = error?.message ?? "";
        if (message.includes("Frame with ID 0 is showing error page")) {
            return {
                status: "site-unreachable",
                msg: "无法访问站点或页面加载失败",
                detail: message
            };
        }
        console.warn(`[Tab ${tabId}] 页面错误检测失败：`, message);
        return {status: "unknown", msg: message || "页面错误检测失败", detail: ""};
    }
}

/**
 * 检测当前页面是否仍处于登录、验证码或二级认证等不可签到状态。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @returns {Promise<{status: string, msg: string, detail: string}>} 页面状态识别结果。
 */
async function detectPageBarrier(tabId) {
    try {
        console.log(`[Tab ${tabId}] 开始识别页面拦截态...`);
        const result = await executeInTab(tabId, (config) => {
            const bodyText = (document.body?.innerText ?? "").toLowerCase();
            const title = (document.title ?? "").toLowerCase();
            const placeholderText = Array.from(document.querySelectorAll("input, textarea"))
                .map(node => node.getAttribute("placeholder") || "")
                .join("\n")
                .toLowerCase();
            const inputMetaText = Array.from(document.querySelectorAll("input"))
                .map(node => [
                    node.getAttribute("name") || "",
                    node.getAttribute("id") || "",
                    node.getAttribute("autocomplete") || ""
                ].join(" "))
                .join("\n")
                .toLowerCase();
            const fullText = `${title}\n${bodyText}\n${placeholderText}\n${inputMetaText}`;
            const forms = Array.from(document.querySelectorAll("form"));
            const passwordInput = document.querySelector('input[type="password"]');
            const visibleSubmitControls = Array.from(document.querySelectorAll("button, input[type=\"submit\"], input[type=\"button\"]"))
                .map(node => (node.innerText || node.value || "").trim().toLowerCase())
                .filter(Boolean);

            const hasKeyword = (keywords) => keywords.some(keyword => fullText.includes(keyword.toLowerCase()));
            const hasLoginButton = config.loginButtonKeywords.some(keyword =>
                visibleSubmitControls.some(text => text.replace(/\s+/g, "").includes(keyword.replace(/\s+/g, "").toLowerCase()))
            );
            const hasLoginFieldKeyword = hasKeyword(config.loginFieldKeywords);
            const hasVerificationKeyword = fullText.includes("验证码")
                || fullText.includes("驗證碼")
                || fullText.includes("验证图片")
                || fullText.includes("驗證圖片");
            const hasLoginFormLike = Boolean(passwordInput) || forms.length > 0;

            console.log("[Barrier Detect] 页面识别特征：", {
                title,
                formsCount: forms.length,
                hasPasswordInput: Boolean(passwordInput),
                visibleSubmitControls,
                hasLoginButton,
                hasLoginFieldKeyword,
                hasVerificationKeyword,
                hasLoginFormLike,
            });

            if ((hasLoginFormLike || hasLoginFieldKeyword) && hasLoginButton) {
                const status = hasVerificationKeyword ? "login-captcha" : "login-required";
                console.log(`[Barrier Detect] 命中登录相关页面：${status}`);
                return {
                    status,
                    msg: hasVerificationKeyword ? "检测到登录验证码页面" : "检测到登录页面，可能已退出登录",
                    detail: title || bodyText.slice(0, 200)
                };
            }

            console.log("[Barrier Detect] 未识别到页面拦截态，页面可继续签到");
            return {
                status: "ready",
                msg: "",
                detail: ""
            };
        }, [{
            loginFieldKeywords: LOGIN_FIELD_KEYWORDS,
            loginButtonKeywords: LOGIN_BUTTON_KEYWORDS
        }]);
        return result;
    } catch (error) {
        console.warn(`[Tab ${tabId}] 页面拦截态识别失败：`, error?.message);
        return {
            status: "unknown",
            msg: error?.message ?? "页面状态识别失败",
            detail: ""
        };
    }
}

/**
 * 等待页面 DOM 稳定或登录相关元素渲染出来，避免过早判断登录/验证码页面。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {number} [timeout=BARRIER_TIMEOUT] - 最大等待时长，单位毫秒。
 * @returns {Promise<boolean>} 是否达到可判定状态。
 */
async function waitForBarrierDomReady(tabId, timeout = BARRIER_TIMEOUT) {
    const startTime = Date.now();
    let lastTextLen = 0;
    let stableCount = 0;

    while (Date.now() - startTime < timeout) {
        try {
            const snapshot = await executeInTab(tabId, () => {
                const body = document.body;
                const textLen = body?.innerText?.length ?? 0;
                const hasLoginDom = Boolean(
                    document.querySelector("form")
                    || document.querySelector('input[type="password"]')
                    || document.querySelector("input[name], input[id], input[placeholder]")
                );
                return {
                    readyState: document.readyState,
                    hasBody: Boolean(body),
                    textLen,
                    hasLoginDom,
                };
            });

            if (snapshot?.hasLoginDom) {
                return true;
            }

            if (snapshot?.readyState === "complete" && snapshot?.hasBody) {
                if (Math.abs((snapshot?.textLen ?? 0) - lastTextLen) <= 5) {
                    stableCount += 1;
                } else {
                    stableCount = 0;
                }
                lastTextLen = snapshot?.textLen ?? 0;
                if (stableCount >= 2) {
                    return true;
                }
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
 *
 * @param {number} tabId - 目标标签页 ID。
 * @returns {Promise<{status: string, msg: string, detail: string}>} 页面状态识别结果。
 */
async function waitForPageBarrier(tabId) {
    console.log(`[Tab ${tabId}] 开始检测页面拦截态...`);
    try {
        await waitForPageInteractive(tabId);
        await waitForBarrierDomReady(tabId);
        await browser.tabs.get(tabId);
        const result = await detectPageBarrier(tabId);
        console.log(`[Tab ${tabId}] 页面拦截态检测结果：`, result);

        if (result.status !== "ready") {
            console.log(`[Tab ${tabId}] 检测到页面拦截态：${result.status}，停止等待。`);
        }

        return result;
    } catch (err) {
        console.warn(`[Tab ${tabId}] 检测页面拦截态时出错 (可能是页面跳转中):`, err?.message);
        return {status: "unknown", msg: err?.message ?? "页面拦截态识别失败", detail: ""};
    }
}

/**
 * 根据站点类型注入对应签到策略，并将其返回值整理为统一结构。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {{name: string, siteType: string}} siteInfo - 站点信息。
 * @returns {Promise<{sign: boolean, pending: boolean, status: string, title?: string, text?: string, msg: string, detail?: string}>} 归一化后的签到结果。
 */
async function runSignScript(tabId, siteInfo) {
    const strategy = getSignStrategy(siteInfo.siteType);
    if (!strategy) {
        console.warn(`[${siteInfo.name} 签到流程] 未找到策略：${siteInfo.siteType}`);
        return {sign: false, pending: false, status: "strategy-missing", msg: `未找到策略：${siteInfo.siteType}`};
    }

    try {
        await pauseForDebug(tabId, "页面已打开，准备执行签到脚本", siteInfo.name);
        await sleep(SCRIPT_EXECUTE_DELAY);
        const result = await executeInTab(tabId, strategy) ?? {sign: false, pending: false, msg: "策略未返回结果"};
        const normalizedResult = {
            sign: Boolean(result?.sign),
            pending: Boolean(result?.pending),
            status: result?.status ?? (result?.sign ? "signed" : "failed"),
            title: result?.title ?? "",
            text: result?.text ?? "",
            msg: result?.msg ?? "",
            detail: result?.detail ?? result?.text ?? "",
        };

        console.log(`[${siteInfo.name} 签到流程] 执行结果：`, normalizedResult);

        if (normalizedResult.pending) {
            console.log(`[${siteInfo.name} 签到流程] 操作已触发，等待页面刷新后重试`);
        }

        return normalizedResult;
    } catch (err) {
        console.error(`[${siteInfo.name} 签到流程] 执行失败：`, err);
        return {sign: false, pending: false, status: "script-error", msg: err?.message ?? "执行脚本失败"};
    }
}

/**
 * 在执行签到前等待页面可交互，并视配置等待验证盾通过后再识别页面拦截态。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @param {boolean} skipVerifyPage - 是否跳过验证页等待逻辑。
 * @returns {Promise<{status: string, msg: string, detail: string}>} 页面状态识别结果。
 */
async function waitUntilSignable(tabId, skipVerifyPage) {
    await waitForPageInteractive(tabId);
    const siteError = await detectSiteError(tabId);
    if (siteError.status !== "ready" && siteError.status !== "unknown") {
        return siteError;
    }
    if (!skipVerifyPage) {
        await waitForVerifyPage(tabId);
    }
    return waitForPageBarrier(tabId);
}

/**
 * 执行单个站点的完整签到任务。
 *
 * 流程包含：创建标签页、等待页面可执行、识别页面拦截态、注入站点策略、
 * 处理 pending 重试，并在结束后安全关闭标签页。
 *
 * @param {{
 *   name: string,
 *   site: string,
 *   siteType: string,
 *   active?: boolean,
 *   notVerifyPage?: boolean
 * }} siteInfo - 单个站点的签到配置。
 * @returns {Promise<{sign: boolean, pending: boolean, status: string, title?: string, text?: string, msg: string, detail?: string}>} 最终签到结果。
 */
export async function handleSignTask(siteInfo) {
    const debugConfig = await getDebugConfig();
    const tabOptions = siteInfo.active || debugConfig.debugSignFlow
        ? {active: true}
        : {active: false, pinned: true};
    const tab = await createSignTab(siteInfo.site, tabOptions);
    let finalResult = {sign: false, pending: false, status: "task-error", msg: `${siteInfo.name} 返回空结果`};

    try {
        console.log(`[${siteInfo.name} 签到流程] 开始 ${siteInfo.name}`);
        let pageBarrier = await waitUntilSignable(tab.id, siteInfo.notVerifyPage);
        if (pageBarrier.status !== "ready" && pageBarrier.status !== "unknown") {
            finalResult = {
                sign: false,
                pending: false,
                status: pageBarrier.status,
                msg: pageBarrier.msg,
                detail: pageBarrier.detail,
            };
            return finalResult;
        }

        let result = await runSignScript(tab.id, siteInfo);

        if (result.pending) {
            const shouldSkipRetry = result.status === "login-required" || result.status === "login-captcha";
            if (shouldSkipRetry) {
                console.log(`[${siteInfo.name}] 检测到登录失败/验证码拦截，跳过二次重试。`);
                finalResult = {
                    ...result,
                    pending: false,
                };
                return finalResult;
            }

            if (siteInfo.notVerifyPage) {
                console.log(`[${siteInfo.name}] 站点不需要二次验证，跳过二次重试。`);
                finalResult = {
                    ...result,
                    pending: false,
                };
                return finalResult;
            }

            console.log(`[${siteInfo.name}] 检测到 Pending 状态，等待页面刷新...`);
            pageBarrier = await waitUntilSignable(tab.id, siteInfo.notVerifyPage);
            if (pageBarrier.status !== "ready" && pageBarrier.status !== "unknown") {
                finalResult = {
                    sign: false,
                    pending: false,
                    status: pageBarrier.status,
                    msg: pageBarrier.msg,
                    detail: pageBarrier.detail,
                };
                return finalResult;
            }
            result = await runSignScript(tab.id, siteInfo);
        }

        finalResult = result;
        return finalResult;
    } catch (err) {
        console.error(`[${siteInfo.name} 签到流程] 异常：`, err);
        finalResult = {sign: false, pending: false, status: "task-error", msg: err?.message};
        return finalResult;
    } finally {
        if (!debugConfig.debugSignFlow) {
            await closeTabSafe(tab.id);
        } else {
            console.log(`[${siteInfo.name} 调试模式] 已保留标签页 ${tab.id}，可继续手动检查页面与控制台。`);
        }
    }
}
