import test from 'node:test';
import assert from 'node:assert/strict';

import {hasUnsignedEnabledSite} from '../src/options/utils/autoSignState.js';

test('duplicate site names are rejected before they can share a sign record', async () => {
    const {validateSiteList} = await import('../src/options/utils/storage/siteValidation.js');
    assert.throws(() => validateSiteList([
        {name: 'same', site: 'https://one.example', siteType: 'nexusPHP'},
        {name: 'same', site: 'https://two.example', siteType: 'nexusPHP'},
    ]), /站点名称必须唯一/);
});

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
