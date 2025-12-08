<template>
  <div class="page-content">
    <h1>概览</h1>
    <el-card class="welcome-card">
      <div class="flex"><p>欢迎回来！今天也要记得签到哟～ 🌸</p>
        <el-button @click="allSign">一键全部签到</el-button>
      </div>
      <div class="stats">
        <el-table :data="tableData">
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
import {siteList} from "../constant/site.js";
import {onMounted, ref} from "vue";
import {handleSignTask} from "../utils/signIn/index.js";
import {addSignDate} from "../utils/storage/signDate.js";
import {storage} from '../utils/storage';

const recordMap = ref({}); // 签到记录表
const tableData = ref([]);

async function fetchRecords() {
  const rawRecords = await storage.get('site_sign_records', []);
  const map = {};
  rawRecords.forEach(item => {
    map[item.key] = item.dates;
  });
  recordMap.value = map; // 核心：更新响应式数据
}

async function sign(site) {
  let result = await handleSignTask(site);
  if (result.sign) {
    const today = new Date().toISOString().split('T')[0];
    await addSignDate(site.name, today);
    await fetchRecords();
  }
}

async function allSign() {
  for (const site of siteList) {
    let result = await handleSignTask(site);
    if (result.sign) {
      const today = new Date().toISOString().split('T')[0];
      await addSignDate(site.name, today);
    }
  }
  await fetchRecords();
}
async function init() {
  tableData.value = siteList;
  const rawRecords = await storage.get('site_sign_records', []);
  const map = {};
  rawRecords.forEach(item => {
    map[item.key] = item.dates;
  });
  recordMap.value = map;
}

// 判断站点xx日有没有签到
const checkIsSignedToday = (siteName, dayStr = new Date().toISOString().split('T')[0]) => {
  const dates = recordMap.value[siteName];
  if (dates && dates.includes(dayStr)) {
    return true;
  }
  return false;
};

onMounted(async () => {
  await init();
  await fetchRecords();
})
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