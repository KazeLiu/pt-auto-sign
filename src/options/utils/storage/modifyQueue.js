export function enqueueModification(queueMap, key, action) {
    const previous = queueMap.get(key) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(action);

    queueMap.set(key, current);
    return current.finally(() => {
        if (queueMap.get(key) === current) {
            queueMap.delete(key);
        }
    });
}
