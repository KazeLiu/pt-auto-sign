/*
 * 有些站是几个月不登录就销号，列表内的就访问下
 */
export function online() {
    return {
        sign: true,
        title: '已访问',
    }
}