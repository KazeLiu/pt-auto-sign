<template>
  <!-- 顶部卡片 -->
  <div class="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-wrap gap-4 justify-between items-center transition hover:shadow-md">
    <div>
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        站点设置
      </h1>
    </div>
    <div class="flex flex-wrap gap-3 items-center">
      <input type="file" ref="fileInput" class="hidden" accept=".json" @change="actions.handleFileImport">
      <el-tooltip placement="top" effect="light">
        <template #content>
          <div class="prompt-container w-80 font-sans leading-relaxed text-gray-700 p-1">
            <div class="flex flex-col justify-between items-center mb-2">
              <span class="font-semibold text-gray-600 text-sm">如果你不会修改 JSON 文件，你可以复制下面的提示词丢给 AI 处理，导入后再修改需要单独配置规则的网站</span>
              <span
                  class="text-red-400">请先仔细阅读提示词，然后在提示词最下面写入站点名称和站点签到的URL再给AI处理</span>
            </div>
            <div class="bg-gray-50 border border-gray-200 border-solid rounded-lg p-3 text-xs text-gray-500 relative">
              <div class="max-h-32 overflow-y-auto whitespace-pre-wrap cursor-text selection:bg-blue-100">
                请作为数据处理专家，根据我提供的站点列表，生成一个符合以下结构的 JSON 数组 ,
                然后请手把手教我怎么再Windows系统内创建一个JSON文件：
                - enabled: 固定为 true
                - name: 站点名称
                - notVerifyPage: 固定为 false
                - site: 站点 URL
                - siteType: 固定为 nexusPHP。
                - active: 固定为 false。

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
      <el-button :icon="Download" :disabled="appState.loading || appState.saving || !appState.list.length"
                 @click="actions.openCookieExport" plain>导出 PT Cookies</el-button>
      <el-button :icon="Plus" type="primary" @click="actions.openAddDialog" plain>添加新站点</el-button>
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
      <el-table-column label="前台激活" width="180">
        <template #default="{ row }">
          <el-tag v-if="row.active" type="error" size="small" class="ml-1 origin-left" effect="plain">
            前台激活
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

  <el-dialog
      v-model="cookieExportState.visible"
      title="导出 PT Cookies"
      width="min(560px, 92vw)"
      :close-on-click-modal="!cookieExportState.exporting"
      :close-on-press-escape="!cookieExportState.exporting"
      :show-close="!cookieExportState.exporting"
  >
    <div class="space-y-4">
      <p class="text-gray-700 leading-6">
        导出当前配置的全部 {{ appState.list.length }} 个站点（含停用站点）的 Cookies，合并为一个 JSON 文件。
        首次导出需授权读取 Cookies，文件仅在本地生成，不会上传。
      </p>
      <el-alert title="文件包含登录凭据，仅交给可信工具导入；请勿公开或提交到代码仓库。"
                type="warning" :closable="false" show-icon/>
      <el-alert v-if="cookieExportState.error" :title="cookieExportState.error"
                type="error" :closable="false" show-icon/>
      <div v-if="cookieExportState.result" class="space-y-2" role="status" aria-live="polite">
        <p v-if="cookieExportState.result.fileName" class="text-gray-700 leading-6 break-all">
          已发起下载：{{ cookieExportState.result.fileName }}
          （{{ cookieExportState.result.siteCount }} 个站点，{{ cookieExportState.result.cookieCount }} 条 Cookies）。
        </p>
        <p v-else class="text-gray-700 leading-6">没有读取到可导出的 Cookies，未生成文件。</p>
        <p v-if="cookieExportState.result.emptySites.length" class="text-gray-700 leading-6 break-words">
          未读取到 Cookies：{{ cookieExportState.result.emptySites.join('、') }}。
          请在当前浏览器中登录，并确认插件已获准访问这些站点后重新导出。
        </p>
      </div>
    </div>
    <template #footer>
      <el-button :disabled="cookieExportState.exporting" @click="cookieExportState.visible = false">关闭</el-button>
      <el-button type="primary" :loading="cookieExportState.exporting" @click="actions.exportCookies">
        {{ cookieExportState.result ? '重新导出 JSON' : '导出 JSON' }}
      </el-button>
    </template>
  </el-dialog>

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
                通过页面关键字来判定当前页面是否是等待验证的页面，如果启用，则不等待验证页面。<br/>
                因为有些签到页上会有关键字（比如cloudflare），导致页面是网站签到页但是会被判定为等待页，然后就会超时然后返回签到失败（其实是签到成功了），所以有这种情况的就需要关闭
              </div>
            </template>
            <el-icon class="text-gray-400 cursor-help hover:text-blue-500 text-sm">
              <QuestionFilled/>
            </el-icon>
          </el-tooltip>
        </div>
      </el-form-item>
      <el-form-item label="前台激活页面">
        <div class="flex gap-3 w-full items-center justify-between">
          <el-switch v-model="formModel.active" active-text="启用" inactive-text="停用" inline-prompt
                     active-color="#13ce66"/>
          <el-tooltip placement="top" effect="light">
            <template #content>
              <div class="max-w-[260px] text-xs leading-5">
                前台激活会直接打开页面，会影响正常使用，主要是cloudflare会判定页面是否在前台，如果在后台则无法通过验证。<br/>
                关闭的时候是后台静默，后台静默还是会打开标签页，它会在浏览器添加一个小的图标标签然后执行判定脚本，不会影响正常使用。
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
import {getSiteData, setSiteData, validateSiteList} from "../utils/storage/siteData.js";
import {SITE_LIST, SITE_TYPES} from "../constant/site.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {openInNewTab} from "../utils/index.js";
import {collectSiteCookies} from "../utils/cookieExport.js";
import {Delete, Edit, Download, Upload, Plus} from '@element-plus/icons-vue'
import browser from "webextension-polyfill";

