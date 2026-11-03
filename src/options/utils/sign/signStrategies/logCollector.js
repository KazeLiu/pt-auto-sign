/**
 * 策略日志收集器
 *
 * 用于在策略执行时收集所有日志，并附加到返回结果的 logs 字段中。
 */

/**
 * 创建日志收集器
 * @returns {{log: Function, getLogs: Function}}
 */
export function createLogCollector() {
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
        console.log(...args); // 同时输出到控制台
    };

    const getLogs = () => logs.join('\n');

    return { log, getLogs };
}

/**
 * 包装策略结果，附加日志
 * @param {Object} result - 策略返回的结果对象
 * @param {string} logs - 收集到的日志字符串
 * @returns {Object} 附加了日志的结果对象
 */
export function attachLogs(result, logs) {
    if (!result || typeof result !== 'object') {
        return result;
    }

    return {
        ...result,
        logs: logs || '',
        // 如果 detail 为空，将日志附加到 detail
        detail: result.detail || logs || '',
    };
}
