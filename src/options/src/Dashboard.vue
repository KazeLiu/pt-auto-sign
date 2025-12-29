<template>
  <div class="page-content">
    <h1>概览</h1>
    <el-card class="welcome-card">
      <div class="stats">
        <el-table :data="tableData" ref="tableRef">
          <el-table-column type="selection" width="55"/>
          <el-table-column label="站点" prop="name"></el-table-column>
          <el-table-column label="签到是否成功">
            <template #default="scope">
              <el-tag v-if="checkIsSignedToday(scope.row.name)" type="success">已签到</el-tag>
              <el-tag v-else type="danger">未签到</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="签到地址" prop="targetUrl" width="500">
            <template #default="scope">
              <a :href="scope.row.targetUrl">{{ scope.row.targetUrl }}</a>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button @click="sign(scope.row)">再次尝试签到</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import {siteList} from "../constant/siteList.js";
import {getCurrentInstance, onMounted, reactive, toRefs} from "vue";
import {handleSignTask} from "../utils/sign/index.js";
import {addSignDate} from "../utils/storage/signDate.js";
import {storage} from '../utils/storage';
import {sendIyuuNotice} from "../utils/iyuu/index.js";

const {proxy} = getCurrentInstance();
// 核心状态管理
const state = reactive({
  recordMap: {}, // 签到记录字典
  tableData: []  // 表格展示数据
});

// 使用 toRefs 保持模板中的引用不变 (recordMap, tableData)
const {recordMap, tableData} = toRefs(state);


// 🌸 2. 数据初始化与加载
// 从 Storage 加载记录并转换为 Map
async function fetchRecords() {
  const rawRecords = await storage.get('site_sign_records', []);
  const map = {};
  rawRecords.forEach(item => {
    map[item.key] = item.dates;
  });
  state.recordMap = map; // 更新状态
}

// 页面初始化入口
async function initData() {
  state.tableData = siteList; // 加载静态站点配置
  await fetchRecords();       // 加载动态签到记录
}

// 记录首次使用时间
async function saveOnceUseTime() {
  const firstUseDate = await storage.get('first_use_date');
  if (!firstUseDate) {
    const now = new Date().toLocaleString();
    await storage.set('first_use_date', now);
    console.log('🎉 欢迎新用户！首次使用时间已记录:', now);
  } else {
    console.log('🍵 这是一个老用户，首次使用于:', firstUseDate);
  }
}


// 核心业务逻辑
// 单个站点签到
async function sign(site) {
  let result = await handleSignTask(site);
  if (result.sign) {
    const today = new Date().toISOString().split('T')[0];
    await addSignDate(site.name, today);
    await sendIyuuNotice(`${site.name} 签到结果`, result.sign ? '签到成功' : '签到失败')
    await fetchRecords(); // 刷新记录
  }
}

// 一键全部签到
async function allSign() {
  let selectSite = proxy.$refs.tableRef.getSelectionRows();
  let list = [];
  for (const site of selectSite) {
    let result = await handleSignTask(site);
    if (result.sign) {
      const today = new Date().toISOString().split('T')[0];
      list.push(`${site.name} ：签到成功`)
      await addSignDate(site.name, today);
    } else {
      list.push(`${site.name} ：签到失败`)
    }
  }

  await sendIyuuNotice(`签到结果`, list.join('   '))
  await fetchRecords(); // 全部完成后刷新
}


// 辅助工具方法
// 检查某站点今日是否已签到
const checkIsSignedToday = (siteName) => {
  const dayStr = new Date().toISOString().split('T')[0];
  const dates = state.recordMap[siteName];
  return dates && dates.includes(dayStr);
};


onMounted(async () => {
  await saveOnceUseTime();
  await initData();
});
</script>

<style scoped>
.page-content {
  padding: 20px;
}

.welcome-card {
  margin-top: 20px;
}

.stats {
  display: flex;
  gap: 40px;
  margin-top: 20px;
}
</style>