import test from 'node:test';
import assert from 'node:assert/strict';

import {hasUnsignedEnabledSite} from '../src/options/utils/autoSignState.js';

test('missed auto-sign recovery checks every enabled site', () => {
    const sites = [
        {name: 'A', enabled: true},
        {name: 'B', enabled: true},
    ];
    const records = [
        {key: 'A', dates: ['2026-08-18']},
    ];

    assert.equal(hasUnsignedEnabledSite(sites, records, '2026-08-18'), true);
});

test('disabled sites do not block auto-sign completion', () => {
    const sites = [
        {name: 'A', enabled: true},
        {name: 'B', enabled: false},
    ];
    const records = [
        {key: 'A', dailyResults: {
            '2026-08-18': {sign: true, status: 'signed', date: '2026-08-18'},
        }},
    ];

    assert.equal(hasUnsignedEnabledSite(sites, records, '2026-08-18'), false);
});
