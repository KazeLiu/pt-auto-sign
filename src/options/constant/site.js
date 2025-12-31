// 1. 使用 Object.freeze 确保枚举类型不被意外修改
// 统一键值命名规范，推荐全大写或保持一致
export const SITE_TYPES = Object.freeze({
    U2: 'U2',
    HAIDAN: 'HAIDAN',
    BTSCHOOL: 'BTSCHOOL',
    TTG: 'TTG',
    HANHAN: 'HANHAN',
    PTT: 'PTT',
    ONLINE: 'online',
    nexusPHP: 'nexusPHP'
});

const createNexusSite = (name, domain) => ({
    name,
    siteType: SITE_TYPES.NEXUS_PHP,
    site: `${domain.replace(/\/$/, '')}/attendance.php` // 自动处理末尾斜杠并拼接
});

export const SITE_LIST = [
    // --- 特殊处理站点部分 ---
    {
        name: 'PTTime',
        siteType: SITE_TYPES.PTT,
        site: "https://www.pttime.org/attendance.php"
    },

    // --- 标准 NexusPHP 站点 ---
    createNexusSite('CyanBug', 'https://cyanbug.net'),

    // --- Online 类型站点 ---
    {
        name: 'M-Team - TP',
        site: "https://kp.m-team.cc/",
        siteType: SITE_TYPES.ONLINE,
    },
];