<template>
  <div>
    <div
        class="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center transition hover:shadow-md border border-gray-100">
      <div class="flex flex-col">
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          👋 欢迎回来
          <el-tag effect="plain" round size="small" class="ml-2">多喝热水</el-tag>
        </h1>
        <p class="text-gray-500 text-sm mt-2 flex items-center gap-1">
          <el-icon>
            <InfoFilled/>
          </el-icon>
          动态验证和登录需自行处理，确保能访问到签到页面后再点击签到
        </p>
      </div>
      <div class="flex gap-3 items-center">
        <el-button @click="tableModel.refreshData" :icon="Refresh" circle plain title="刷新数据"/>
        <el-button :icon="VideoPlay" type="primary" size="large" @click="signModel.allSign()"
                   :loading="signModel.isBatchSigning"
                   class="shadow-lg shadow-blue-500/30">
          一键全部签到
        </el-button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="bg-blue-50 rounded-xl p-4 flex items-center gap-4 border border-blue-100">
        <div class="p-3 bg-blue-100 rounded-lg text-blue-600">
          <el-icon size="24">
            <List/>
          </el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500">已添加站点</div>
          <div class="text-xl font-bold text-gray-800">{{ tableModel.tableData.length }} 个</div>
        </div>
      </div>
      <div class="bg-green-50 rounded-xl p-4 flex items-center gap-4 border border-green-100">
        <div class="p-3 bg-green-100 rounded-lg text-green-600">
          <el-icon size="24">
            <Check/>
          </el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500">今日已签</div>
          <div class="text-xl font-bold text-gray-800">{{ tableModel.signedCount }} 个</div>
        </div>
      </div>
      <div class="bg-orange-50 rounded-xl p-4 flex items-center gap-4 border border-orange-100">
        <div class="p-3 bg-orange-100 rounded-lg text-orange-600">
          <el-icon size="24">
            <Timer/>
          </el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500">待完成</div>
          <div class="text-xl font-bold text-gray-800">{{ tableModel.tableData.length - tableModel.signedCount }} 个
          </div>
        </div>
      </div>
    </div>

    <el-card shadow="hover" class="rounded-xl border-none">
      <el-table
          :data="tableModel.tableData"
          ref="tableRef"
          style="width: 100%"
          stripe
          v-loading="tableModel.loading"
          :header-cell-style="{ background: '#f9fafb', color: '#6b7280' }"
      >
        <el-table-column type="selection" width="55" align="center"/>
        <el-table-column label="站点名称" prop="name"/>
        <el-table-column label="签到规则" prop="siteType" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ row.siteType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="今日状态" align="center" min-width="220">
          <template #default="{ row }">
            <div class="flex flex-col items-center gap-2">
              <el-tag v-if="tableModel.checkIsSignedToday(row.name)" type="success" effect="dark" round>
                <div class="flex gap-1 items-center">
                  <el-icon class="mr-1"><Select/></el-icon>
                  {{ row.siteType === 'online' ? '已访问' : '已签到' }}
                </div>
              </el-tag>
              <el-tag v-else type="danger" effect="plain" round>
                <div class="flex gap-1 items-center">
                  <el-icon class="mr-1">
                    <CloseBold/>
                  </el-icon>
                  {{ row.siteType === 'online' ? '未访问' : '未签到' }}
                </div>
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="150">
          <template #default="{ row }">
            <span v-if="tableModel.getRemark(row.name)">
                {{ tableModel.getRemark(row.name) }}
              </span>
          </template>
        </el-table-column>
        <el-table-column label="签到地址" prop="site">
          <template #default="{ row }">
            <a target="_blank" :href="row.site"
               class="text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 text-sm transition">
              <el-icon>
                <Link/>
              </el-icon>
              {{ row.site }}
            </a>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
                :type="tableModel.checkIsSignedToday(row.name) ? 'success' : 'primary'"
                size="small"
                plain
                round
                @click="signModel.sign(row)"
            >
              {{ tableModel.checkIsSignedToday(row.name) ? '再次签到' : '手动签到' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="还没有配置站点，请去配置页添加"></el-empty>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import {computed, nextTick, onMounted, reactive, ref} from "vue";
import {useRoute} from "vue-router";
import router from "../router/index.js";
import {ElLoading, ElMessage} from "element-plus";
import {VideoPlay, Refresh, InfoFilled, List, Check, Timer, Select, CloseBold, Link} from "@element-plus/icons-vue";
import {handleSignTask} from "../utils/sign/index.js";
import {addSignDate, getSignRecords, updateSignResult} from "../utils/storage/signDate.js";
import {storage} from "../utils/storage";
import {sendIyuuNotice} from "../utils/iyuu/index.js";
import {getSiteData} from "../utils/storage/siteData.js";
import {getSettingData} from "../utils/storage/settingData.js";
import {getDateString, sleep} from "../utils/index.js";

const route = useRoute();
const tableRef = ref(null);
const todayString = computed(() => getDateString());
const STATUS_REMARKS = {
  "login-required": "需要重新登录",
  "login-captcha": "登录页存在验证码",
  "secondary-auth": "需要完成二级验证",
  "site-unreachable": "无法访问站点或页面加载失败",
  "site-error": "站点返回错误页面",
  "cloudflare-timeout": "Cloudflare 超时或防护异常",
  "strategy-missing": "未配置签到策略",
  "script-error": "页面脚本执行失败",
  "task-error": "签到任务异常",
  "failed": "未识别到签到成功结果",
};

function getSelectedSites() {
  return tableRef.value?.getSelectionRows?.() ?? [];
}

function buildRecordMap(records) {
  return records.reduce((map, record) => {
    map[record.key] = record;
    return map;
  }, {});
}

async function refreshRecords() {
  const records = await getSignRecords();
  return buildRecordMap(records);
}

function getSignResultMessage(siteName, result) {
  return result?.msg ?? (result?.sign ? `${siteName} 签到成功` : `${siteName} 签到失败`);
}

function getStatusRemark(result) {
  if (!result) {
    return "";
  }
  if (result.sign) {
    return result.msg || "";
  }
  return result.msg || STATUS_REMARKS[result.status] || "签到失败";
}

// 设置块
const settingModel = reactive({
  allOpen: false,
  async init() {
    const settingData = await getSettingData();
    this.allOpen = settingData?.allOpen || false;
  }
});

// 表格块
const tableModel = reactive({
  tableData: [],
  recordMap: {},
  loading: false,

  signedCount: computed(() => tableModel.tableData.filter(row => tableModel.checkIsSignedToday(row.name)).length),

  async fetchRecords() {
    this.recordMap = await refreshRecords();
  },

  async init() {
    this.loading = true;
    try {
      await this.fetchRecords();
      const data = await getSiteData();
      this.tableData = data.filter(item => item.enabled);
      this.autoSelectUnsigned();
    } finally {
      this.loading = false;
    }
  },

  async refreshData() {
    await this.init();
    ElMessage.success("数据已刷新哟～");
  },

  getRecord(siteName) {
    return this.recordMap[siteName] ?? null;
  },

  checkIsSignedToday(siteName) {
    const record = this.getRecord(siteName);
    const dates = record?.dates;
    return Array.isArray(dates) && dates.includes(todayString.value);
  },

  getRemark(siteName) {
    const record = this.getRecord(siteName);
    return getStatusRemark(record?.lastResult);
  },

  autoSelectUnsigned() {
    nextTick(() => {
      if (!tableRef.value || this.tableData.length === 0) {
        return;
      }

      tableRef.value.clearSelection();
      this.tableData.forEach(row => {
        if (!this.checkIsSignedToday(row.name)) {
          tableRef.value.toggleRowSelection(row, true);
        }
      });
    });
  }
});

// 签到块
const signModel = reactive({
  isBatchSigning: false,

  async sign(site) {
    const loadingInstance = ElLoading.service({
      lock: true,
      text: `正在给 ${site.name} 签到中...`,
      background: "rgba(255, 255, 255, 0.8)",
    });

    try {
      const {success, msg} = await signModel.doSignLogic(site);
      await tableModel.fetchRecords();
      if (success) {
        await sendIyuuNotice(`${site.name} 签到结果`, msg);
        ElMessage.success(`${msg}！`);
        return;
      }

      ElMessage.warning(`${msg}...`);
    } catch {
      ElMessage.error(`${site.name} 发生异常`);
    } finally {
      loadingInstance.close();
    }
  },

  async allSign(isAutoSign = false) {
    const selectedSites = getSelectedSites();
    if (selectedSites.length === 0) {
      ElMessage.warning("请先勾选需要签到的站点哟～");
      return;
    }

    this.isBatchSigning = true;
    const reportList = [];
    const maxRetries = 1;
    let currentTry = 0;
    let pendingSites = [...selectedSites];

    const loadingInstance = ElLoading.service({
      lock: true,
      text: `正在批量执行 ${pendingSites.length} 个任务，请稍候...`,
      background: "rgba(255, 255, 255, 0.9)",
    });

    try {
      while (currentTry <= maxRetries && pendingSites.length > 0) {
        if (currentTry > 0) {
          loadingInstance.setText(`正在进行第 ${currentTry} 次重试，剩余 ${pendingSites.length} 个站点...`);
          await sleep(2000);
        }

        const backgroundSites = settingModel.allOpen
          ? pendingSites.filter(site => !site.active)
          : [];
        const foregroundSites = settingModel.allOpen
          ? pendingSites.filter(site => site.active)
          : pendingSites;

        const backgroundResults = [];
        const backgroundLimit = 5;
        let backgroundIndex = 0;
        const backgroundWorkerCount = Math.min(backgroundLimit, backgroundSites.length);
        const backgroundWorkers = Array.from({length: backgroundWorkerCount}, async () => {
          while (backgroundIndex < backgroundSites.length) {
            const site = backgroundSites[backgroundIndex++];
            if (!site) {
              return;
            }
            const res = await this.doSignLogic(site);
            backgroundResults.push({site, res, background: true});
          }
        });
        await Promise.all(backgroundWorkers);
        const resultMap = new Map(backgroundResults.map(item => [item.site.name, item]));

        for (const site of foregroundSites) {
          const res = await this.doSignLogic(site);
          resultMap.set(site.name, {site, res, background: false});
        }

        const currentPassResults = pendingSites
          .map(site => resultMap.get(site.name))
          .filter(Boolean);

        const nonRetryStatuses = new Set(["login-required", "login-captcha", "secondary-auth"]);
        const failedSites = [];
        for (const {site, res, background} of currentPassResults) {
          const suffix = background ? " (并发)" : "";
          if (res.success) {
            reportList.push(`[${site.name}] ${res.msg}${suffix}`);
            continue;
          }

          const status = res.result?.status ?? "";
          if (nonRetryStatuses.has(status)) {
            reportList.push(`[${site.name}] ${res.msg} (跳过重试)${suffix}`);
            continue;
          }

          failedSites.push(site);
          reportList.push(`[${site.name}] ${res.msg}${suffix}`);
        }

        pendingSites = failedSites;
        currentTry++;
      }

      await sendIyuuNotice("批量签到结果", reportList.join("\n"));
      await tableModel.fetchRecords();
      tableModel.autoSelectUnsigned();

      if (pendingSites.length === 0) {
        ElMessage.success("批量任务全部执行完毕哟！✨");
      } else {
        ElMessage.warning(`任务执行完毕，但仍有 ${pendingSites.length} 个站点失败，已被重新勾选。`);
      }
    } finally {
      loadingInstance.close();
      this.isBatchSigning = false;
      if (isAutoSign) {
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }
  },

  async doSignLogic(site) {
    try {
      const rawResult = await handleSignTask(site);
      const result = {
        sign: Boolean(rawResult?.sign),
        pending: Boolean(rawResult?.pending),
        status: rawResult?.status ?? "task-error",
        title: rawResult?.title ?? "",
        text: rawResult?.text ?? "",
        msg: rawResult?.msg ?? `${site.name} 返回空结果`,
        detail: rawResult?.detail ?? rawResult?.text ?? "",
      };

      await updateSignResult(site.name, result);
      if (result.sign) {
        await addSignDate(site.name, todayString.value);
        return {success: true, msg: getSignResultMessage(site.name, result), result};
      }
      return {success: false, msg: getSignResultMessage(site.name, result), result};
    } catch (error) {
      console.error(error);
      const fallbackResult = {
        sign: false,
        pending: false,
        status: "task-error",
        title: "",
        text: "",
        msg: `${site.name} 执行出错`,
        detail: error?.message ?? "",
      };
      await updateSignResult(site.name, fallbackResult);
      return {success: false, msg: fallbackResult.msg, result: fallbackResult};
    }
  },
});

async function saveOnceUseTime() {
  const firstUseDate = await storage.get("first_use_date");
  if (!firstUseDate) {
    const now = new Date().toLocaleString();
    await storage.set("first_use_date", now);
    console.log("欢迎新用户！首次使用时间已记录:", now);
  }
}

onMounted(async () => {
  await saveOnceUseTime();
  await tableModel.init();
  await settingModel.init();

  if (route.query.action === "autoSign") {
    setTimeout(() => {
      if (tableModel.tableData.length > 0) {
        signModel.allSign(true);
      }
      const query = {...route.query};
      delete query.action;
      router.replace({query});
    }, 1000);
  }
});
</script>
