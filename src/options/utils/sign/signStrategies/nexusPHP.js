import browser from "webextension-polyfill";
import {sleep} from "../../index.js";

export function nexusPHP() {
    let signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText;
    let signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText;
    // 这是正常的nexus架构页面，进入就算是签到成功
    if (signTitle === '抱歉' || signTitle === '错误' || signTitle.includes('签到成功')) {
        return {
            sign: true,
            title: signTitle,
            text: signText
        }
    }
    //所有策略都失败
    return {
        sign: false
        , title: signTitle,
        text: signText
    };
}