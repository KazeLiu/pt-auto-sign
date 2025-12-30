<template>
  <el-menu
      mode="horizontal"
      :ellipsis="false"
      :default-active="route.path"
      router
  >
    <el-menu-item>
      <img
          style="width:30px"
          src="./assets/logo.png"
          alt="这是一个logo"
      />
    </el-menu-item>
    <el-menu-item index="/Home">主页</el-menu-item>
    <el-sub-menu index="2">
      <template #title>设置</template>
      <el-menu-item index="/Setting">站点设置</el-menu-item>
      <el-menu-item index="/Push">推送设置</el-menu-item>
    </el-sub-menu>

    <div class="flex-grow" />

    <el-menu-item index="/Home">
      <a href="https://github.com/KazeLiu/pt-auto-sign" target="_blank" rel="noopener noreferrer" class="github-link">
        <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true">
          <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
        </svg>
      </a>
    </el-menu-item>
  </el-menu>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component"/>
    </transition>
  </router-view>
</template>

<script setup>
import {useRoute} from "vue-router";
// 获取当前路由对象，用来控制菜单的高亮状态
const route = useRoute();
</script>


<style scoped>
/* 页面进入和离开时的过渡状态 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

/* 页面进入开始前，和离开结束后的透明度 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>