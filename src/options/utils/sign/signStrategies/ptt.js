export function pttMain() {
    let body = document.querySelector('body');
    if (body?.innerText.includes('签到成功')) {
        return {
            sign: true,
            title: '签到成功',
            text: body.innerText
        }
    }
    if (body?.innerText.includes('已签到')) {
        return {
            sign: true,
            title: '已签到',
            text: body.innerText
        }
    }
    return {
        sign: false
    };
}