<template>
  <div class="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center transition hover:shadow-md">
    <div>
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        推送设置
      </h1>
    </div>
  </div>

  <el-card  shadow="hover" class="rounded-xl border-none">
    <template #header>
      <div class="card-header">
        <span>IYUU推送</span>
      </div>
    </template>
    <el-input
        v-model="iyuuId"
        placeholder="IYUU的ID"
    >
      <template #append>
        <el-button :icon="Select" @click="saveIyuuId" />
      </template>
    </el-input>
    <div class="flex mt-5 items-center justify-between">
      <div class="text-gray-400">暂时没写推送开关，如果不需要推送，请将IYUU的ID置空</div>
      <div>
        <el-button @click="openInNewTab('https://iyuu.cn/')">
          申请ID
        </el-button>
        <el-button @click="sendIyuuNotice('推送测试','如果收到这条推送，那表示你订阅成功')">测试推送</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {openInNewTab} from "../utils/index.js";
import {sendIyuuNotice} from "../utils/iyuu/index.js";
import {getIyuuKey, setIyuuKey} from "../utils/storage/pushData.js";
import {ElMessage} from "element-plus";
import {Select} from '@element-plus/icons-vue'

const iyuuId = ref('');

const saveIyuuId = () => {
  setIyuuKey(iyuuId.value)
  ElMessage({
    message: '保存成功',
    type: 'success',
  })
}

onMounted(async () => {
  iyuuId.value = await getIyuuKey();
})
</script>

<style scoped>

</style>