<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <el-icon class="text-blue-500">
            <Calendar/>
          </el-icon>
          历史记录
        </h1>
        <p class="text-gray-500 text-sm mt-2">按站点查看以前的签到和访问状态</p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
        <el-select
            v-model="selectedSiteKey"
            placeholder="选择站点"
            filterable
            class="site-select"
            :disabled="historyState.loading || siteOptions.length === 0"
        >
          <el-option
              v-for="site in siteOptions"
              :key="site.name"
              :label="site.label"
              :value="site.name"
          >
            <div class="flex items-center justify-between gap-4">
              <span>{{ site.label }}</span>
              <el-tag v-if="site.removed" size="small" type="info" effect="plain">仅历史</el-tag>
              <el-tag v-else-if="site.siteType" size="small" effect="plain">{{ site.siteType }}</el-tag>
            </div>
          </el-option>
        </el-select>
        <el-button :icon="Refresh" plain @click="actions.init" :loading="historyState.loading">
          刷新
        </el-button>
        <el-button :icon="Plus" type="primary" plain @click="actions.openManualDialog">
          补记记录
        </el-button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div class="text-xs text-gray-500">已记录日期</div>
        <div class="text-2xl font-bold text-gray-800 mt-2">{{ summary.totalDays }}</div>
      </div>
      <div class="bg-green-50 rounded-xl shadow-sm p-5 border border-green-100">
        <div class="text-xs text-green-700">{{ successLabel }}</div>
        <div class="text-2xl font-bold text-green-700 mt-2">{{ summary.successDays }}</div>
      </div>
      <div class="bg-red-50 rounded-xl shadow-sm p-5 border border-red-100">
        <div class="text-xs text-red-700">失败记录</div>
        <div class="text-2xl font-bold text-red-700 mt-2">{{ summary.failedDays }}</div>
      </div>
      <div class="bg-amber-50 rounded-xl shadow-sm p-5 border border-amber-100">
        <div class="text-xs text-amber-700">待处理记录</div>
        <div class="text-2xl font-bold text-amber-700 mt-2">{{ summary.pendingDays }}</div>
      </div>
    </div>

    <div class="history-layout">
      <el-card shadow="hover" class="rounded-xl border-none calendar-panel" v-loading="historyState.loading">
        <el-calendar v-model="calendarDate">
          <template #date-cell="{ data }">
            <button
                type="button"
                class="calendar-cell"
                :class="{
                  'is-today': data.day === todayString,
                  'is-picked': data.day === selectedDay
                }"
                @click.stop="selectedDay = data.day"
            >
              <span class="cell-day">{{ Number(data.day.slice(-2)) }}</span>
              <span
                  v-if="getDayResult(data.day)"
                  class="status-pill"
                  :class="getStatusMeta(getDayResult(data.day)).className"
              >
                {{ getStatusMeta(getDayResult(data.day)).label }}
              </span>
            </button>
          </template>
        </el-calendar>
      </el-card>

      <div class="space-y-6">
        <el-card shadow="hover" class="rounded-xl border-none">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">日期详情</span>
              <el-tag :type="selectedMeta.tagType" effect="plain">{{ selectedMeta.label }}</el-tag>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <div class="text-xs text-gray-400">站点</div>
              <div class="font-semibold text-gray-800 mt-1">{{ selectedSiteName }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400">日期</div>
              <div class="font-semibold text-gray-800 mt-1">{{ selectedDay }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400">结果</div>
              <p class="text-sm text-gray-600 leading-6 mt-1 break-words">
                {{ selectedMessage }}
              </p>
            </div>
            <div v-if="selectedResult?.updatedAt">
              <div class="text-xs text-gray-400">记录时间</div>
              <div class="text-sm text-gray-600 mt-1">{{ formatTime(selectedResult.updatedAt) }}</div>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" class="rounded-xl border-none">
          <template #header>
            <span class="font-medium">最近记录</span>
          </template>

          <el-empty v-if="recentRecords.length === 0" description="还没有历史记录"/>
          <div v-else class="recent-list">
            <button
                v-for="item in recentRecords"
                :key="item.day"
                type="button"
                class="recent-item"
                :class="{ active: item.day === selectedDay }"
                @click="selectHistoryDay(item.day)"
            >
              <span class="font-medium text-gray-700">{{ item.day }}</span>
              <el-tag :type="getStatusMeta(item.result).tagType" size="small" effect="plain">
                {{ getStatusMeta(item.result).label }}
              </el-tag>
            </button>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog
        v-model="manualDialog.visible"
        title="补记历史记录"
        width="460px"
        destroy-on-close
    >
      <el-form label-width="90px">
        <el-form-item label="站点" required>
          <el-select
              v-model="manualForm.siteKey"
              placeholder="选择站点"
              filterable
              class="w-full"
          >
            <el-option
                v-for="site in siteOptions"
                :key="site.name"
                :label="site.label"
                :value="site.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker
              v-model="manualForm.date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              class="w-full"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="manualForm.status">
            <el-radio-button label="signed">成功</el-radio-button>
            <el-radio-button label="pending">待处理</el-radio-button>
            <el-radio-button label="failed">失败</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
              v-model="manualForm.remark"
              type="textarea"
              :rows="3"
              maxlength="120"
              show-word-limit
              placeholder="例如：今天已手动签到"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="manualDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="actions.submitManualRecord" :loading="manualDialog.saving">
            保存记录
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import {Calendar, Plus, Refresh} from "@element-plus/icons-vue";
import {getSiteData} from "../utils/storage/siteData.js";
import {getSignRecords, updateSignResult} from "../utils/storage/signDate.js";
import {getDateString} from "../utils/index.js";

const todayString = getDateString();
const calendarDate = ref(new Date());
const selectedDay = ref(todayString);
const selectedSiteKey = ref("");

const historyState = reactive({
  loading: false,
  sites: [],
  records: []
});

const manualDialog = reactive({
  visible: false,
  saving: false
});

const manualForm = reactive({
  siteKey: "",
  date: todayString,
  status: "signed",
  remark: ""
});

const STATUS_REMARKS = {
  "login-required": "需要重新登录",
  "login-captcha": "登录页存在验证码",
  "secondary-auth": "需要完成二级验证",
  "site-unreachable": "无法访问站点或页面加载失败",
  "site-error": "站点返回错误页面",
  "cloudflare-timeout": "Cloudflare 超时或防护异常",
  "invalid-site-url": "签到地址格式不正确",
  "strategy-missing": "未配置签到策略",
  "script-error": "页面脚本执行失败",
  "task-error": "签到任务异常",
  "failed": "未识别到签到成功结果",
};

const siteOptions = computed(() => {
  const options = historyState.sites.map(site => ({
    name: site.name,
    label: site.name,
    siteType: site.siteType,
    removed: false
  }));
  const knownNames = new Set(options.map(site => site.name));

  historyState.records.forEach(record => {
    if (record?.key && !knownNames.has(record.key)) {
      options.push({
        name: record.key,
        label: record.key,
        siteType: "",
        removed: true
      });
    }
  });

  return options;
});

const selectedSite = computed(() =>
    siteOptions.value.find(site => site.name === selectedSiteKey.value) ?? null
);

const selectedRecord = computed(() =>
    historyState.records.find(record => record.key === selectedSiteKey.value) ?? null
);

const selectedSiteName = computed(() => selectedSite.value?.label || "未选择站点");

const selectedSiteType = computed(() => selectedSite.value?.siteType || "");

const successLabel = computed(() =>
    selectedSiteType.value === "online" ? "已访问记录" : "签到成功"
);

function getRecordDates(record) {
  return Array.isArray(record?.dates) ? record.dates : [];
}

function getDailyResults(record) {
  if (!record?.dailyResults || typeof record.dailyResults !== "object" || Array.isArray(record.dailyResults)) {
    return {};
  }
  return record.dailyResults;
}

function getResultDate(result) {
  if (result?.date) {
    return result.date;
  }
  if (result?.updatedAt) {
    return getDateString(new Date(result.updatedAt));
  }
  return "";
}

function getDayResult(day) {
  const record = selectedRecord.value;
  if (!record) {
    return null;
  }

  const dailyResults = getDailyResults(record);
  if (dailyResults[day]) {
    return dailyResults[day];
  }

  if (getRecordDates(record).includes(day)) {
    return {
      sign: true,
      pending: false,
      status: "signed",
      msg: selectedSiteType.value === "online" ? "访问成功" : "签到成功",
      date: day
    };
  }

  const lastResult = record.lastResult;
  if (lastResult && getResultDate(lastResult) === day) {
    return lastResult;
  }

  return null;
}

function getStatusMeta(result) {
  if (!result) {
    return {
      label: "无记录",
      tagType: "info",
      className: "is-empty"
    };
  }

  if (result.sign) {
    return {
      label: selectedSiteType.value === "online" ? "已访问" : "已签到",
      tagType: "success",
      className: "is-success"
    };
  }

  if (result.pending) {
    return {
      label: "待处理",
      tagType: "warning",
      className: "is-pending"
    };
  }

  return {
    label: selectedSiteType.value === "online" ? "访问失败" : "签到失败",
    tagType: "danger",
    className: "is-failed"
  };
}

function getResultMessage(result) {
  if (!result) {
    return "这一天没有记录。";
  }
  if (result.msg) {
    return result.msg;
  }
  if (result.detail) {
    return result.detail;
  }
  if (result.sign) {
    return selectedSiteType.value === "online" ? "访问成功" : "签到成功";
  }
  return STATUS_REMARKS[result.status] || "任务执行失败";
}

const knownHistoryDays = computed(() => {
  const record = selectedRecord.value;
  if (!record) {
    return [];
  }

  const days = new Set([
    ...getRecordDates(record),
    ...Object.keys(getDailyResults(record))
  ]);

  const lastResultDate = getResultDate(record.lastResult);
  if (lastResultDate) {
    days.add(lastResultDate);
  }

  return Array.from(days).filter(Boolean);
});

const summary = computed(() => {
  const result = {
    totalDays: 0,
    successDays: 0,
    failedDays: 0,
    pendingDays: 0
  };

  knownHistoryDays.value.forEach(day => {
    const dayResult = getDayResult(day);
    if (!dayResult) {
      return;
    }
    result.totalDays++;
    if (dayResult.sign) {
      result.successDays++;
    } else if (dayResult.pending) {
      result.pendingDays++;
    } else {
      result.failedDays++;
    }
  });

  return result;
});

const recentRecords = computed(() =>
    knownHistoryDays.value
        .map(day => ({day, result: getDayResult(day)}))
        .filter(item => item.result)
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(0, 10)
);

const selectedResult = computed(() => getDayResult(selectedDay.value));
const selectedMeta = computed(() => getStatusMeta(selectedResult.value));
const selectedMessage = computed(() => getResultMessage(selectedResult.value));

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function selectHistoryDay(day) {
  selectedDay.value = day;
  calendarDate.value = new Date(`${day}T00:00:00`);
}

const actions = {
  async init() {
    historyState.loading = true;
    try {
      const [sites, records] = await Promise.all([
        getSiteData(),
        getSignRecords()
      ]);
      historyState.sites = Array.isArray(sites) ? sites : [];
      historyState.records = Array.isArray(records) ? records : [];
    } finally {
      historyState.loading = false;
    }
  },

  openManualDialog() {
    manualForm.siteKey = selectedSiteKey.value || siteOptions.value[0]?.name || "";
    manualForm.date = selectedDay.value || todayString;
    manualForm.status = "signed";
    manualForm.remark = "手动补记";
    manualDialog.visible = true;
  },

  async submitManualRecord() {
    if (!manualForm.siteKey || !manualForm.date) {
      ElMessage.warning("请选择站点和日期");
      return;
    }

    manualDialog.saving = true;
    try {
      const site = siteOptions.value.find(item => item.name === manualForm.siteKey);
      const isOnlineSite = site?.siteType === "online";
      const statusMap = {
        signed: {
          sign: true,
          pending: false,
          status: "signed",
          msg: manualForm.remark || (isOnlineSite ? "手动补记访问成功" : "手动补记签到成功")
        },
        pending: {
          sign: false,
          pending: true,
          status: "pending",
          msg: manualForm.remark || "手动补记待处理"
        },
        failed: {
          sign: false,
          pending: false,
          status: "failed",
          msg: manualForm.remark || (isOnlineSite ? "手动补记访问失败" : "手动补记签到失败")
        }
      };

      await updateSignResult(manualForm.siteKey, statusMap[manualForm.status], manualForm.date);
      selectedSiteKey.value = manualForm.siteKey;
      selectHistoryDay(manualForm.date);
      await actions.init();
      manualDialog.visible = false;
      ElMessage.success("历史记录已补记");
    } finally {
      manualDialog.saving = false;
    }
  }
};

watch(siteOptions, options => {
  if (options.length === 0) {
    selectedSiteKey.value = "";
    return;
  }

  if (!options.some(site => site.name === selectedSiteKey.value)) {
    selectedSiteKey.value = options[0].name;
  }
});

onMounted(() => {
  actions.init();
});
</script>

<style scoped>
.site-select {
  width: 260px;
}

.history-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;
}

.calendar-panel {
  overflow: hidden;
}

.calendar-cell {
  width: 100%;
  min-height: 88px;
  padding: 8px;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  color: #374151;
}

.calendar-cell:hover {
  background: #f8fafc;
}

.calendar-cell.is-today .cell-day {
  color: #2563eb;
  font-weight: 700;
}

.calendar-cell.is-picked {
  outline: 2px solid #93c5fd;
  outline-offset: -2px;
  background: #eff6ff;
}

.cell-day {
  font-size: 14px;
  line-height: 20px;
}

.status-pill {
  max-width: 100%;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.status-pill.is-success {
  color: #047857;
  background: #d1fae5;
}

.status-pill.is-failed {
  color: #b91c1c;
  background: #fee2e2;
}

.status-pill.is-pending {
  color: #b45309;
  background: #fef3c7;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-item {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.recent-item:hover,
.recent-item.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

:deep(.el-calendar__body) {
  padding: 12px 20px 20px;
}

:deep(.el-calendar-table .el-calendar-day) {
  height: 104px;
  padding: 0;
}

:deep(.el-calendar-table td.is-selected) {
  background: transparent;
}

@media (max-width: 900px) {
  .history-layout {
    grid-template-columns: 1fr;
  }

  .site-select {
    width: 100%;
  }
}
</style>
