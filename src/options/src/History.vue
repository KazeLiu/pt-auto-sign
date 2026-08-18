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
        <p class="text-gray-500 text-sm mt-2">按日期汇总所有站点，悬浮查看明细，点击可固定</p>
      </div>

      <div class="flex gap-3">
        <el-button :icon="Refresh" plain @click="actions.init" :loading="historyState.loading">
          刷新
        </el-button>
        <el-button :icon="Plus" type="primary" plain @click="actions.openManualDialog">
          补记记录
        </el-button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div class="text-xs text-gray-500">总记录</div>
        <div class="text-2xl font-bold text-gray-800 mt-2">{{ summary.total }}</div>
      </div>
      <div class="bg-green-50 rounded-xl shadow-sm p-5 border border-green-100">
        <div class="text-xs text-green-700">签到成功</div>
        <div class="text-2xl font-bold text-green-700 mt-2">{{ summary.success }}</div>
      </div>
      <div class="bg-red-50 rounded-xl shadow-sm p-5 border border-red-100">
        <div class="text-xs text-red-700">签到失败</div>
        <div class="text-2xl font-bold text-red-700 mt-2">{{ summary.failed }}</div>
      </div>
      <div class="bg-amber-50 rounded-xl shadow-sm p-5 border border-amber-100">
        <div class="text-xs text-amber-700">待处理</div>
        <div class="text-2xl font-bold text-amber-700 mt-2">{{ summary.pending }}</div>
      </div>
    </div>

    <div class="history-layout">
      <el-card shadow="hover" class="rounded-xl border-none calendar-panel" v-loading="historyState.loading">
        <div class="calendar-wrap" @mouseleave="onCalendarLeave">
          <el-calendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <button
                  type="button"
                  class="calendar-cell"
                  :class="{
                    'is-today': data.day === todayString,
                    'is-hover': data.day === hoveredDay,
                    'is-locked': data.day === lockedDay
                  }"
                  @click.stop="onCellClick(data.day)"
                  @mouseenter="onCellEnter(data.day)"
              >
                <span class="cell-day">{{ Number(data.day.slice(-2)) }}</span>
                <span v-if="getDaySummary(data.day).total" class="count-pills">
                  <span v-if="getDaySummary(data.day).success" class="pill pill-ok">✓{{ getDaySummary(data.day).success }}</span>
                  <span v-if="getDaySummary(data.day).failed" class="pill pill-fail">✗{{ getDaySummary(data.day).failed }}</span>
                  <span v-if="getDaySummary(data.day).pending" class="pill pill-pending">⏳{{ getDaySummary(data.day).pending }}</span>
                </span>
              </button>
            </template>
          </el-calendar>
        </div>
      </el-card>

      <el-card shadow="hover" class="rounded-xl border-none detail-panel">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ activeDay }} 明细</span>
            <el-tag effect="plain">{{ activeEntries.length }} 条</el-tag>
          </div>
        </template>

        <div class="detail-body">
          <el-empty v-if="activeEntries.length === 0" description="这一天没有记录"/>
          <div v-else class="detail-groups">
            <div v-if="groupedDetail.success.length" class="detail-group">
              <div class="group-title is-success">✓ 成功（{{ groupedDetail.success.length }}）</div>
              <div v-for="item in groupedDetail.success" :key="item.site" class="detail-row">
                <span class="site-name">{{ item.site }}</span>
                <span class="site-msg">{{ getResultMessage(item.result, item.siteType) }}</span>
              </div>
            </div>
            <div v-if="groupedDetail.failed.length" class="detail-group">
              <div class="group-title is-failed">✗ 失败（{{ groupedDetail.failed.length }}）</div>
              <div v-for="item in groupedDetail.failed" :key="item.site" class="detail-row">
                <span class="site-name">{{ item.site }}</span>
                <span class="site-msg">{{ getResultMessage(item.result, item.siteType) }}</span>
              </div>
            </div>
            <div v-if="groupedDetail.pending.length" class="detail-group">
              <div class="group-title is-pending">⏳ 待处理（{{ groupedDetail.pending.length }}）</div>
              <div v-for="item in groupedDetail.pending" :key="item.site" class="detail-row">
                <span class="site-name">{{ item.site }}</span>
                <span class="site-msg">{{ getResultMessage(item.result, item.siteType) }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
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
            >
              <div class="flex items-center justify-between gap-4">
                <span>{{ site.label }}</span>
                <el-tag v-if="site.removed" size="small" type="info" effect="plain">仅历史</el-tag>
                <el-tag v-else-if="site.siteType" size="small" effect="plain">{{ site.siteType }}</el-tag>
              </div>
            </el-option>
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
import {computed, onMounted, onUnmounted, reactive, ref} from "vue";
import {ElMessage} from "element-plus";
import {Calendar, Plus, Refresh} from "@element-plus/icons-vue";
import {getSiteData} from "../utils/storage/siteData.js";
import {getSignRecords, updateSignResult} from "../utils/storage/signDate.js";
import {getDateString} from "../utils/index.js";

const todayString = ref(getDateString());
let dateRefreshTimer;
const calendarDate = ref(new Date());

// hover 跟随 + click 锁定 + 离开日历解锁
const hoveredDay = ref(null);
const lockedDay = ref(null);
// 离开日历后保留的「最后查看日」，避免右侧突兀跳回今天
const fallbackDay = ref(todayString.value);

const activeDay = computed(() => lockedDay.value ?? hoveredDay.value ?? fallbackDay.value);

function onCellEnter(day) {
  hoveredDay.value = day;
}

function onCellClick(day) {
  lockedDay.value = day;
  fallbackDay.value = day;
}

function onCalendarLeave() {
  lockedDay.value = null;
  hoveredDay.value = null;
}

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
  date: todayString.value,
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
  "page-timeout": "页面加载超时，未执行签到脚本",
  "page-barrier": "页面弹窗未完成，待人工确认",
  "action-triggered": "已触发签到，等待站点确认",
  "assumed-signed": "无法确认签到入口，待人工确认",
  "storage-error": "签到结果保存失败",
};

