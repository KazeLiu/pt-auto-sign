export function ttgMain() {
    let signedHtml = document.querySelector('.smallfont #sp_signed');
    if (signedHtml?.innerText === '已签到') {
        return {
            sign: true,
            title: '已签到',
            text: signedHtml.innerText
        }
    }

    let signBtnHtml = document.querySelector('.smallfont #sp_signed a#signed');
    if (signBtnHtml?.innerText === '签到') {
        signBtnHtml.click();
        return {
            sign: true,
            title: '签到成功',
            text: signBtnHtml.innerText
        }
    }

    return {
        sign: false
    };
}