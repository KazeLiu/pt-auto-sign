import test from 'node:test';
import assert from 'node:assert/strict';
import {PUSH_TIMEOUT_MS, sendPushWithSettings, splitTelegramText} from '../src/options/utils/push/transport.js';

const iyuuSettings = {openIyuuPush: true, iyuuId: 'IYUU_TEST_TOKEN'};
const telegramSettings = {
    pushProvider: 'telegram',
    openTelegramPush: true,
    telegramBotToken: '123456:TEST_BOT_TOKEN',
    telegramChatId: '-1001234567890',
};
const replyRaw = (text, status = 200) => ({ok: status >= 200 && status < 300, status, text: async () => text});
const reply = (data, status) => replyRaw(JSON.stringify(data), status);

test('legacy IYUU settings keep working and use the documented JSON body', async () => {
    let request;
    const result = await sendPushWithSettings({...iyuuSettings, iyuuId: ' IYUU_TEST_TOKEN '}, '标题', '详情', {
        fetchImpl: async (url, options) => {
            request = {url, options};
            return reply({errcode: 0, errmsg: 'ok'});
        },
    });
    assert.equal(result.ok, true);
    assert.equal(result.channel, 'iyuu');
    assert.equal(request.url, 'https://iyuu.cn/IYUU_TEST_TOKEN.send');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['Content-Type'], 'application/json; charset=UTF-8');
    assert.deepEqual(JSON.parse(request.options.body), {text: '标题', desp: '详情'});
});

test('automatic notices obey the selected channel switch; disabled notices make no request', async () => {
    const fetchImpl = () => {throw new Error('must not request');};
    for (const settings of [
        {...iyuuSettings, openIyuuPush: false},
        {...telegramSettings, ...iyuuSettings, openTelegramPush: false},
    ]) {
        const result = await sendPushWithSettings(settings, 'title', '', {fetchImpl});
        assert.equal(result.skipped, true);
        assert.equal(result.ok, true);
    }
});

