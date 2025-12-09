export function ttgMain() {
    let signedHtml = document.querySelector('.smallfont #sp_signed a#signed');
    console.log(signedHtml?.innerText)
    if (signedHtml?.innerText === '签到') {
        signedHtml.click();
        return {
            sign: true,
            title: '签到成功',
            text: signedHtml.innerText
        }
    }
    if (signedHtml?.innerText === '已签到') {
        return {
            sign: true,
            title: '已签到',
            text: signedHtml.innerText
        }
    }
    return {
        sign: false
    };
}