const fileInput = ref(null);

const appState = reactive({
  list: [],
  loading: false,
  saving: false
});

const cookieExportState = reactive({
  visible: false,
  exporting: false,
  result: null,
  error: ''
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
  active: false,
  notVerifyPage: false
});

const downloadJson = (data, fileName) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const actions = {
  // 初始化数据
  init: async () => {
    appState.loading = true;
    appState.list = await getSiteData();
    appState.loading = false;
  },

  // 保存所有数据
  saveAllData: async () => {
    appState.saving = true;
    try {
      await setSiteData(appState.list);
    } finally {
      appState.saving = false;
    }
  },

  // 打开新增窗口
  openAddDialog: () => {
    dialogState.isEdit = false;
    dialogState.selectedPreset = '';
    Object.assign(formModel, {
      name: '', siteType: '', site: '', enabled: true, active: false, notVerifyPage: false
    });
    dialogState.visible = true;
  },

  // 应用预设逻辑
  applyPreset: (val) => {
    if (val === 'custom') {
      Object.assign(formModel, {
        name: '',
        siteType: '',
        site: '',
        enabled: true,
        active: false,
        notVerifyPage: false
      });
    } else {
      const target = SITE_LIST.find(p => p.name === val);
      if (target) {
        Object.assign(formModel, {
          name: target.name,
          siteType: target.siteType,
          site: target.site,
          enabled: true,
          active: false,
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
  submitForm: async () => {
    if (!formModel.name || !formModel.site) {
      ElMessage.warning('名字和地址不能为空');
      return;
    }

    const newItem = {...formModel};
    const previousList = appState.list.slice();

    if (dialogState.isEdit) {
      appState.list.splice(dialogState.editIndex, 1, newItem);
    } else {
      appState.list.push(newItem);
    }

    try {
      validateSiteList(appState.list);
      await actions.saveAllData();
      dialogState.visible = false;
      ElMessage.success(dialogState.isEdit ? `已更新 ${newItem.name}` : `已添加 ${newItem.name}`);
    } catch (error) {
      appState.list = previousList;
      ElMessage.error('保存失败，请打开控制台查看错误');
      console.error('[站点列表] 保存失败:', error);
    }
  },

  // 删除站点
  deleteSite: (index) => {
    ElMessageBox.confirm('确认要删除这个站点吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(async () => {
      const previousList = appState.list.slice();
      appState.list.splice(index, 1);
      try {
        await actions.saveAllData();
        ElMessage.info('已删除');
      } catch (error) {
        appState.list = previousList;
        ElMessage.error('删除失败，请打开控制台查看错误');
        console.error('[站点列表] 删除失败:', error);
      }
    }).catch(() => {
    });
  },

  // 导出 JSON
  exportData: () => {
    downloadJson(appState.list, `site_config_${new Date().getTime()}.json`);
    ElMessage.success('配置导出完成');
  },

  openCookieExport: () => {
    cookieExportState.result = null;
    cookieExportState.error = '';
    cookieExportState.visible = true;
  },

  exportCookies: async () => {
    if (cookieExportState.exporting) return;
    cookieExportState.exporting = true;
    cookieExportState.result = null;
    cookieExportState.error = '';
    try {
      // 直接由按钮点击申请权限，避免异步确认弹窗丢失用户手势。
      const granted = await browser.permissions.request({permissions: ['cookies']});
      if (!granted) {
        cookieExportState.error = '未获得 Cookie 读取权限，未生成文件。可再次点击导出并授权。';
        return;
      }
      const {cookies, emptySites, siteCount} = await collectSiteCookies(appState.list);
      const fileName = cookies.length ? `pt_cookies_${Date.now()}.json` : '';
      if (fileName) downloadJson(cookies, fileName);
      cookieExportState.result = {fileName, cookieCount: cookies.length, siteCount, emptySites};
    } catch (error) {
      cookieExportState.error = `导出失败：${error.message}。请确认扩展已重新加载，并获准访问站点后重试。`;
    } finally {
      cookieExportState.exporting = false;
    }
  },

  triggerImport: () => {
    fileInput.value.click();
  },

  // 处理文件导入
  handleFileImport: (event) => {
    const file = event.target.files[0];
    if (!file) return;
    ElMessageBox.confirm(
        '导入操作将【清空并覆盖】当前所有站点数据，此操作无法撤销。\n确定要继续吗？',
        '覆盖确认',
        {
          confirmButtonText: '确定覆盖',
          cancelButtonText: '取消',
          type: 'warning',
        }
    )
        .then(() => {
          // 2. 用户点击“确定”后，才开始读取文件
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const importedData = JSON.parse(e.target.result);
              if (Array.isArray(importedData)) {
                // 3. 直接覆盖数据，不再去重
                const nextList = importedData.map(item => ({
                  enabled: true,
                  notVerifyPage: false,
                  siteType: "nexusPHP",
                  ...item
                }));
                validateSiteList(nextList);
                appState.list = nextList;
                actions.saveAllData()
                    .then(() => {
                      console.log(`[站点列表] 站点数据已覆盖，共 ${appState.list.length} 个`);
                      ElMessage.success(`导入成功！现有列表已被 ${appState.list.length} 个新站点覆盖`);
                    })
                    .catch(error => {
                      ElMessage.error('导入保存失败，请打开控制台查看错误');
                      console.error('[站点列表] 导入保存失败:', error);
                    });
              } else {
                ElMessage.error('文件格式不对，需要 JSON 数组格式');
              }
            } catch (err) {
              ElMessage.error('解析失败，请检查 JSON 文件是否正确。');
              console.error(err);
            }
            // 无论成功还是失败，最后都清空 input，方便下次选择
            event.target.value = '';
          };
          reader.readAsText(file);
        })
        .catch(() => {
          ElMessage.info('已取消导入');
          event.target.value = '';
        });
  },
};

onMounted(() => {
  actions.init();
});
</script>

<style scoped>

</style>
