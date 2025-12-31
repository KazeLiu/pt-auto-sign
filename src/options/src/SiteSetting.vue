<template>
  <!-- 顶部卡片 -->
  <div class="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center transition hover:shadow-md">
    <div>
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        站点设置
      </h1>
    </div>
    <div class="flex gap-3 items-center">
      <input type="file" ref="fileInput" class="hidden" accept=".json" @change="actions.handleFileImport">
      <el-tooltip placement="top" effect="light">
        <template #content>
          <div class="prompt-container w-80 font-sans leading-relaxed text-gray-700 p-1">
            <div class="flex flex-col justify-between items-center mb-2">
              <span class="font-semibold text-gray-600 text-sm">如果你不会修改 JSON 文件，你可以复制下面的提示词丢给 AI 处理，导入后再修改需要单独配置规则的网站</span>
              <span class="text-red-400">请先仔细阅读提示词，然后在提示词最下面写入站点名称和站点签到的URL再给AI处理</span>
            </div>
            <div class="bg-gray-50 border border-gray-200 border-solid rounded-lg p-3 text-xs text-gray-500 relative">
              <div class="max-h-32 overflow-y-auto whitespace-pre-wrap cursor-text selection:bg-blue-100">请作为数据处理专家，根据我提供的站点列表，生成一个符合以下结构的 JSON 数组 , 然后请手把手教我怎么再Windows系统内创建一个JSON文件：
                - enabled: 固定为 true
                - name: 站点名称
                - notVerifyPage: 固定为 false
                - site: 站点 URL
                - siteType: 固定为 nexusPHP。

                待处理数据如下：
                [在此处粘贴站点列表，需要写入名称和签到的URL]
              </div>
            </div>
          </div>
        </template>
        <el-icon class="text-gray-400 cursor-help hover:text-blue-500" size="16">
          <QuestionFilled/>
        </el-icon>
      </el-tooltip>
      <el-button-group>
        <el-button :icon="Upload" @click="actions.triggerImport" plain>导入配置 JSON</el-button>
        <el-button :icon="Download" @click="actions.exportData" plain>导出配置 JSON</el-button>
      </el-button-group>
      <el-button :icon="Plus" type="primary" @click="actions.openAddDialog" circle plain title="添加新站点"/>
    </div>
  </div>

  <!-- 数据表格 -->
  <el-card shadow="hover" class="rounded-xl border-none">
    <el-table :data="appState.list" style="width: 100%" v-loading="appState.loading" stripe>

      <!-- 启用状态开关 -->
      <el-table-column label="启用" width="80" align="center">
        <template #default="{ row }">
          <el-switch
              v-model="row.enabled"
              active-color="#13ce66"
              @change="actions.saveAllData()"
              inline-prompt
          />
        </template>
      </el-table-column>

      <el-table-column label="站点名称" prop="name" width="180">
        <template #default="{ row }">
          <span class="font-bold text-gray-700">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="是否跳过验证" width="180">
        <template #default="{ row }">
          <el-tag v-if="row.notVerifyPage" type="warning" size="small" class="ml-1 origin-left" effect="plain">
            跳过验证
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型 (Type)" prop="siteType" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.siteType" effect="plain" round>{{ row.siteType }}</el-tag>
          <span v-else class="text-gray-300 text-xs">默认</span>
        </template>
      </el-table-column>

      <el-table-column label="签到地址 / URL" prop="site" min-width="250">
        <template #default="{ row }">
          <div class="flex items-center gap-2 truncate">
            <a :href="row.site" target="_blank"
               class="text-blue-500 hover:text-blue-700 hover:underline text-sm truncate max-w-[350px]">
              {{ row.site }}
            </a>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" align="right" fixed="right">
        <template #default="{ row, $index }">
          <el-button size="small" type="primary" :icon="Edit" link @click="actions.editSite(row, $index)">编辑
          </el-button>
          <el-button size="small" type="danger" :icon="Delete" link @click="actions.deleteSite($index)">删除</el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty description="还没有站点数据呢，快去添加吧～"></el-empty>
      </template>
    </el-table>
  </el-card>

  <!-- 编辑/新增 弹窗 -->
  <el-dialog
      v-model="dialogState.visible"
      :title="dialogState.isEdit ? '编辑站点' : '新增站点'"
      width="520px"
      class="rounded-xl"
      destroy-on-close
  >
    <el-form :model="formModel" label-width="120px" label-position="right" class="mt-2">

      <!-- 仅在新增模式下显示：快速预设选择 -->
      <el-form-item label="快速预设" v-if="!dialogState.isEdit">
        <div class="flex gap-3 items-center w-full">
          <el-select
              v-model="dialogState.selectedPreset"
              placeholder="选择一个常用站点自动填充"
              @change="actions.applyPreset"
              class="w-full"
              filterable
          >
            <el-option label="自定义" value="custom"></el-option>
            <el-option
                v-for="site in SITE_LIST"
                :key="site.name"
                :label="site.name"
                :value="site.name">
              <div class="flex justify-between items-center">
                <span class="float-left">{{ site.name }}</span>
                <span class="float-right text-gray-400 text-xs ml-2">{{ site.siteType }}</span>
              </div>
            </el-option>
          </el-select>
          <el-tooltip>
            <template #content>
              <div class="max-w-[260px] text-xs leading-5">
                快速预设只是举例，请选择自定义后手填
              </div>
            </template>
            <el-icon class="text-gray-400 cursor-help hover:text-blue-500 text-sm">
              <QuestionFilled/>
            </el-icon>
          </el-tooltip>
        </div>
      </el-form-item>

      <el-divider v-if="!dialogState.isEdit" content-position="center" border-style="dashed">站点详情</el-divider>

      <el-form-item label="站点名称" required>
        <el-input v-model="formModel.name" placeholder="例如：U2 动漫花园" clearable/>
      </el-form-item>

      <el-form-item label="站点类型" required>
        <div class="flex gap-3 w-full items-center">
          <el-select
              v-model="formModel.siteType"
              placeholder="请选择或输入新类型"
              filterable
              default-first-option
              class="w-full"
          >
            <el-option v-for="[key, value] in Object.entries(SITE_TYPES)" :key="key" :label="key" :value="value"/>
          </el-select>
          <el-tooltip placement="top" effect="light">
            <template #content>
              <div class="max-w-[260px] text-xs leading-5">
                <p class="mb-2">
                  <strong class="text-blue-500">Online:</strong>
                  进入页面访问一下就关闭，防止太久没访问主页导致账户封禁。
                </p>
                <p>
                  <strong class="text-green-500">NexusPHP:</strong>
                  通用配置，只要有签到又没有特殊规则的都用这个。
                </p>
              </div>
            </template>
            <el-icon class="text-gray-400 cursor-help hover:text-blue-500 text-sm">
              <QuestionFilled/>
            </el-icon>
          </el-tooltip>
        </div>
      </el-form-item>

      <el-form-item label="签到地址" required>
        <el-input v-model="formModel.site" placeholder="https://..." type="url" clearable/>
      </el-form-item>

      <el-form-item label="是否跳过验证" required>
        <div class="flex gap-3 w-full items-center justify-between">
          <el-switch v-model="formModel.notVerifyPage" active-text="跳过" inactive-text="不跳过" inline-prompt
                     active-color="#13ce66"/>
          <el-tooltip placement="top" effect="light">
            <template #content>
              <div class="max-w-[260px] text-xs leading-5">
                通过页面关键字来判定当前页面是否是等待验证的页面，如果启用，则不等待验证页面。<br/>如果签到页面加载完毕但是程序上没有提示签到成功，那么签到页面上应该有对应的关键字，需要关闭后再次尝试签到
              </div>
            </template>
            <el-icon class="text-gray-400 cursor-help hover:text-blue-500 text-sm">
              <QuestionFilled/>
            </el-icon>
          </el-tooltip>
        </div>
      </el-form-item>

      <el-form-item label="是否启用">
        <el-switch v-model="formModel.enabled" active-text="启用" inactive-text="停用" inline-prompt
                   active-color="#13ce66"/>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="flex justify-between">
        <el-button type="info"
                   @click="openInNewTab('https://github.com/KazeLiu/pt-auto-sign/issues/new')">我的站点需要定制签到流程</el-button>
          <div class="flex">
            <el-button @click="dialogState.visible = false">取消</el-button>
            <el-button type="primary" @click="actions.submitForm">确定保存</el-button>
          </div>
      </span>
    </template>
  </el-dialog>

