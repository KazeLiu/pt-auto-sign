import {getSettingData} from "../storage/settingData.js";

/**
 * 发送 IYUU 通知的方法
 * @param {string} text - 消息标题
 * @param {string} desp - 消息内容详情
 */
export const sendIyuuNotice = async (text, desp = '') => {
    let setting = await getSettingData();
    if (setting.iyuuId && setting.openIyuuPush) {
        const url = `https://iyuu.cn/${setting.iyuuId}.send`;

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

            const responseText = await response.text();
            let result = {
                errcode: response.ok ? 0 : response.status,
                errmsg: response.ok ? '' : response.statusText,
            };
            if (responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch (error) {
                    result = {
                        errcode: -1,
                        errmsg: '推送接口返回非 JSON 响应',
                        detail: error?.message ?? '',
                    };
                }
            }

            if (response.ok && result.errcode === 0) {
                return result;
            }

            console.error('发送出错了：', result.errmsg || response.statusText || result);
            return result;
        } catch (error) {
            console.error('网络请求错误：', error);
            return {
                errcode: -1,
                errmsg: error?.message ?? '网络请求错误',
            };
        }
    }

    return null;
};
