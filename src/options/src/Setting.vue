<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="bg-white rounded-xl shadow-sm p-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800">
        其他设置
      </h1>
    </div>

    <!-- 消息推送 -->
    <el-card shadow="hover" class="rounded-xl border-none">
      <template #header>
        <div class="card-header flex justify-between items-center">
          <span>消息推送</span>
        </div>
      </template>

      <div class="space-y-4">
        <el-form label-position="top" :disabled="testingPush || !settingsLoaded">
          <el-form-item label="推送渠道">
            <el-radio-group v-model="setting.pushProvider" @change="changePushProvider">
              <el-radio-button value="iyuu">IYUU（微信）</el-radio-button>
              <el-radio-button value="telegram">Telegram</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <template v-if="setting.pushProvider === 'telegram'">
            <el-form-item label="Bot Token">
              <el-input v-model="setting.telegramBotToken" type="password" show-password clearable autocomplete="off"
                        placeholder="从 @BotFather 获取" @input="clearPushResult"/>
            </el-form-item>
            <el-form-item label="Chat ID">
              <el-input v-model="setting.telegramChatId" clearable placeholder="个人或群组的数字 ID，也支持 @频道用户名"
                        @input="clearPushResult"/>
            </el-form-item>
            <p class="text-sm text-gray-600 leading-6 mb-4">
              在 @BotFather 创建机器人，先在目标会话向机器人发送 /start，再填写 Token 和 Chat ID。
              群组需先加入机器人，频道需授予发送权限。浏览器网络须能访问 api.telegram.org。
            </p>
          </template>
          <template v-else>
            <el-form-item label="IYUU Token（ID）">
              <el-input v-model="setting.iyuuId" type="password" show-password clearable autocomplete="off"
                        placeholder="填写 IYUU 绑定后获得的 Token" @input="clearPushResult"/>
            </el-form-item>
          </template>

          <el-form-item label="自动推送签到结果">
            <el-switch v-model="pushEnabled" @change="saveSetting" active-text="启用" inactive-text="禁用" inline-prompt/>
            <span class="text-gray-600 text-sm ml-3">只向所选渠道推送，批量签到发送一份汇总</span>
          </el-form-item>
          <div class="flex flex-wrap gap-2">
            <el-button v-if="setting.pushProvider === 'iyuu'" @click="openInNewTab('https://iyuu.cn/')">申请 Token</el-button>
            <el-button v-else @click="openInNewTab('https://t.me/BotFather')">打开 BotFather</el-button>
            <el-button @click="saveSetting">保存配置</el-button>
            <el-button type="primary" :loading="testingPush" @click="testPush">测试推送</el-button>
          </div>
          <p class="text-gray-600 text-sm mt-3">测试会保存并使用当前填写的配置，即使自动推送关闭也会发送一条测试消息。</p>
        </el-form>
        <div v-if="pushResult" aria-live="polite">
          <el-alert :title="pushResult.message" :type="pushResult.ok ? 'success' : 'error'" :closable="false" show-icon/>
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
        <el-form-item label="验证超时后保留页面">
          <div class="flex items-center gap-3">
            <el-switch v-model="setting.keepVerificationPageOnTimeout" :disabled="!settingsLoaded"
                       @change="saveSetting" active-text="启用" inactive-text="禁用" inline-prompt/>
            <span class="text-gray-400 text-sm">开启后，安全验证等待超时的签到页会留下供手动处理</span>
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
import {computed, onMounted, ref} from "vue";
import {ElMessage} from "element-plus";

import {openInNewTab} from "../utils/index.js";
import {sendPushNotice} from "../utils/push/index.js";
import {DEFAULT_SETTINGS, getSettingData, setSettingData} from "../utils/storage/settingData.js";

const setting = ref({...DEFAULT_SETTINGS});
const settingsLoaded = ref(false);
const testingPush = ref(false);
const pushResult = ref(null);
const pushEnabled = computed({
  get: () => setting.value.pushProvider === 'telegram' ? setting.value.openTelegramPush : setting.value.openIyuuPush,
  set: value => {
    const key = setting.value.pushProvider === 'telegram' ? 'openTelegramPush' : 'openIyuuPush';
    setting.value[key] = value;
  },
});
const saveSetting = async () => {
  try {
    await setSettingData(setting.value);
    ElMessage.success('保存成功');
  } catch {
    ElMessage.error('设置保存失败，请重试');
  }
};
const clearPushResult = () => {pushResult.value = null;};
const changePushProvider = async () => {
  clearPushResult();
  await saveSetting();
};
const testPush = async () => {
  if (testingPush.value || !settingsLoaded.value) return;
  testingPush.value = true;
  clearPushResult();
  try {
    const settings = {...setting.value};
    await setSettingData(settings);
    pushResult.value = await sendPushNotice('PT 签到小助手 · 推送测试', '收到这条消息表示推送配置可用。', {settings, force: true});
  } catch {
    pushResult.value = {ok: false, message: '设置保存失败，未发送测试消息，请重试'};
  } finally {
    testingPush.value = false;
  }
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
  settingsLoaded.value = true;
});
</script>

<style scoped>
.card-header {
  font-size: 16px;
  font-weight: 500;
}
</style>
