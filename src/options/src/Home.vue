<template>
  <div>
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center transition hover:shadow-md border border-gray-100">
      <div class="flex flex-col">
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          👋 欢迎回来
          <el-tag effect="plain" round size="small" class="ml-2">多喝热水</el-tag>
        </h1>
        <p class="text-gray-500 text-sm mt-2 flex items-center gap-1">
          <el-icon><InfoFilled/></el-icon>
          动态验证和登录需自行处理，确保能访问到签到页面后再点击签到
        </p>
      </div>
      <div class="flex gap-3 items-center">
        <el-button @click="tableModel.refreshData" :icon="Refresh" circle plain title="刷新数据"/>
        <el-button :icon="VideoPlay" type="primary" size="large" @click="signModel.allSign" :loading="signModel.isBatchSigning"
                   class="shadow-lg shadow-blue-500/30">
          一键全部签到
        </el-button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="bg-blue-50 rounded-xl p-4 flex items-center gap-4 border border-blue-100">
        <div class="p-3 bg-blue-100 rounded-lg text-blue-600">
          <el-icon size="24"><List/></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500">已添加站点</div>
          <div class="text-xl font-bold text-gray-800">{{ tableModel.tableData.length }} 个</div>
        </div>
      </div>
      <div class="bg-green-50 rounded-xl p-4 flex items-center gap-4 border border-green-100">
        <div class="p-3 bg-green-100 rounded-lg text-green-600">
          <el-icon size="24"><Check/></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500">今日已签</div>
          <div class="text-xl font-bold text-gray-800">{{ tableModel.signedCount }} 个</div>
        </div>
      </div>
      <div class="bg-orange-50 rounded-xl p-4 flex items-center gap-4 border border-orange-100">
        <div class="p-3 bg-orange-100 rounded-lg text-orange-600">
          <el-icon size="24"><Timer/></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500">待完成</div>
          <div class="text-xl font-bold text-gray-800">{{ tableModel.tableData.length - tableModel.signedCount }} 个</div>
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
        <el-table-column label="今日状态" align="center">
          <template #default="{ row }">
            <el-tag v-if="tableModel.checkIsSignedToday(row.name)" type="success" effect="dark" round>
              <div class="flex gap-1 items-center">
                <el-icon class="mr-1"><Select/></el-icon>
                {{ row.siteType === 'online' ? '已访问' : '已签到' }}
              </div>
            </el-tag>
            <el-tag v-else type="danger" effect="plain" round>
              <div class="flex gap-1 items-center">
                <el-icon class="mr-1"><CloseBold/></el-icon>
                {{ row.siteType === 'online' ? '未访问' : '未签到' }}
              </div>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="签到地址" prop="site">
          <template #default="{ row }">
            <a target="_blank" :href="row.site" class="text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 text-sm transition">
              <el-icon><Link/></el-icon>
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
import { getCurrentInstance, nextTick, onMounted, reactive, computed, ref } from "vue";
import { useRoute } from "vue-router";
import router from "../router/index.js";
import { ElLoading, ElMessage } from "element-plus";
import { VideoPlay, Refresh, InfoFilled, List, Check, Timer, Select, CloseBold, Link } from '@element-plus/icons-vue';
import { handleSignTask } from "../utils/sign/index.js";
import { addSignDate } from "../utils/storage/signDate.js";
import { storage } from '../utils/storage';
import { sendIyuuNotice } from "../utils/iyuu/index.js";
import { getSiteData } from "../utils/storage/siteData.js";
import { getSettingData } from "../utils/storage/settingData.js";

const route = useRoute();
const { proxy } = getCurrentInstance();
const tableRef = ref(null);

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

  // 计算属性：今日已签到数量
  signedCount: computed(() => {
    return tableModel.tableData.filter(row => tableModel.checkIsSignedToday(row.name)).length;
  }),

  // 获取签到历史记录
  async fetchRecords() {
    const rawRecords = await storage.get('site_sign_records', []);
    const map = {};
    rawRecords.forEach(item => {
      map[item.key] = item.dates;
    });
    this.recordMap = map;
  },

  // 初始化数据
  async init() {
    this.loading = true;
    try {
      await this.fetchRecords();
      const data = await getSiteData();
      this.tableData = data.filter(x => x.enabled);
      this.autoSelectUnsigned();
    } finally {
      this.loading = false;
    }
  },

  // 刷新
  async refreshData() {
    await this.init();
    ElMessage.success('数据已刷新哟～');
  },

  // 检查今日是否已签到
  checkIsSignedToday(siteName) {
    const dayStr = new Date().toISOString().split('T')[0];
    const dates = this.recordMap[siteName];
    return dates && dates.includes(dayStr);
  },

  // 自动勾选未签到
  autoSelectUnsigned() {
    nextTick(() => {
      if (proxy.$refs.tableRef && this.tableData.length > 0) {
        proxy.$refs.tableRef.clearSelection();
        this.tableData.forEach(row => {
          if (!this.checkIsSignedToday(row.name)) {
            proxy.$refs.tableRef.toggleRowSelection(row, true);
          }
        });
      }
    });
  }
});