// 补记对话框的站点下拉选项（合并历史站点）
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

const siteTypeMap = computed(() => {
  const map = {};
  historyState.sites.forEach(site => {
    map[site.name] = site.siteType ?? "";
  });
  return map;
});

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

// 取某站点在某天的签到结果（原 getDayResult，改为按 record 入参，不依赖全局选中态）
function getDayResultForRecord(record, day, siteType) {
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
      msg: siteType === "online" ? "访问成功" : "签到成功",
      date: day
    };
  }

  const lastResult = record.lastResult;
  if (lastResult && getResultDate(lastResult) === day) {
    return lastResult;
  }

  return null;
}

// 全局按日聚合：day -> [{ site, siteType, result }]
const allDayEntries = computed(() => {
  const map = {};
  historyState.records.forEach(record => {
    if (!record?.key) {
      return;
    }
    const siteType = siteTypeMap.value[record.key] ?? "";
    const days = new Set([
      ...getRecordDates(record),
      ...Object.keys(getDailyResults(record))
    ]);
    const lastDay = getResultDate(record.lastResult);
    if (lastDay) {
      days.add(lastDay);
    }
    days.forEach(day => {
      if (!day) {
        return;
      }
      const result = getDayResultForRecord(record, day, siteType);
      if (!result) {
        return;
      }
      (map[day] ??= []).push({site: record.key, siteType, result});
    });
  });
  return map;
});

