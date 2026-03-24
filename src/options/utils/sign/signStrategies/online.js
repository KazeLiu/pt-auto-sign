/*
 * 有些站是几个月不登录就销号，列表内的就访问下
 */
export function onlineMian() {
    return {
        sign: true,
        pending: false,
        title: '已访问',
        text: '仅访问页面以保持活跃状态',
        msg: '已访问',
        detail: '仅访问页面以保持活跃状态',
    };
}
