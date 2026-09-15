import test from 'node:test';
import assert from 'node:assert/strict';

import {hanhanMain} from '../src/options/utils/sign/signStrategies/hanhan.js';
import {nexusPHP} from '../src/options/utils/sign/signStrategies/nexusPHP.js';
import {onlineMian} from '../src/options/utils/sign/signStrategies/online.js';
import {u2Main} from '../src/options/utils/sign/signStrategies/u2.js';
import {xloliMain} from '../src/options/utils/sign/signStrategies/xloli.js';

async function withPageGlobals({document, window}, action) {
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    globalThis.document = document;
    globalThis.window = window;
    try {
        return await action();
    } finally {
        globalThis.document = previousDocument;
        globalThis.window = previousWindow;
    }
}

test('online strategy does not mark a login page as visited', () => withPageGlobals({
    document: {
        title: '登录',
        body: {innerText: '请登录后继续'},
        querySelector: selector => selector === "input[type='password']" ? {} : null,
    },
    window: {location: {pathname: '/login', href: 'https://example.test/login'}},
}, () => {
    const result = onlineMian();
    assert.equal(result.sign, false);
    assert.equal(result.status, 'login-required');
}));

test('hanhan strategy requires signed wording instead of element presence alone', () => withPageGlobals({
    document: {querySelector: () => ({innerText: '立即注册'})},
    window: {},
}, () => {
    assert.equal(hanhanMain().sign, false);
}));

test('nexusPHP does not click unrelated layui dialogs', async () => {
    let clicks = 0;
    const modal = {
        innerText: '欢迎来到站点',
        querySelector: () => ({
            style: {},
            innerText: '确认',
            click: () => clicks++,
        }),
    };
    const result = await withPageGlobals({
        document: {
            title: '签到页',
            body: {innerText: '签到区'},
            querySelector: selector => selector.includes('.layui-layer') ? modal : null,
            querySelectorAll: () => [],
        },
        window: {getComputedStyle: () => ({display: 'block', pointerEvents: 'auto'})},
    }, () => nexusPHP());

    assert.equal(clicks, 0);
    assert.equal(result.sign, false);
    assert.equal(result.status, 'page-barrier');
    assert.equal(result.pending, true);
});

test('xloli captcha failure is ambiguous rather than confirmed success', async () => {
    const result = await withPageGlobals({
        document: {
            body: {innerText: 'Captcha verification failed'},
            querySelector: selector => selector.includes('h2')
                ? {innerText: '签到'}
                : selector.includes('.text') ? {innerText: 'Captcha verification failed'} : null,
        },
        window: {location: {href: 'https://example.test/attendance.php'}},
    }, () => xloliMain());

    assert.equal(result.sign, false);
    assert.equal(result.pending, true);
    assert.equal(result.status, 'ambiguous-result');
});

test('u2 strategy dispatches form events before submitting', async () => {
    const events = [];
    let clicks = 0;
    const textarea = {
        value: '',
        dispatchEvent: event => events.push(event.type),
    };
    const submit = {click: () => clicks++};
    const sessionValues = new Map();

    const results = await withPageGlobals({
        document: {
            querySelector: selector => {
                if (selector.endsWith('h2')) return {innerText: '签到区'};
                if (selector.endsWith('.text')) return {innerText: ''};
                if (selector.endsWith('textarea')) return textarea;
                if (selector.includes('input[type=submit]')) return submit;
                return null;
            },
        },
        window: {
            sessionStorage: {
                getItem: key => sessionValues.get(key) ?? null,
                setItem: (key, value) => sessionValues.set(key, value),
                removeItem: key => sessionValues.delete(key),
            },
        },
    }, () => [u2Main(), u2Main()]);

    assert.deepEqual(events, ['input', 'change']);
    assert.equal(clicks, 1);
    assert.equal(results[0].pending, true);
    assert.equal(results[1].status, 'action-triggered');
});