// 按日计数，供日历格子渲染 ✓n ✗n ⏳n
const daySummaryMap = computed(() => {
  const map = {};
  Object.entries(allDayEntries.value).forEach(([day, entries]) => {
    let success = 0;
    let failed = 0;
    let pending = 0;
    entries.forEach(({result}) => {
      if (result.sign) {
        success++;
      } else if (result.pending) {
        pending++;
      } else {
        failed++;
      }
    });
    map[day] = {success, failed, pending, total: entries.length};
  });
  return map;
});

function getDaySummary(day) {
  return daySummaryMap.value[day] || {success: 0, failed: 0, pending: 0, total: 0};
}

// 全局统计卡片（记录数口径）
const summary = computed(() => {
  const result = {total: 0, success: 0, failed: 0, pending: 0};
  Object.values(daySummaryMap.value).forEach(dayStat => {
    result.total += dayStat.total;
    result.success += dayStat.success;
    result.failed += dayStat.failed;
    result.pending += dayStat.pending;
  });
  return result;
});

const activeEntries = computed(() => allDayEntries.value[activeDay.value] || []);

// 右侧明细按状态分组
const groupedDetail = computed(() => {
  const success = [];
  const failed = [];
  const pending = [];
  activeEntries.value.forEach(entry => {
    if (entry.result.sign) {
      success.push(entry);
    } else if (entry.result.pending) {
      pending.push(entry);
    } else {
      failed.push(entry);
    }
  });
  const bySite = (a, b) => a.site.localeCompare(b.site);
  success.sort(bySite);
  failed.sort(bySite);
  pending.sort(bySite);
  return {success, failed, pending};
});

function getResultMessage(result, siteType = "") {
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
    return siteType === "online" ? "访问成功" : "签到成功";
  }
  return STATUS_REMARKS[result.status] || "任务执行失败";
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
    manualForm.siteKey = siteOptions.value[0]?.name || "";
    manualForm.date = activeDay.value || todayString.value;
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
      fallbackDay.value = manualForm.date;
      calendarDate.value = new Date(`${manualForm.date}T00:00:00`);
      await actions.init();
      manualDialog.visible = false;
      ElMessage.success("历史记录已补记");
    } finally {
      manualDialog.saving = false;
    }
  }
};

onMounted(() => {
  dateRefreshTimer = window.setInterval(() => {
    todayString.value = getDateString();
  }, 60_000);
  actions.init();
});

onUnmounted(() => {
  if (dateRefreshTimer) {
    window.clearInterval(dateRefreshTimer);
  }
});
</script>

<style scoped lang="scss">
.history-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  align-items: start;
}

.calendar-panel {
  overflow: hidden;
}

.calendar-cell {
  width: 100%;
  min-height: 76px;
  padding: 8px;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
  color: #374151;
  transition: background 0.15s ease;

  &.is-today .cell-day {
    color: #2563eb;
    font-weight: 700;
  }

  &.is-hover {
    background: #f1f5f9;
  }

  &.is-locked {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    background: #eff6ff;
  }
}

.cell-day {
  font-size: 14px;
  line-height: 20px;
}

.count-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pill {
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;

  &.pill-ok {
    color: #047857;
    background: #d1fae5;
  }

  &.pill-fail {
    color: #b91c1c;
    background: #fee2e2;
  }

  &.pill-pending {
    color: #b45309;
    background: #fef3c7;
  }
}

.detail-body {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-size: 13px;
  font-weight: 700;

  &.is-success {
    color: #047857;
  }

  &.is-failed {
    color: #b91c1c;
  }

  &.is-pending {
    color: #b45309;
  }
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.site-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.site-msg {
  font-size: 12px;
  color: #6b7280;
  line-height: 18px;
  word-break: break-word;
}

:deep(.el-calendar__body) {
  padding: 12px 20px 20px;
}

:deep(.el-calendar-table .el-calendar-day) {
  height: 92px;
  padding: 0;
}

:deep(.el-calendar-table td.is-selected) {
  background: transparent;
}

@media (max-width: 900px) {
  .history-layout {
    grid-template-columns: 1fr;
  }
}
</style>
