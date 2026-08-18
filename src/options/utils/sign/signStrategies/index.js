import {nexusPHP} from "./nexusPHP.js";
import {hanhanMain} from "./hanhan.js";
import {haidanMain} from "./haidan.js";
import {btSchoolMain} from "./btSchool.js";
import {ttgMain} from "./ttg.js";
import {u2Main} from "./u2.js";
import {onlineMian} from "./online.js";
import {pttMain} from "./ptt.js";
import {PterMain} from "./PTer.js";
import {RousiMain} from "./Rousi.js";
import {ssdMain} from "./ssd.js";
import {xloliMain} from "./xloli.js";

const STRATEGY_MAP = {
    HANHAN: hanhanMain,
    HAIDAN: haidanMain,
    BTSCHOOL: btSchoolMain,
    TTG: ttgMain,
    U2: u2Main,
    PTT: pttMain,
    PTER: PterMain,
    ROUSI: RousiMain,
    SSD: ssdMain,
    XLOLI: xloliMain,
    online: onlineMian,
    nexusPHP,
};

/**
 * 创建统一格式的签到结果对象。
 *
 * 用于后台侧对策略返回结果进行归一化，避免业务层分别处理不同字段结构。
 * 注意：注入网页执行的策略函数不能依赖此方法，因为页面上下文无法直接访问扩展模块作用域。
 *
 * @param {{
 *   sign?: boolean,
 *   pending?: boolean,
 *   title?: string,
 *   text?: string,
 *   msg?: string,
 *   detail?: string
 * }} [options={}] - 签到结果字段。
 * @returns {{sign: boolean, pending: boolean, title: string, text: string, msg: string, detail: string}} 统一返回体。
 */
export function createSignResult({
    sign = false,
    pending = false,
    title = '',
    text = '',
    msg = '',
    detail = '',
} = {}) {
    return {
        sign,
        pending,
        title,
        text,
        msg: msg || title || text || (sign ? '签到成功' : '签到失败'),
        detail: detail || text,
    };
}

/**
 * 轮询页面 DOM 状态，直到检测到明确签到结果或超时。
 *
 * 适合用于点击签到按钮后等待页面异步反馈的场景。
 * 注意：该方法仅供扩展侧使用，注入网页的策略函数应自行在函数体内实现等待逻辑。
 *
 * @param {{
 *   interval?: number,
 *   timeout?: number,
 *   check: () => any,
 *   onTimeout?: () => any
 * }} [options={}] - 轮询配置。
 * @returns {Promise<any>} `check` 或 `onTimeout` 返回的结果。
 */
export function waitForDomResult({
    interval = 500,
    timeout = 15000,
    check,
    onTimeout,
} = {}) {
    return new Promise((resolve) => {
        let elapsed = 0;
        const timer = setInterval(() => {
            elapsed += interval;
            const result = check();
            if (result?.sign || result?.pending) {
                clearInterval(timer);
                resolve(result);
                return;
            }

            if (elapsed >= timeout) {
                clearInterval(timer);
                resolve(onTimeout ? onTimeout() : createSignResult({msg: '等待页面结果超时'}));
            }
        }, interval);
    });
}

/**
 * 根据站点类型获取对应的签到策略函数。
 *
 * 未命中时返回 `undefined`，由调度器记录为策略缺失，避免错误配置被当成通用站点执行。
 *
 * @param {string} siteType - 站点类型标识。
 * @returns {Function} 对应的签到策略函数。
 */
export function getSignStrategy(siteType) {
    return STRATEGY_MAP[siteType];
}
