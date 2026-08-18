export async function nexusPHP() {
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

    const normalizeText = (text = '') => String(text)
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\s*\n\s*/g, '\n')
        .trim();

    const getFirstText = (selectors) => {
        for (const selector of selectors) {
            const text = normalizeText(document.querySelector(selector)?.innerText ?? '');
            if (text) return text;
        }
        return '';
    };

    const getTextList = (selectors) => selectors
        .flatMap(selector => Array.from(document.querySelectorAll(selector)))
        .map(node => normalizeText(node.innerText ?? node.textContent ?? ''))
        .filter(Boolean);

    // 等待并关闭 layui 弹窗（支持倒计时）
    const waitAndCloseLayuiModal = async () => {
        const MAX_WAIT = 15000; // 最多等待 15 秒
        const POLL_INTERVAL = 500; // 每 500ms 检查一次
        const startTime = Date.now();

        while (Date.now() - startTime < MAX_WAIT) {
            // 查找可见的 layui 弹窗
            const modal = document.querySelector('.layui-layer:not([style*="display: none"])');
            if (!modal || window.getComputedStyle(modal).display === 'none') {
                log('[nexusPHP] 未检测到 layui 弹窗或已关闭');
                return true; // 没有弹窗或已关闭
            }

            // 查找 layui 弹窗的确认按钮
            const button = modal.querySelector('.layui-layer-btn0');
            if (!button || window.getComputedStyle(button).display === 'none') {
                log('[nexusPHP] 找不到 layui 按钮');
                return false; // 找不到按钮
            }

            // 检查按钮是否可点击
            const style = window.getComputedStyle(button);
            const pointerEvents = style.pointerEvents;
            const text = (button.innerText || button.textContent || '').trim();
            const isCountdown = /请等待|等待|\(\d+\)/.test(text);

            if (pointerEvents !== 'none' && !isCountdown) {
                // 按钮可点击，立即点击
                try {
                    button.click();
                    log(`[nexusPHP] 已点击 layui 弹窗按钮: ${text}`);
                    // 等待弹窗消失
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return true;
                } catch (e) {
                    log(`[nexusPHP] 点击 layui 弹窗按钮失败:`, e);
                    return false;
                }
            }

            // 按钮还在倒计时，继续等待
            log(`[nexusPHP] layui 弹窗倒计时中: ${text}，继续等待...`);
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }

        log('[nexusPHP] 等待 layui 弹窗超时');
        return false;
    };

    // 异步等待并关闭弹窗
    const modalClosed = await waitAndCloseLayuiModal();
    const modalStillVisible = Boolean(document.querySelector('.layui-layer:not([style*="display: none"])'));
    if (!modalClosed && modalStillVisible) {
        const modalText = normalizeText(document.querySelector('.layui-layer')?.innerText ?? '');
        return {
            sign: false,
            pending: true,
            status: 'page-barrier',
            title: '页面弹窗未完成',
            text: modalText,
            msg: '页面弹窗未完成，待确认',
            detail: modalText,
            logs: logs.join('\n'),
        };
    }

    const signTitle = getFirstText([
        'td.outer table.main .embedded h2',
        'table.main .embedded h2',
        '.embedded h2',
        'h2',
        'h1',
        'title'
    ]) || normalizeText(document.title ?? '');

    const signText = normalizeText(Array.from(new Set(getTextList([
        'td.outer table.main .embedded table .text',
        'td.outer table.main .embedded .text',
        'table.main .embedded table .text',
        '.embedded .text',
        'td.text',
        '.text'
    ]))).join('\n'));

    const bodyText = normalizeText(document.body?.innerText ?? '');
    const fullText = normalizeText([signTitle, signText, bodyText].filter(Boolean).join('\n'));
    const lines = fullText.split('\n').map(line => line.trim()).filter(Boolean);

    const successPatterns = [
        /签到成功/,
        /簽到成功/,
        /(?:今天|今日|本日).{0,12}已(?:经|經)?[签簽]到/,
        /(?:已|已经|已經)[签簽]到/,
        /(?:已经|已經)[签簽]过/,
        /感谢[，,\s]*(?:今天|今日).{0,8}已(?:经|經)?[签簽]到/,
        /感謝[，,\s]*(?:今天|今日).{0,8}已(?:經)?簽到/,
        /请勿重复[签簽]到/,
        /請勿重複簽到/,
        /不要重复[签簽]到/
    ];
    const failurePatterns = [
        /(?:请|請).{0,8}(?:登录|登入|登錄)/,
        /(?:未|没有|沒有).{0,4}(?:登录|登入|登錄)/,
        /权限不足/,
        /權限不足/,
        /无权访问/,
        /無權訪問/,
        /页面不存在/,
        /頁面不存在/
    ];

    const matchLine = (patterns) => lines.find(line => patterns.some(pattern => pattern.test(line))) ?? '';
    const successLine = matchLine(successPatterns);
    const failureLine = matchLine(failurePatterns);

    log(`[nexusPHP] 提取结果 - 标题: ${signTitle}, 成功行: ${successLine}, 失败行: ${failureLine}`);

    const logsText = logs.join('\n');

    // NexusPHP 常把"今日已签到/请勿重复签到"放在抱歉或错误页正文里，正文命中才算成功。
    if (successLine && !failureLine) {
        return {
            sign: true,
            pending: false,
            status: 'signed',
            title: signTitle,
            text: signText || bodyText,
            msg: successLine || signTitle || '签到成功',
            detail: signText || bodyText,
            logs: logsText,
        };
    }

    //所有策略都失败
    return {
        sign: false,
        pending: false,
        status: 'failed',
        title: signTitle,
        text: signText || bodyText,
        msg: failureLine || signTitle || signText || '未识别到 NexusPHP 签到结果',
        detail: signText || bodyText,
        logs: logsText,
    };
}
