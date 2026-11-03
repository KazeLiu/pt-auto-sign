export const PUSH_TIMEOUT_MS = 15000;
export const TELEGRAM_TEXT_LIMIT = 4096;

function redactMessage(message, secrets) {
    let text = String(message ?? '').trim() || '接口未提供错误说明';
    for (const secret of secrets.filter(Boolean)) {
        text = text.replaceAll(secret, '[已隐藏]').replaceAll(encodeURIComponent(secret), '[已隐藏]');
    }
    return text.slice(0, 300);
}

// Timeout covers both the request and reading its body; abort alone is not enough
// for transports that fail to settle after cancellation.
async function requestJson(url, body, {fetchImpl, timeoutMs}) {
    const controller = new AbortController();
    let timer;
    let timedOut = false;
    try {
        return await Promise.race([
            (async () => {
                const response = await fetchImpl(url, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json; charset=UTF-8'},
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    return {error: response.ok
                        ? '推送接口返回空内容或非 JSON 响应，无法确认发送结果'
                        : `推送接口 HTTP ${response.status}，请检查网络或服务状态`};
                }
                return {data, httpOk: response.ok, status: response.status};
            })(),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    timedOut = true;
                    controller.abort();
                    reject(new Error('Push request timed out'));
                }, timeoutMs);
            }),
        ]);
    } catch {
        return {error: timedOut
            ? '推送请求超时，发送结果未知；请先检查收件情况，避免重复推送'
            : '推送网络请求失败，请检查网络、代理或服务状态'};
    } finally {
        clearTimeout(timer);
    }
}

export function splitTelegramText(text) {
    const parts = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + TELEGRAM_TEXT_LIMIT, text.length);
        if (end < text.length) {
            const newline = text.lastIndexOf('\n', end - 1);
            if (newline >= start + TELEGRAM_TEXT_LIMIT / 2) {
                end = newline + 1;
            } else {
                const last = text.charCodeAt(end - 1);
                const next = text.charCodeAt(end);
                if (last >= 0xD800 && last <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF) end--;
            }
        }
        parts.push(text.slice(start, end));
        start = end;
    }
    return parts;
}

function telegramError(data, status, token) {
    const code = data?.error_code ?? status;
    const hints = {
        400: '请检查 Chat ID，并先向机器人发送 /start；群组需先加入机器人',
        401: '请检查 Bot Token 是否正确或已被撤销',
        403: '请解除对机器人的屏蔽，并检查它在目标会话的发送权限',
        429: '请求过于频繁，请稍后再试',
    };
    const retryAfter = data?.parameters?.retry_after;
    const wait = code === 429 && Number.isFinite(retryAfter) ? `（建议等待 ${retryAfter} 秒）` : '';
    return `Telegram 推送失败（${redactMessage(code, [token])}）：${redactMessage(data?.description, [token])}。${hints[code] || '请检查网络或 Telegram 服务状态'}${wait}`;
}

/** Send only the selected channel. Manual tests may bypass its enable switch. */
export async function sendPushWithSettings(settings, title, description = '', {
    force = false,
    fetchImpl = globalThis.fetch,
    timeoutMs = PUSH_TIMEOUT_MS,
} = {}) {
    const channel = settings.pushProvider ?? 'iyuu';
    const fail = message => ({ok: false, skipped: false, channel, message});
    if (!['iyuu', 'telegram'].includes(channel)) return fail('请选择有效的推送渠道');
    const enabled = channel === 'telegram' ? settings.openTelegramPush : settings.openIyuuPush;
    if (!force && !enabled) return {ok: true, skipped: true, channel, message: '推送已禁用'};

    const text = String(title ?? '');
    const desp = String(description ?? '');
    const requestOptions = {fetchImpl, timeoutMs};
    if (channel === 'iyuu') {
        const token = String(settings.iyuuId ?? '').trim();
        if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return fail('请填写有效的 IYUU Token（ID），无需填写完整网址');
        if (!text.trim()) return fail('推送标题不能为空');
        const response = await requestJson(`https://iyuu.cn/${token}.send`, {text, desp}, requestOptions);
        if (response.error) return fail(response.error);
        if (!response.httpOk || response.data?.errcode !== 0) {
            const code = response.data?.errcode ?? '缺少状态码';
            return fail(`IYUU 推送失败（HTTP ${response.status} / ${redactMessage(code, [token])}）：${redactMessage(response.data?.errmsg, [token])}`);
        }
        return {ok: true, skipped: false, channel, message: 'IYUU 已接受推送请求，请在微信查看', sentParts: 1, totalParts: 1};
    }

    const token = String(settings.telegramBotToken ?? '').trim();
    const chatId = String(settings.telegramChatId ?? '').trim();
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) return fail('请填写有效的 Telegram Bot Token');
    if (!/^(?:-?\d+|@[A-Za-z0-9_]+)$/.test(chatId)) return fail('请填写有效的 Chat ID（数字 ID 或 @频道用户名）');
    const parts = splitTelegramText([text, desp].filter(Boolean).join('\n\n'));
    if (!parts.length || parts.every(part => !part.trim())) return fail('推送内容不能为空');

    let sentParts = 0;
    for (const part of parts) {
        const response = await requestJson(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: part,
            link_preview_options: {is_disabled: true},
        }, requestOptions);
        if (response.error || !response.httpOk || response.data?.ok !== true) {
            const message = response.error || telegramError(response.data, response.status, token);
            return {...fail(sentParts ? `已发送 ${sentParts}/${parts.length} 条，后续停止发送。${message}` : message), sentParts, totalParts: parts.length};
        }
        sentParts++;
    }
    return {ok: true, skipped: false, channel, message: `Telegram 已接受推送请求（${sentParts} 条），请在目标会话查看`, sentParts, totalParts: parts.length};
}