</template>

<script setup>
import {onMounted, reactive, ref} from "vue";
import {getSiteData, setSiteData} from "../utils/storage/siteData.js";
import {SITE_LIST, SITE_TYPES} from "../constant/site.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {openInNewTab} from "../utils/index.js";
import {Delete, Edit, Download, Upload, Plus} from '@element-plus/icons-vue'

const fileInput = ref(null);

const appState = reactive({
  list: [],
  loading: false,
  saving: false
});

const dialogState = reactive({
  visible: false,
  isEdit: false,
  editIndex: -1,
  selectedPreset: ''
});

const formModel = reactive({
  name: '',
  siteType: '',
  site: '',
  enabled: true,
  notVerifyPage: false
});

const actions = {
  // 初始化数据
  initData: async () => {
    appState.loading = true;
    appState.list = await getSiteData();
    appState.loading = false;
  },

  // 保存所有数据
  saveAllData: async () => {
    appState.saving = true;
    await setSiteData(appState.list);
    appState.saving = false;
  },

  // 打开新增窗口
  openAddDialog: () => {
    dialogState.isEdit = false;
    dialogState.selectedPreset = '';
    Object.assign(formModel, {name: '', siteType: '', site: '', enabled: true, notVerifyPage: false});
    dialogState.visible = true;
  },

  // 应用预设逻辑
  applyPreset: (val) => {
    if (val === 'custom') {
      Object.assign(formModel, {name: '', siteType: '', site: '', enabled: true, notVerifyPage: false});
    } else {
      const target = SITE_LIST.find(p => p.name === val);
      if (target) {
        Object.assign(formModel, {
          name: target.name,
          siteType: target.siteType,
          site: target.site,
          enabled: true,
          notVerifyPage: target.notVerifyPage || false
        });
      }
    }
  },

  // 打开编辑窗口
  editSite: (row, index) => {
    dialogState.editIndex = index;
    dialogState.isEdit = true;
    Object.assign(formModel, {notVerifyPage: false, ...row});
    dialogState.visible = true;
  },

  // 提交表单
  submitForm: () => {
    if (!formModel.name || !formModel.site) {
      ElMessage.warning('名字和地址不能为空');
      return;
    }

    const newItem = {...formModel};

    if (dialogState.isEdit) {
      appState.list[dialogState.editIndex] = newItem;
      ElMessage.success(`已更新 ${newItem.name}`);
    } else {
      appState.list.push(newItem);
      ElMessage.success(`已添加 ${newItem.name}`);
    }

    dialogState.visible = false;
    actions.saveAllData();
  },

  // 删除站点
  deleteSite: (index) => {
    ElMessageBox.confirm('确认要删除这个站点吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      appState.list.splice(index, 1);
      actions.saveAllData();
      ElMessage.info('已删除');
    }).catch(() => {
    });
  },

  // 导出 JSON
  exportData: () => {
    const dataStr = JSON.stringify(appState.list, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    console.log(`[站点列表] 站点导出成功 ${appState.list.length} 个`, dataStr)
    const a = document.createElement('a');
    a.href = url;
    a.download = `site_config_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success('配置导出完成');
  },

  triggerImport: () => {
    fileInput.value.click();
  },

  // 处理文件导入
  handleFileImport: (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          let addedCount = 0;
          // 简单的去重逻辑：如果 URL 不存在才添加
          importedData.forEach(item => {
            const exists = appState.list.some(old => old.site === item.site);
            if (!exists) {
              // 确保新导入的数据有默认字段
              appState.list.push({
                enabled: true,
                notVerifyPage: false,
                siteType: "nexusPHP",
                ...item
              });
              addedCount++;
            }
          });
          actions.saveAllData();
          console.log(`[站点列表] 站点导入成功 ${addedCount} 个`, appState.list)
          if (addedCount > 0) {
            ElMessage.success(`成功导入了 ${addedCount} 个新站点`);
          } else {
            ElMessage.info('导入的数据看起来都已经存在');
          }
        } else {
          ElMessage.error('文件格式不对，需要 JSON 数组格式');
        }
      } catch (err) {
        ElMessage.error('解析失败，请检查 JSON 文件是否正确。');
        console.error(err);
      }
      // 清空 input 方便下次重复选择同个文件
      event.target.value = '';
    };
    reader.readAsText(file);
  },
};

onMounted(() => {
  actions.initData();
});
</script>

<style scoped>

</style>