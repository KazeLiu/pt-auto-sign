<template>
  <router-view></router-view>
</template>

<script setup>
import router from "./router/index.js";

const a = function () {
  router.push("/dashboard");
}

const b = function () {
  router.push("/settings")
}
</script>


<style scoped>

</style>