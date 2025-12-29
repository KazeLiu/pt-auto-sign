import {iyuuToken} from "../../constant/index.js";

/**
 * 发送 IYUU 通知的方法
 * @param {string} text - 消息标题
 * @param {string} desp - 消息内容详情
 */
export const sendIyuuNotice = async (text, desp = '') => {
    const url = `https://iyuu.cn/${iyuuToken}.send`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                text: text,
                desp: desp
            }),
        });

        const result = await response.json();

        if (result.errcode === 0) {
            return result;
        } else {
            console.error('发送出错了：', result.errmsg);
        }
    } catch (error) {
        console.error('网络请求错误：', error);
        throw error;
    }
};