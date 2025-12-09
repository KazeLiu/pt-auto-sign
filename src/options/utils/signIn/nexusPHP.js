/**
 * 这个函数会被注入到目标页面中执行。
 * 它本身不能访问扩展程序的变量，所以逻辑要全封闭。
 * 套了CF盾的会自刷新 要想办法在刷新后还植入代码并返回
 */
export function nexusMain() {
    let signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText;
    let signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText;
    if (signTitle === '抱歉' || signTitle === '签到成功' || signTitle === '错误') {
        return {
            sign: true,
            title: signTitle,
            text: signText
        }
    }
    //所有策略都失败
    return {
        sign: false
    };
}