import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';

import {ttgMain} from '../src/options/utils/sign/signStrategies/ttg.js';

// executeScript sends the function body without the extension module scope.
function createPage({text = '签到', buttonPresent = true} = {}) {
    const observers = new Set();
    const timers = new Map();
    let nextTimer = 0;
    let clicks = 0;
    let currentText = text;
    let currentButtonPresent = buttonPresent;
    const parent = {};
    const region = {get innerText() {return currentText;}, parentElement: parent};
    const button = {
        innerText: '签到',
        click() {clicks += 1;},
    };
    const document = {
        documentElement: {dataset: {}},
        body: parent,
        querySelector(selector) {
            if (selector === '.smallfont #sp_signed') return region;
            if (selector === '.smallfont #sp_signed a#signed') return currentButtonPresent ? button : null;
            return null;
        },
    };
    const context = {
        document,
        MutationObserver: class {
            constructor(callback) {this.callback = callback;}
            observe() {observers.add(this);}
            disconnect() {observers.delete(this);}
        },
        setTimeout(callback, delay) {
            const id = ++nextTimer;
            timers.set(id, {callback, delay});
            return id;
        },
        clearTimeout(id) {timers.delete(id);},
    };
    return {
        run: () => runInNewContext(`(${ttgMain.toString()})()`, context),
        get clicks() {return clicks;},
        get activeObservers() {return observers.size;},
        get activeTimers() {return timers.size;},
        update(text, buttonPresent = false) {
            currentText = text;
            currentButtonPresent = buttonPresent;
            for (const observer of [...observers]) observer.callback([]);
        },
        expire() {
            assert.equal(timers.size > 0, true, 'waiting for a result must have a timeout');
            for (const [id, timer] of [...timers]) {
                assert.equal(timer.delay, 15000);
                timers.delete(id);
                timer.callback();
            }
        },
    };
}

test('TTG waits for the asynchronous signed state after exactly one click', async () => {
    const page = createPage();
    const pending = page.run();
    let settled = false;
    Promise.resolve(pending).then(() => {settled = true;});
    await Promise.resolve();

    assert.equal(page.clicks, 1);
    assert.equal(settled, false, 'the strategy must not return while the POST is still pending');

    page.update('已签到');
    const result = await pending;
    assert.equal(result.sign, true);
    assert.equal(result.pending, false);
    assert.equal(page.clicks, 1);
    assert.equal(page.activeObservers, 0);
    assert.equal(page.activeTimers, 0);
});

test('TTG recognizes an already signed page without clicking', async () => {
    const page = createPage({text: ' \n 已签到 \u00a0 ', buttonPresent: false});
    const result = await page.run();
    assert.equal(result.sign, true);
    assert.equal(result.pending, false);
    assert.equal(page.clicks, 0);
    assert.equal(page.activeTimers, 0);
});

test('TTG timeout remains unconfirmed and reinjection never clicks again', async () => {
    const page = createPage();
    const pending = page.run();
    page.expire();
    const result = await pending;
    assert.equal(result.sign, false);
    assert.equal(result.pending, true);
    assert.equal(result.status, 'action-triggered');
    assert.equal(page.clicks, 1);
    assert.equal(page.activeObservers, 0);
    assert.equal(page.activeTimers, 0);

    const second = page.run();
    assert.equal(page.clicks, 1);
    page.update('已签到');
    assert.equal((await second).sign, true);
    assert.equal(page.clicks, 1);
});

test('TTG disappearing button alone does not confirm sign-in', async () => {
    const page = createPage();
    const pending = page.run();
    page.update('正在处理');
    page.expire();
    const result = await pending;
    assert.equal(result.sign, false);
    assert.equal(result.pending, true);
    assert.equal(result.status, 'action-triggered');
    assert.equal(page.clicks, 1);
});

test('TTG missing entry is not treated as signed and does not click', async () => {
    const page = createPage({text: '', buttonPresent: false});
    const result = await page.run();
    assert.equal(result.sign, false);
    assert.equal(result.pending, false);
    assert.equal(page.clicks, 0);
    assert.equal(page.activeTimers, 0);
});

test('concurrent TTG injections share the one-click guard for the same document', async () => {
    const page = createPage();
    const first = page.run();
    const second = page.run();
    assert.equal(page.clicks, 1);
    page.update('已签到');
    const results = await Promise.all([first, second]);
    assert.equal(results.every(result => result.sign && !result.pending), true);
    assert.equal(page.clicks, 1);
    assert.equal(page.activeObservers, 0);
    assert.equal(page.activeTimers, 0);
});
