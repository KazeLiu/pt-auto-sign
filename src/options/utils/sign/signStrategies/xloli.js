/**
 * xloli 站点签到策略。
 *
 * 与通用 NexusPHP 站点的区别：
 * - 签到表单内嵌 Cloudflare Turnstile 验证，需等待其 token 写入隐藏域后再提交；
 * - 需主动点击“立即签到”提交按钮（通用 nexusPHP 策略仅识别不点击）；
 * - 已签到后再次进入签到页会返回“Captcha verification failed”，将其视为今日已签到。
 *
 * 注意：本函数会被注入到签到页面执行，不能依赖扩展模块作用域，必须自包含。
 *
 * @returns {Promise<{sign:boolean,pending:boolean,title:string,text:string,msg:string,detail:string}>} 签到结果。
 */
export function xloliMain() {
    const createResult = ({
        sign = false,
        pending = false,
        title = '',
        text = '',
        msg = '',
        detail = '',
    } = {}) => ({
        sign,
        pending,
        title,
        text,
        msg: msg || title || text || (sign ? '签到成功' : '签到失败'),
        detail: detail || text,
    });

    const normalizeText = (text = '') => String(text)
        .replace(/ /g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 读取页面标题与正文，用于结果识别
    const getPageText = () => {
        const title = normalizeText(document.querySelector('.embedded h2, h2')?.innerText ?? '');
        const text = normalizeText(document.querySelector('.embedded .text, .text')?.innerText ?? '');
        const bodyText = normalizeText(document.body?.innerText ?? '');
        return { title, text, full: [title, text, bodyText].filter(Boolean).join(' ') };
    };

    // 识别当前页面是否已是签到结果（成功 / 今日已签到 / 需登录）
    const detectResult = () => {
        const { title, text, full } = getPageText();

        if (/签到成功/.test(full)) {
            return createResult({ sign: true, title: title || '签到成功', text, detail: text || full });
        }

        // 已签到后再次访问，页面返回 "Captcha verification failed"，视为今日已签到
        if (/captcha\s*verification\s*failed/i.test(full)) {
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
            return createResult({ sign: false, title, text, msg: '检测到登录拦截，可能已退出登录', detail: text || full });
        }

        return null;
    };

    // 入口先识别结果（pending 重试注入时，页面已是结果页）
    const existed = detectResult();
    if (existed) return Promise.resolve(existed);

    // 查找“立即签到”提交按钮
    const findSignButton = () => Array.from(document.querySelectorAll('input[type="submit"]'))
        .find(btn => /签到/.test(normalizeText(btn.value || '')));

    const signButton = findSignButton();
    if (!signButton) {
        const { title, text, full } = getPageText();
        return Promise.resolve(createResult({
            sign: false,
            title,
            text,
            msg: '未找到签到按钮或签到结果',
            detail: text || full,
        }));
    }

    // 轮询等待 Cloudflare Turnstile token 写入隐藏域，就绪后点击并返回 pending，
    // 由调度器等待页面刷新后重新注入识别结果。
    // 关键：必须在点击的同一同步流程内返回 pending，否则表单提交触发页面导航会销毁当前注入上下文，导致结果丢失。
    // 铁律：必须确认 token 真正填好（长度足够）才提交，避免“真·验证失败”被误判为今日已签到。
    const TOKEN_READY_MIN_LENGTH = 100;
    const POLL_INTERVAL = 500;
    const POLL_TIMEOUT = 20000;

    return new Promise((resolve) => {
        let spent = 0;
        const timer = setInterval(() => {
            spent += POLL_INTERVAL;

            // 二次识别：等待 token 期间页面可能已变化为结果页
            const current = detectResult();
            if (current) {
                clearInterval(timer);
                resolve(current);
                return;
            }

            const tokenInput = document.querySelector('input[name="cf-turnstile-response"]');
            const tokenReady = Boolean(tokenInput?.value) && tokenInput.value.length >= TOKEN_READY_MIN_LENGTH;

            if (tokenReady) {
                clearInterval(timer);
                signButton.click();
                resolve(createResult({
                    pending: true,
                    title: '已点击签到',
                    msg: '已点击签到，等待结果页面',
                }));
                return;
            }

            if (spent >= POLL_TIMEOUT) {
                clearInterval(timer);
                resolve(createResult({
                    sign: false,
                    title: '等待 Cloudflare 验证超时',
                    msg: '等待 Cloudflare Turnstile 验证完成超时',
                    detail: getPageText().full,
                }));
            }
        }, POLL_INTERVAL);
    });
}
