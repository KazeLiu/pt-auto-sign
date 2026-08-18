import test from 'node:test';
import assert from 'node:assert/strict';

import {enqueueModification} from '../src/options/utils/storage/modifyQueue.js';

test('list updates are serialized to avoid lost writes', async () => {
    let value = [];
    const queues = new Map();

    const modify = (action) => enqueueModification(queues, 'items', async () => {
        const list = structuredClone(value);
        const next = await action(list);
        await new Promise(resolve => setTimeout(resolve, 5));
        value = structuredClone(next);
        return next;
    });

    await Promise.all([
        modify(list => [...list, {key: 'A'}]),
        modify(list => [...list, {key: 'B'}]),
    ]);

    assert.deepEqual(value.map(item => item.key).sort(), ['A', 'B']);
});