test('manual tests use current input even with automatic push disabled', async () => {
    let url;
    const result = await sendPushWithSettings({pushProvider: 'iyuu', iyuuId: 'IYUU_NEW_INPUT', openIyuuPush: false}, 'test', '', {
        force: true,
        fetchImpl: async target => {url = target; return reply({errcode: 0});},
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
    assert.equal(url, 'https://iyuu.cn/IYUU_NEW_INPUT.send');
});

test('Telegram sends plain text once to the selected channel, with trimmed string IDs', async () => {
    const requests = [];
    const title = '站点_[abc]<test>';
    const result = await sendPushWithSettings({
        ...iyuuSettings,
        ...telegramSettings,
        telegramBotToken: ' 123456:TEST_BOT_TOKEN ',
        telegramChatId: ' -1001234567890 ',
    }, title, '签到成功 🎉', {
        fetchImpl: async (url, options) => {requests.push({url, options}); return reply({ok: true, result: {message_id: 1}});},
    });
    assert.equal(result.ok, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.telegram.org/bot123456:TEST_BOT_TOKEN/sendMessage');
    assert.deepEqual(JSON.parse(requests[0].options.body), {
        chat_id: '-1001234567890', text: `${title}\n\n签到成功 🎉`, link_preview_options: {is_disabled: true},
    });
});

test('invalid credentials or channel fail before any network request', async () => {
    let calls = 0;
    const fetchImpl = () => {calls++; throw new Error('unexpected request');};
    for (const settings of [
        {...iyuuSettings, iyuuId: ''},
        {...iyuuSettings, iyuuId: '../bad?token=x'},
        {...telegramSettings, telegramBotToken: 'not-a-token'},
        {...telegramSettings, telegramChatId: 'https://example.org/'},
        {...telegramSettings, pushProvider: 'unknown'},
    ]) {
        assert.equal((await sendPushWithSettings(settings, 'test', '', {fetchImpl})).ok, false);
    }
    assert.equal(calls, 0);
});

test('IYUU never treats empty, malformed or missing business status responses as success', async () => {
    for (const raw of ['', ' ', '<html>502</html>', '{}', 'null', '{"errcode":"0"}']) {
        const result = await sendPushWithSettings(iyuuSettings, 'test', '', {fetchImpl: async () => replyRaw(raw)});
        assert.equal(result.ok, false, raw);
        assert.ok(result.message);
    }
});

test('IYUU exposes service errors and requires HTTP success too', async () => {
    const denied = await sendPushWithSettings(iyuuSettings, 'test', '', {fetchImpl: async () => reply({errcode: 1001, errmsg: 'Token 无效'})});
    assert.equal(denied.ok, false);
    assert.match(denied.message, /1001.*Token 无效/);
    const unavailable = await sendPushWithSettings(iyuuSettings, 'test', '', {fetchImpl: async () => reply({errcode: 0}, 503)});
    assert.equal(unavailable.ok, false);
    assert.match(unavailable.message, /HTTP 503 \/ 0/);
});

test('Telegram validates both HTTP and business success', async () => {
    for (const response of [reply({ok: false, description: 'Bad Request'}, 200), reply({ok: true}, 502), reply({}), reply(null), replyRaw('')]) {
        const result = await sendPushWithSettings(telegramSettings, 'test', '', {fetchImpl: async () => response});
        assert.equal(result.ok, false);
    }
});

test('Telegram errors explain token, chat, permissions and rate limits without retrying', async () => {
    for (const [code, hint] of [[400, /Chat ID/], [401, /Bot Token/], [403, /权限/], [429, /等待 30 秒/]]) {
        let calls = 0;
        const result = await sendPushWithSettings(telegramSettings, 'test', '', {
            fetchImpl: async () => {calls++; return reply({ok: false, error_code: code, description: 'rejected', parameters: {retry_after: 30}}, code);},
        });
        assert.equal(result.ok, false);
        assert.match(result.message, hint);
        assert.equal(calls, 1);
    }
});

test('long messages preserve all text, emoji and newlines in bounded parts', async () => {
    const text = 'a'.repeat(4095) + '🎉' + '\n' + ('站点_[x] 已签到\n'.repeat(1000));
    const parts = splitTelegramText(text);
    assert.equal(parts.join(''), text);
    assert.ok(parts.length > 2);
    for (const part of parts) {
        assert.ok(part.length <= 4096 && part.length > 0);
        assert.equal(/[\uD800-\uDBFF]$/.test(part), false);
        assert.equal(/^[\uDC00-\uDFFF]/.test(part), false);
    }
    const sent = [];
    const result = await sendPushWithSettings(telegramSettings, '', text, {
        fetchImpl: async (_, options) => {sent.push(JSON.parse(options.body).text); return reply({ok: true});},
    });
    assert.equal(result.ok, true);
    assert.equal(result.sentParts, parts.length);
    assert.deepEqual(sent, parts);
});

test('partial Telegram failure stops remaining parts and never resends accepted parts', async () => {
    let calls = 0;
    const result = await sendPushWithSettings(telegramSettings, '', 'x'.repeat(10000), {
        fetchImpl: async () => ++calls === 1 ? reply({ok: true}) : reply({ok: false, error_code: 429, description: 'Too Many Requests'}, 429),
    });
    assert.equal(calls, 2);
    assert.equal(result.ok, false);
    assert.equal(result.sentParts, 1);
    assert.equal(result.totalParts, 3);
    assert.match(result.message, /已发送 1\/3 条/);
});

test('timeouts bound hung requests and body reads, aborting without throwing', async () => {
    assert.equal(PUSH_TIMEOUT_MS, 15000);
    for (const hangOnBody of [false, true]) {
        let signal;
        const result = await sendPushWithSettings(telegramSettings, 'test', '', {
            timeoutMs: 10,
            fetchImpl: async (_, options) => {
                signal = options.signal;
                return hangOnBody ? {ok: true, status: 200, text: () => new Promise(() => {})} : new Promise(() => {});
            },
        });
        assert.equal(result.ok, false);
        assert.match(result.message, /超时.*结果未知/);
        assert.equal(signal.aborted, true);
    }
});

test('credentials are redacted from service failures and network exceptions', async () => {
    for (const settings of [iyuuSettings, telegramSettings]) {
        const token = settings.iyuuId || settings.telegramBotToken;
        const echo = `bad ${token} encoded=${encodeURIComponent(token)}`;
        for (const fetchImpl of [
            async () => reply({errcode: 1, errmsg: echo, ok: false, error_code: 401, description: echo}, 401),
            async () => {throw new Error(`fetch failed at https://example.org/${token}`);},
        ]) {
            const result = await sendPushWithSettings(settings, 'test', '', {fetchImpl});
            assert.equal(result.ok, false);
            assert.equal(JSON.stringify(result).includes(token), false);
            assert.equal(JSON.stringify(result).includes(encodeURIComponent(token)), false);
        }
    }
});
