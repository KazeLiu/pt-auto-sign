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
            <el-switch v-model="setting.allOpen" @change="saveSetting"/>
            <span class="text-gray-400 text-sm">
              启用后，签到时会一次性打开多个 <span class="text-red-400">关闭</span> "前台激活页面" 选项的页面
            </span>
          </div>
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

