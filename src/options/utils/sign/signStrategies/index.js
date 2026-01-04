import {nexusPHP} from "./nexusPHP.js";
import {hanhanMain} from "./hanhan.js";
import {haidanMain} from "./haidan.js";
import {btSchoolMain} from "./btSchool.js";
import {ttgMain} from "./ttg.js";
import {u2Main} from "./u2.js";
import {onlineMian} from "./online.js";
import {pttMain} from "./ptt.js";
import {PterMain} from "./PTer.js"

const STRATEGY_MAP = {
    HANHAN: hanhanMain, // 憨憨
    HAIDAN: haidanMain, // 海胆
    BTSCHOOL: btSchoolMain, // 学校
    TTG: ttgMain, // 听听歌
    U2: u2Main, // 幼儿园
    PTT: pttMain, // ptt
    PTER: PterMain,
    online: onlineMian, // 只访问，防止太久不上号被封号 没有验证策略 不知道有没有登录
};

export function getSignStrategy(siteType) {
    return STRATEGY_MAP[siteType] ?? nexusPHP; // 默认使用 NexusPHP 策略
}
