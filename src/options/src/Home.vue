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
        <el-button @click="refreshData" :icon="Refresh" circle plain title="刷新数据"/>
        <el-button :icon="VideoPlay" type="primary" size="large" @click="allSign" :loading="isBatchSigning"
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
          <div class="text-xl font-bold text-gray-800">{{ tableData.length }} 个</div>
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
          <div class="text-xl font-bold text-gray-800">{{ signedCount }} 个</div>
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
          <div class="text-xl font-bold text-gray-800">{{ tableData.length - signedCount }} 个</div>
        </div>
      </div>
    </div>

    <el-card shadow="hover" class="rounded-xl border-none">
      <el-table
          :data="tableData"
          ref="tableRef"
          style="width: 100%"
          stripe
          v-loading="loading"
          :header-cell-style="{ background: '#f9fafb', color: '#6b7280' }"
      >
        <el-table-column type="selection" width="55" align="center"/>

        <el-table-column label="站点名称" prop="name"/>

        <el-table-column label="签到规则" prop="siteType" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">
              {{ row.siteType }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="今日状态" align="center">
          <template #default="{ row }">
            <el-tag v-if="checkIsSignedToday(row.name)" type="success" effect="dark" round>
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


        <el-table-column label="操作" width="150" align="cenetr" fixed="right">
          <template #default="{ row }">
            <el-button
                :type="checkIsSignedToday(row.name)?'success':'primary'"
                size="small"
                plain
                round
                @click="sign(row)"
            >
              {{ checkIsSignedToday(row.name) ? '再次签到' : '手动签到' }}
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
import {getCurrentInstance, nextTick, onMounted, reactive, toRefs, computed} from "vue";
import {handleSignTask} from "../utils/sign/index.js";
import {addSignDate} from "../utils/storage/signDate.js";
import {storage} from '../utils/storage';
import {sendIyuuNotice} from "../utils/iyuu/index.js";
import {useRoute} from "vue-router";
import router from "../router/index.js";
import {ElLoading, ElMessage} from "element-plus";
import {VideoPlay, Refresh, InfoFilled, List, Check, Timer, Select, CloseBold, Link} from '@element-plus/icons-vue';
import {getSiteData} from "../utils/storage/siteData.js";


const route = useRoute();
const {proxy} = getCurrentInstance();

// 核心状态管理
const state = reactive({
  recordMap: {}, // 签到记录字典
  tableData: [], // 表格展示数据
  loading: false, // 数据加载状态
  isBatchSigning: false // 是否正在批量签到
});

const {tableData, loading, isBatchSigning} = toRefs(state);

// 计算今日已签到数量
const signedCount = computed(() => {
  return state.tableData.filter(row => checkIsSignedToday(row.name)).length;
});

// 从 Storage 加载记录并转换为 Map
async function fetchRecords() {
  const rawRecords = await storage.get('site_sign_records', []);
  const map = {};
  rawRecords.forEach(item => {
    map[item.key] = item.dates;
  });
  state.recordMap = map;
}

// 页面初始化入口
async function initData() {
  state.loading = true;
  try {
    await fetchRecords();// 加载记录
    let data = await getSiteData(); //  加载配置的站点
    state.tableData = data.filter(x => x.enabled);
    autoSelectUnsigned();//  自动勾选
  } finally {
    state.loading = false;
  }
}

// 手动刷新数据
async function refreshData() {
  await initData();
  ElMessage.success('数据已刷新');
}

// 记录首次使用时间
async function saveOnceUseTime() {
  const firstUseDate = await storage.get('first_use_date');
  if (!firstUseDate) {
    const now = new Date().toLocaleString();
    await storage.set('first_use_date', now);
    console.log('欢迎新用户！首次使用时间已记录:', now);
  }
}

// 核心业务逻辑
// 单个站点签到
async function sign(site) {
  const loadingInstance = ElLoading.service({
    lock: true,
    text: `正在给 ${site.name} 签到中，风宝努力中...`,
    background: 'rgba(255, 255, 255, 0.8)',
  });

  try {
    let result = await handleSignTask(site);

    // 如果是无需验证的站点，通常直接返回成功或根据逻辑判断
    // 这里假设 handleSignTask 已经处理好了 site.notVerifyPage 的逻辑

    if (result.sign) {
      const today = new Date().toISOString().split('T')[0];
      await addSignDate(site.name, today);
      await sendIyuuNotice(`${site.name} 签到结果`, '签到成功');
      await fetchRecords(); // 刷新记录
      ElMessage.success(`${site.name} 签到成功啦！🎉`);
    } else {
      ElMessage.warning(`${site.name} 似乎没签到成功呢...`);
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`${site.name} 签到出错啦`);
  } finally {
    loadingInstance.close();
  }
}

// 一键全部签到
async function allSign() {
  let selectSite = proxy.$refs.tableRef.getSelectionRows();
  if (selectSite.length === 0) {
    ElMessage.warning('请先勾选需要签到的站点');
    return;
  }

  state.isBatchSigning = true;
  let list = [];

  const loadingInstance = ElLoading.service({
    lock: true,
    text: `正在批量执行 ${selectSite.length} 个任务，请稍候...`,
    background: 'rgba(255, 255, 255, 0.9)',
  });

  try {
    for (const site of selectSite) {
      // 如果已经签到过了，其实可以跳过，防止重复请求
      if (checkIsSignedToday(site.name)) {
        list.push(`${site.name} ：已签到 (跳过)`);
        continue;
      }

      let result = await handleSignTask(site);
      if (result.sign) {
        const today = new Date().toISOString().split('T')[0];
        list.push(`${site.name} ：签到成功`);
        await addSignDate(site.name, today);
      } else {
        list.push(`${site.name} ：签到失败`);
      }
    }

    await sendIyuuNotice(`批量签到结果`, list.join('\n'));
    await fetchRecords();
    ElMessage.success('批量任务执行完毕');
  } finally {
    loadingInstance.close();
    state.isBatchSigning = false;
  }
}

// 辅助工具方法
const checkIsSignedToday = (siteName) => {
  const dayStr = new Date().toISOString().split('T')[0];
  const dates = state.recordMap[siteName];
  return dates && dates.includes(dayStr);
};

// 自动勾选未签到的项目
const autoSelectUnsigned = () => {
  nextTick(() => {
    if (proxy.$refs.tableRef && state.tableData.length > 0) {
      proxy.$refs.tableRef.clearSelection();
      state.tableData.forEach(row => {
        if (!checkIsSignedToday(row.name)) {
          proxy.$refs.tableRef.toggleRowSelection(row, true);
        }
      });
    }
  });
};

onMounted(async () => {
  await saveOnceUseTime();
  await initData();

  if (route.query.action === 'autoSign') {
    setTimeout(() => {
      console.log('检测到自动签到指令，开始执行...');
      // 确保有数据后再执行
      if (state.tableData.length > 0) {
        allSign();
      }
      const query = {...route.query};
      delete query.action;
      router.replace({query});
    }, 1000);
  }
});
</script>

<style scoped>
</style>