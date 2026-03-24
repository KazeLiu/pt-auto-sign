<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="bg-white rounded-xl shadow-sm p-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800">
        其他设置
      </h1>
    </div>

    <!-- IYUU 推送 -->
    <el-card shadow="hover" class="rounded-xl border-none">
      <template #header>
        <div class="card-header flex justify-between items-center">
          <span>IYUU 推送</span>
        </div>
      </template>

      <div class="space-y-4">
        <el-input
            v-model="setting.iyuuId"
            placeholder="请输入 IYUU ID"
            clearable
        >
          <template #append>
            <el-button :icon="Select" @click="saveSetting"/>
          </template>
        </el-input>

        <div class="flex justify-between items-center text-sm text-gray-400">
          <span>
            <el-switch v-model="setting.openIyuuPush" @change="saveSetting" active-text="启用" inactive-text="禁用" inline-prompt/>
          </span>
          <div class="space-x-2">
            <el-button size="small" @click="openInNewTab('https://iyuu.cn/')">
              申请 ID
            </el-button>
            <el-button
                size="small"
                type="primary"
                plain
                @click="sendIyuuNotice('推送测试','如果收到这条推送，那表示你订阅成功')"
            >
              测试推送
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 标签页设置 -->
    <el-card shadow="hover" class="rounded-xl border-none">
      <template #header>
        <div class="card-header">
          <span>标签页设置</span>
        </div>
      </template>

      <el-form label-width="220px">
        <el-form-item label="批量打开后台签到页">
          <div class="flex items-center gap-3">
            <el-switch v-model="setting.allOpen" @change="saveSetting" active-text="启用" inactive-text="禁用" inline-prompt/>
            <span class="text-gray-400 text-sm">
              启用后，签到时会一次性打开多个 <span class="text-red-400">关闭</span> "前台激活页面" 选项的页面
            </span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 调试设置 -->
    <el-card shadow="hover" class="rounded-xl border-none">
      <template #header>
        <div class="card-header">
          <span>签到调试设置</span>
        </div>
      </template>

      <el-form label-width="220px">
        <el-form-item label="启用签到调试模式">
          <div class="flex items-center gap-3">
            <el-switch v-model="setting.debugSignFlow" @change="saveSetting" active-text="启用" inactive-text="禁用" inline-prompt/>
            <span class="text-gray-400 text-sm">
              启用后，签到页会以前台方式打开，并在执行注入脚本前自动暂停，方便你手动打开 DevTools 排查
            </span>
          </div>
        </el-form-item>

        <el-form-item label="调试暂停时长">
          <div class="flex items-center gap-3">
            <el-input-number
                v-model="setting.debugPauseMs"
                :min="0"
                :step="1000"
                :controls="true"
                @change="saveSetting"
            />
            <span class="text-gray-400 text-sm">
              单位毫秒。建议设置为 10000 ~ 30000，默认 15000
            </span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 自动签到设置 -->
    <el-card shadow="hover" class="rounded-xl border-none">
      <template #header>
        <div class="card-header">
          <span>自动签到设置</span>
        </div>
      </template>

      <el-form label-width="220px">
        <el-form-item label="启用自动签到">
          <div class="flex items-center gap-3">
            <el-switch v-model="setting.autoSign" @change="saveSetting" active-text="启用" inactive-text="禁用" inline-prompt/>
            <span class="text-gray-400 text-sm">
              启用后，插件将在指定时间自动执行签到任务
            </span>
          </div>
        </el-form-item>

        <el-form-item label="自动签到时间">
          <el-select
              v-model="setting.autoSignTime"
              @change="saveSetting"
              placeholder="请选择执行时间"
              style="width: 200px"
          >
            <el-option
                v-for="item in timeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            />
          </el-select>
          <span class="text-gray-400 text-sm ml-3">
            每天在选定时间自动执行签到
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {ElMessage} from "element-plus";
import {Select} from '@element-plus/icons-vue';

import {openInNewTab} from "../utils/index.js";
import {sendIyuuNotice} from "../utils/iyuu/index.js";
import {getSettingData, setSettingData} from "../utils/storage/settingData.js";

const setting = ref({});
const saveSetting = async () => {
  await setSettingData(setting.value);
  ElMessage.success('保存成功');
};

const timeOptions = [
  { label: '00:00', value: '00:00' },
  { label: '01:00', value: '01:00' },
  { label: '02:00', value: '02:00' },
  { label: '03:00', value: '03:00' },
  { label: '04:00', value: '04:00' },
  { label: '05:00', value: '05:00' },
  { label: '06:00', value: '06:00' },
  { label: '07:00', value: '07:00' },
  { label: '08:00', value: '08:00' },
  { label: '09:00', value: '09:00' },
  { label: '10:00', value: '10:00' },
  { label: '11:00', value: '11:00' },
  { label: '12:00', value: '12:00' },
  { label: '13:00', value: '13:00' },
  { label: '14:00', value: '14:00' },
  { label: '15:00', value: '15:00' },
  { label: '16:00', value: '16:00' },
  { label: '17:00', value: '17:00' },
  { label: '18:00', value: '18:00' },
  { label: '19:00', value: '19:00' },
  { label: '20:00', value: '20:00' },
  { label: '21:00', value: '21:00' },
  { label: '22:00', value: '22:00' },
  { label: '23:00', value: '23:00' },
];

onMounted(async () => {
  setting.value = await getSettingData();
});
</script>

<style scoped>
.card-header {
  font-size: 16px;
  font-weight: 500;
}
</style>