// 签到块
const signModel = reactive({
  isBatchSigning: false,

  // 单个签到
  async sign(site) {
    const loadingInstance = ElLoading.service({
      lock: true,
      text: `正在给 ${site.name} 签到中...`,
      background: 'rgba(255, 255, 255, 0.8)',
    });

    try {
      const { success, msg } = await signModel.doSignLogic(site);

      if (success) {
        await sendIyuuNotice(`${site.name} 签到结果`, msg);
        await tableModel.fetchRecords();
        ElMessage.success(msg + '！');
      } else {
        ElMessage.warning(msg + '...');
      }
    } catch (e) {
      ElMessage.error(`${site.name} 发生异常`);
    } finally {
      loadingInstance.close();
    }
  },

  // 批量签到
  async allSign() {
    const selectSite = proxy.$refs.tableRef.getSelectionRows();
    if (selectSite.length === 0) {
      ElMessage.warning('请先勾选需要签到的站点哟～');
      return;
    }

    signModel.isBatchSigning = true;
    const reportList = [];
    const backgroundTasks = [];

    const loadingInstance = ElLoading.service({
      lock: true,
      text: `正在批量执行 ${selectSite.length} 个任务，请稍候...`,
      background: 'rgba(255, 255, 255, 0.9)',
    });

    try {
      for (const site of selectSite) {
        // 有时候报错，没有签到也说签到了，现在取消一键签到中判定签到的逻辑
        // if (tableModel.checkIsSignedToday(site.name)) {
        //   reportList.push(`${site.name} ：已签到 (跳过)`);
        //   continue;
        // }

        const runInBackground = settingModel.allOpen && !site.active;

        if (runInBackground) {
          // 并发模式：直接把 Promise 塞进数组
          const task = signModel.doSignLogic(site).then(({ msg }) => {
            reportList.push(msg + ' (并发)');
          });
          backgroundTasks.push(task);
        } else {
          // 顺序模式：等待结果
          const { msg } = await signModel.doSignLogic(site);
          reportList.push(msg);
        }
      }

      // 等待所有后台任务完成
      if (backgroundTasks.length > 0) {
        await Promise.all(backgroundTasks);
      }

      await sendIyuuNotice(`批量签到结果`, reportList.join('\n'));
      await tableModel.fetchRecords();
      ElMessage.success('批量任务执行完毕哟！✨');

    } finally {
      loadingInstance.close();
      signModel.isBatchSigning = false;
    }
  },
  async doSignLogic(site) {
    let resultData = { success: false, msg: '' };
    try {
      const result = await handleSignTask(site);
      if (result.sign) {
        const today = new Date().toISOString().split('T')[0];
        await addSignDate(site.name, today); // 只有成功才记录日期
        resultData = { success: true, msg: `${site.name} 签到成功` };
      } else {
        resultData = { success: false, msg: `${site.name} 签到失败` };
      }
    } catch (e) {
      console.error(e);
      resultData = { success: false, msg: `${site.name} 执行出错` };
    }
    return resultData;
  },
});

// 记录首次使用时间
async function saveOnceUseTime() {
  const firstUseDate = await storage.get('first_use_date');
  if (!firstUseDate) {
    const now = new Date().toLocaleString();
    await storage.set('first_use_date', now);
    console.log('欢迎新用户！首次使用时间已记录:', now);
  }
}

onMounted(async () => {
  await saveOnceUseTime();
  await tableModel.init();
  await settingModel.init();

  // 处理自动签到指令
  if (route.query.action === 'autoSign') {
    setTimeout(() => {
      if (tableModel.tableData.length > 0) {
        signModel.allSign();
      }
      const query = { ...route.query };
      delete query.action;
      router.replace({ query });
    }, 1000);
  }
});
</script>