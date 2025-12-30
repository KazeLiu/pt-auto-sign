import {nexusPHP} from "./nexusPHP.js";
import {hanhanMain} from "./hanhan.js";
import {haidanMain} from "./haidan.js";
import {btSchoolMain} from "./btSchool.js";
import {ttgMain} from "./ttg.js";
import {u2Main} from "./u2.js";
import {online} from "./online.js";

const STRATEGY_MAP = {
    nexusPHP,
    online,
    HanHan: hanhanMain,
    HaiDan: haidanMain,
    btSchool: btSchoolMain,
    ttg: ttgMain,
    U2: u2Main,
};

export function getSignStrategy(siteType) {
    return STRATEGY_MAP[siteType] ?? null;
}
