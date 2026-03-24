/**
 * 休眠指定时长。
 *
 * 常用于轮询、节流或等待页面状态变化。
 *
 * @param {number} ms - 等待时长，单位毫秒。
 * @returns {Promise<void>}
 */
export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * 在新标签页中打开链接，并阻止新页面访问当前窗口上下文。
 *
 * @param {string} url - 目标链接。
 * @returns {Window | null} 新打开的窗口对象。
 */
export const openInNewTab = (url) => window.open(url, '_blank', 'noopener,noreferrer');

/**
 * 将日期对象格式化为 `YYYY-MM-DD` 字符串。
 *
 * @param {Date} [date=new Date()] - 目标日期对象。
 * @returns {string} 格式化后的日期字符串。
 */
export const getDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
