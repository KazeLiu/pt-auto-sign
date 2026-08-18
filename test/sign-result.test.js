import test from 'node:test';
import assert from 'node:assert/strict';

import {
    isConfirmedSignResult,
    isRecordSignedOnDate,
    mergeSignRecord,
} from '../src/options/utils/sign/signResult.js';
import {getSignStrategy} from '../src/options/utils/sign/signStrategies/index.js';

test('unknown site types do not silently fall back to a different strategy', () => {
    assert.equal(getSignStrategy('unknown-site-type'), undefined);
});

test('action-triggered results are not treated as confirmed sign-ins', () => {
    assert.equal(isConfirmedSignResult({
        sign: false,
        pending: true,
        status: 'action-triggered',
    }), false);

    assert.equal(isConfirmedSignResult({
        sign: true,
        status: 'signed',
    }), true);
});

test('current daily result overrides historical dates', () => {
    const record = {
        key: 'demo',
        dates: ['2026-08-18'],
        dailyResults: {
            '2026-08-18': {
                sign: false,
                pending: true,
                status: 'action-triggered',
                date: '2026-08-18',
            },
        },
    };

    assert.equal(isRecordSignedOnDate(record, '2026-08-18'), false);
});

test('failed retry does not make the current day look successful', () => {
    const next = mergeSignRecord({
        key: 'demo',
        dates: ['2026-08-18'],
        dailyResults: {
            '2026-08-18': {
                sign: true,
                pending: false,
                status: 'signed',
                date: '2026-08-18',
            },
        },
        lastResult: null,
    }, 'demo', {
        sign: false,
        pending: false,
        status: 'failed',
        msg: '未识别到结果',
    }, '2026-08-18');

    assert.equal(isRecordSignedOnDate(next, '2026-08-18'), false);
    assert.deepEqual(next.dates, ['2026-08-18']);
});
