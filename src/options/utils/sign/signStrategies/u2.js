/**
 * 自动签到函数
 *
 * 该函数用于在特定网页中自动完成签到操作。
 * 它会查找页面中的签到区域，自动填写签到内容并提交。
 *
 * @returns {Object} 返回签到结果对象
 * - sign {boolean}: 是否成功执行签到操作
 * - pending {boolean}: 是否已触发签到但需要等待页面刷新
 * - title {string}: 签到区域标题（可选）
 * - text {string}: 签到区域文本内容（可选）
 * - msg {string}: 提示信息
 * - detail {string}: 详细信息
 */
export function u2Main() {
    const actionStorageKey = 'pt-auto-sign:u2-action-started-at';
    const getLastActionAt = () => {
        try {
            return Number(window.sessionStorage?.getItem(actionStorageKey)) || 0;
        } catch {
            return 0;
        }
    };
    const rememberAction = () => {
        try {
            window.sessionStorage?.setItem(actionStorageKey, String(Date.now()));
        } catch {
            // 无法访问 sessionStorage 时仍允许本次提交。
        }
    };
    const clearAction = () => {
        try {
            window.sessionStorage?.removeItem(actionStorageKey);
        } catch {
            // 忽略受限页面的存储异常。
        }
    };
    const signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText ?? '';
    const signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText ?? '';
    const normalizedTitle = String(signTitle).replace(/\s+/g, '').trim();
    const normalizedText = String(signText).replace(/\s+/g, '').trim();

    // 已经签到成功（刷新后的状态）
    if (/感谢[，,]?(?:今天|今日)已签到[。.]?/.test(normalizedText)) {
        clearAction();
        return {
            sign: true,
            pending: false,
            title: signTitle,
            text: signText,
            msg: '今日已签到',
            detail: signText
        };
    }

    // 还在签到页，尝试提交
    if (normalizedTitle === '签到区') {
        const textarea = document.querySelector('td.outer table.main .embedded textarea');
        const submitBtn = document.querySelector('td.outer table.main .embedded table.captcha input[type=submit]');

        if (textarea && submitBtn) {
            if (Date.now() - getLastActionAt() < 60_000) {
                return {
                    sign: false,
                    pending: true,
                    status: 'action-triggered',
                    title: signTitle,
                    text: signText,
                    msg: '签到请求已触发，等待页面确认',
                    detail: signText
                };
            }
            textarea.value = '59个UCoin';
            textarea.dispatchEvent(new Event('input', {bubbles: true}));
            textarea.dispatchEvent(new Event('change', {bubbles: true}));
            rememberAction();
            submitBtn.click();

            return {
                sign: false,
                pending: true,
                title: signTitle,
                text: signText,
                msg: '已提交签到，等待页面刷新',
                detail: signText
            };
        }

        return {
            sign: false,
            pending: false,
            title: signTitle,
            text: signText,
            msg: '未找到签到输入框或提交按钮',
            detail: signText
        };
    }

    // 兜底失败
    return {
        sign: false,
        pending: false,
        title: signTitle,
        text: signText,
        msg: '未识别到 U2 签到区域',
        detail: signText
    };
}
