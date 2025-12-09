export function u2Main() {
    let signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText;
    let signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText;
    if (signTitle === '签到区') {
        document.querySelector('td.outer table.main .embedded textarea').innerText = '59个UCoin';
        let submitBtn = document.querySelector('td.outer table.main .embedded table.captcha input[type=submit]');
        if (submitBtn) {
            submitBtn.click();
            return {
                sign: true,
                title: signTitle,
                text: signText
            }
        }
    }
    //所有策略都失败
    return {
        sign: false
    };
}