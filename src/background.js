import { SETTINGS_KEY } from "./options/utils/storage/settingData.js";

console.log("Hello from the PT sign");

// 常量定义：定时器名称与自动签到标记
const ALARM_NAME = 'AUTO_SIGN_ALARM';
const AUTO_SIGN_FLAG_KEY = 'last_auto_sign_date';

/**
 * 辅助函数：触发签到独立窗口弹窗
 */
function triggerSignWindow() {
    const baseUrl = chrome.runtime.getURL('src/options/index.html');
    const url = `${baseUrl}#/Home?action=autoSign`;

    // 创建一个聚焦的独立新窗口来执行签到，方便处理可能出现的动态验证
    chrome.windows.create({
        url: url,
        type: 'normal',
        width: 1600,
        height: 800,
        focused: true
    }, (window) => {
        console.log('[自动签到] 已弹出独立窗口，窗口 ID:', window.id);
    });
}

/**
 * 辅助函数：计算下一次触发的时间戳
 * @param {string} timeStr - 格式为 "HH:mm" 的时间字符串
 * @returns {number} 目标时间戳
 */
function calculateNextAlarmTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();

    target.setHours(hours, minutes, 0, 0);

    // 如果今天设定的时间已经过了，则将目标时间推迟到明天的同一时刻
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime();
}

/**
 * 核心函数：检测是否因关机错过了今天的自动签到，并在需要时触发补签
 * @param {Object} settings - 用户设置数据
 */
async function checkMissedAutoSign(settings) {
    if (!settings.autoSign || !settings.autoSignTime) return;

    const [hours, minutes] = settings.autoSignTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // 如果当前时间还未到今天设定的签到时间，则无需补救
    if (now.getTime() <= target.getTime()) return;

    const todayStr = now.toISOString().split('T')[0];
    const localData = await chrome.storage.local.get([AUTO_SIGN_FLAG_KEY, 'site_sign_records']);

    // 1. 检查今天是否已经触发过自动签到（防止浏览器多次重启重复弹窗）
    if (localData[AUTO_SIGN_FLAG_KEY] === todayStr) return;

    // 2. 检查具体的签到记录，看是否有站点还没签到
    const records = localData.site_sign_records || [];
    const hasSignedToday = records.some(item => item.dates && item.dates.includes(todayStr));

    // 只要今天没有留下任何签到成功的记录，说明需要执行一次全部签到
    if (!hasSignedToday) {
        console.log('[自动签到] 检测到错过今日签到时间，准备执行补救签到！🚀');
        // 更新今日已触发标记
        await chrome.storage.local.set({ [AUTO_SIGN_FLAG_KEY]: todayStr });
        triggerSignWindow();
    }
}

/**
 * 核心函数：初始化或更新自动签到定时器
 */
async function setupAutoSignAlarm() {
    try {
        const result = await chrome.storage.local.get(SETTINGS_KEY);
        const settings = result[SETTINGS_KEY] || {};

        // 无论如何，先清除旧的定时器，避免重复触发
        await chrome.alarms.clear(ALARM_NAME);

        // 判断是否启用了自动签到，并且配置了具体时间
        if (settings.autoSign && settings.autoSignTime) {
            // 每次初始化时，顺便检查一下是否漏签
            await checkMissedAutoSign(settings);

            const nextTime = calculateNextAlarmTime(settings.autoSignTime);

            // 创建新定时器
            chrome.alarms.create(ALARM_NAME, {when: nextTime});
            console.log(`[自动签到] 已开启，下次执行时间为 ${new Date(nextTime).toLocaleString()}`);
        } else {
            console.log('[自动签到] 未开启或未配置时间。');
        }
    } catch (error) {
        console.error('[自动签到] 获取设置失败:', error);
    }
}

// 监听器：处理定时器触发事件
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'TEST_QUICK_ALARM') {
        console.log('叮咚！1分钟测试定时器触发成功啦！⏰');
        console.log('只要你能看到这条消息，就说明 Chrome 的 Alarms API 运行完全正常哟～');
        return;
    }

    if (alarm.name === ALARM_NAME) {
        console.log('[自动签到] 时间到，正在触发弹窗签到任务！');

        const todayStr = new Date().toISOString().split('T')[0];

        // 定时器正常触发时，也要记录今日标记，避免重启浏览器时误判漏签
        chrome.storage.local.set({ [AUTO_SIGN_FLAG_KEY]: todayStr }).then(() => {
            triggerSignWindow();
            // 重新设置明天的定时器
            setupAutoSignAlarm();
        });
    }
});

// 监听器：监听 Storage 的变化，以便在 Setting.vue 中修改设置后立即生效
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[SETTINGS_KEY]) {
        console.log('[自动签到] 检测到设置更新，正在重新配置定时器...');
        setupAutoSignAlarm();
    }
});

// 监听器：插件安装或更新时初始化定时器
chrome.runtime.onInstalled.addListener(() => {
    setupAutoSignAlarm();
});

// 监听器：浏览器每次启动时重新检查并初始化定时器
chrome.runtime.onStartup.addListener(() => {
    setupAutoSignAlarm();
});