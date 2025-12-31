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
    // --- 特殊处理站点 ---
    {
        name: 'U2',
        siteType: SITE_TYPES.U2, // 统一使用常量引用
        site: "https://u2.dmhy.org/showup.php"
    },
    {
        name: '海胆',
        siteType: SITE_TYPES.HAIDAN,
        site: "https://www.haidan.video/"
    },
    {
        name: 'BTSCHOOL',
        siteType: SITE_TYPES.BTSCHOOL,
        site: "https://pt.btschool.club/index.php?action=addbonus"
    },
    {
        name: 'ToTheGlory',
        siteType: SITE_TYPES.TTG,
        site: "https://totheglory.im/"
    },
    {
        name: '憨憨',
        siteType: SITE_TYPES.HANHAN,
        site: "https://hhanclub.top/attendance.php"
    },
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