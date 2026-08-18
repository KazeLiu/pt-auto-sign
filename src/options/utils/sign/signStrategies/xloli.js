/**
 * xloli 站点签到策略。
 *
 * 与通用 NexusPHP 站点的区别：
 * - 签到表单内嵌 Cloudflare Turnstile 验证，需等待其 token 写入隐藏域后再提交；
 * - 需主动点击"立即签到"提交按钮（通用 nexusPHP 策略仅识别不点击）；
 * - 已签到后再次进入签到页会返回"Captcha verification failed"，将其视为今日已签到。
 *
 * 注意：本函数会被注入到签到页面执行，不能依赖扩展模块作用域，必须自包含。
 *
 * @returns {Promise<{sign:boolean,pending:boolean,title:string,text:string,msg:string,detail:string,logs:string}>} 签到结果。
 */
export async function xloliMain() {
    console.log('═══════════════════════════════════════════════════');
    console.log('[xloli DEBUG] 策略函数开始执行');
    console.log('[xloli DEBUG] 当前 URL:', window.location.href);
    console.log('[xloli DEBUG] 当前时间:', new Date().toLocaleString());
    console.log('═══════════════════════════════════════════════════');

    // 日志收集
    const logs = [];
    const log = (...args) => {
        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const message = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        logs.push(`[${timestamp}] ${message}`);
        console.log(...args);
    };

    const createResult = ({
        sign = false,
        pending = false,
        title = '',
        text = '',
        msg = '',
        detail = '',
    } = {}) => {
        const result = {
            sign,
            pending,
            title,
            text,
            msg: msg || title || text || (sign ? '签到成功' : '签到失败'),
            detail: detail || text,
            logs: logs.join('\n'),
        };
        console.log('[xloli DEBUG] 即将返回结果:', result);
        return result;
    };

    const normalizeText = (text = '') => String(text)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 读取页面标题与正文，用于结果识别
    const getPageText = () => {
        const title = normalizeText(document.querySelector('.embedded h2, h2')?.innerText ?? '');
        const text = normalizeText(document.querySelector('.embedded .text, .text')?.innerText ?? '');
        const bodyText = normalizeText(document.body?.innerText ?? '');
        log('[xloli DEBUG] 页面文本 - 标题:', title, '正文:', text.substring(0, 100));
        return { title, text, full: [title, text, bodyText].filter(Boolean).join(' ') };
    };

    // 识别当前页面是否已是签到结果（成功 / 今日已签到 / 需登录）
    const detectResult = () => {
        log('[xloli DEBUG] 开始检测页面结果...');
        const { title, text, full } = getPageText();

        if (/签到成功/.test(full)) {
            log('[xloli] 检测到签到成功');
            return createResult({ sign: true, title: title || '签到成功', text, detail: text || full });
        }

        // 已签到后再次访问，页面返回 "Captcha verification failed"，视为今日已签到
        if (/captcha\s*verification\s*failed/i.test(full)) {
            log('[xloli] 检测到验证失效，判定为今日已签到');
            return createResult({
                sign: true,
                title: '今日已签到',
                text,
                msg: '今日已签到（验证已失效）',
                detail: text || full,
            });
        }

        // 登录拦截兜底（正常情况下调度器会在更早阶段拦截）
        if (/请.{0,8}(?:登录|登入|登錄)|(?:未|没有|沒有).{0,4}(?:登录|登入|登錄)|权限不足|權限不足/.test(full)) {
            log('[xloli] 检测到登录拦截');
            return createResult({ sign: false, title, text, msg: '检测到登录拦截，可能已退出登录', detail: text || full });
        }

        log('[xloli DEBUG] 未检测到结果特征');
        return null;
    };

    try {
        log('[xloli] 签到策略开始执行');

        // 入口先识别结果（pending 重试注入时，页面已是结果页）
        log('[xloli DEBUG] 第一次检测结果页...');
        const existed = detectResult();
        if (existed) {
            log('[xloli] 页面已是结果页，直接返回');
            return existed;
        }

        // 查找"立即签到"提交按钮
        log('[xloli DEBUG] 查找签到按钮...');
        const findSignButton = () => {
            const buttons = Array.from(document.querySelectorAll('input[type="submit"]'));
            log('[xloli DEBUG] 找到 submit 按钮数量:', buttons.length);
            buttons.forEach((btn, idx) => {
                log(`[xloli DEBUG] 按钮 ${idx}: value="${btn.value}", name="${btn.name}"`);
            });
            return buttons.find(btn => /签到/.test(normalizeText(btn.value || '')));
        };

        const signButton = findSignButton();
        if (!signButton) {
            const { title, text, full } = getPageText();
            log('[xloli] 未找到签到按钮');
            return createResult({
                sign: false,
                title,
                text,
                msg: '未找到签到按钮或签到结果',
                detail: text || full,
            });
        }

        log('[xloli DEBUG] 找到签到按钮:', signButton.value);

        // 轮询等待 Cloudflare Turnstile token 写入隐藏域
        const TOKEN_READY_MIN_LENGTH = 100;
        const POLL_INTERVAL = 500;
        const POLL_TIMEOUT = 20000;

        log('[xloli] 开始等待 CF Turnstile token...');
        let spent = 0;
        while (spent < POLL_TIMEOUT) {
            // 等待期间页面可能已变化为结果页
            const current = detectResult();
            if (current) {
                log('[xloli] 等待 token 期间检测到结果页');
                return current;
            }

            const tokenInput = document.querySelector('input[name="cf-turnstile-response"]');
            const tokenValue = tokenInput?.value || '';
            const tokenReady = Boolean(tokenValue) && tokenValue.length >= TOKEN_READY_MIN_LENGTH;

            if (spent === 0 || spent % 2000 === 0) {
                log(`[xloli DEBUG] 等待 token 中... (已等待 ${spent}ms, token 存在: ${!!tokenInput}, token 长度: ${tokenValue.length})`);
            }

            if (tokenReady) {
                log(`[xloli] CF Turnstile token 已就绪 (长度: ${tokenValue.length})，点击签到按钮`);
                signButton.click();
                log('[xloli DEBUG] 按钮已点击');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            spent += POLL_INTERVAL;
        }

        if (spent >= POLL_TIMEOUT) {
            log('[xloli] 等待 CF Turnstile 验证超时');
            return createResult({
                sign: false,
                title: '等待 Cloudflare 验证超时',
                msg: '等待 Cloudflare Turnstile 验证完成超时',
                detail: getPageText().full,
            });
        }

        // 点击后等待页面跳转到结果页
        const RESULT_POLL_INTERVAL = 500;
        const RESULT_TIMEOUT = 10000;
        let resultSpent = 0;

        log('[xloli] 等待签到结果页面...');
        while (resultSpent < RESULT_TIMEOUT) {
            await new Promise(resolve => setTimeout(resolve, RESULT_POLL_INTERVAL));
            resultSpent += RESULT_POLL_INTERVAL;

            log(`[xloli DEBUG] 检测结果页... (已等待 ${resultSpent}ms, 当前 URL: ${window.location.href})`);

            const result = detectResult();
            if (result) {
                log(`[xloli] 检测到签到结果 (等待了 ${resultSpent}ms)`);
                return result;
            }

            if (resultSpent % 2000 === 0) {
                log(`[xloli] 等待结果页面中... (已等待 ${resultSpent}ms)`);
            }
        }

        // 超时后最后尝试提取一次
        log('[xloli] 等待结果页面超时，最后尝试提取');
        const finalResult = detectResult();
        if (finalResult) {
            return finalResult;
        }

        log('[xloli] 未能识别到签到结果');
        return createResult({
            sign: false,
            title: '等待签到结果超时',
            msg: '点击签到后等待结果页面超时',
            detail: getPageText().full,
        });

    } catch (error) {
        console.error('[xloli ERROR] 策略执行异常:', error);
        console.error('[xloli ERROR] 错误堆栈:', error.stack);
        return createResult({
            sign: false,
            title: '策略执行异常',
            msg: `执行出错: ${error.message}`,
            detail: error.stack || String(error),
        });
    }
}
