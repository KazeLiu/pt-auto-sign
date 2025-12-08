<script setup>
import { ref } from 'vue';
import { startSignProcess } from '../logic/signer.js';

const isSigning = ref(false);
const statusMsg = ref('');

const handleSignIn = async () => {
  if (isSigning.value) return;

  isSigning.value = true;
  statusMsg.value = '准备中...';

  try {
    // 调用逻辑模块的方法
    const result = await startSignProcess();
    statusMsg.value = result.message;
  } catch (error) {
    statusMsg.value = '出错了哦';
    console.error(error);
  }
  // 稍微延迟一下恢复状态，让用户看到反馈
  setTimeout(() => {
    isSigning.value = false;
  }, 1000);
};
</script>

<template>
  <div class="container">
    <div class="header">
      <h2>PT 签到小助手</h2>
      <p class="subtitle">让签到变成一件轻松的小事</p>
    </div>

    <div class="content">
      <div class="welcome-card">
        <p>欢迎使用</p>
      </div>

      <button
          class="sign-btn"
          :class="{ 'disabled': isSigning }"
          @click="handleSignIn"
      >
        {{ isSigning ? '正在签到...' : '一键签到' }}
      </button>

      <p v-if="statusMsg" class="status-text">{{ statusMsg }}</p>
    </div>

    <div class="footer">
      <p>Author: 蓝宝</p>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  text-align: center;
  color: #555;
}

.header h2 {
  margin: 0;
  color: #4a4a4a;
  font-size: 18px;
}

.subtitle {
  margin: 5px 0 0;
  font-size: 12px;
  color: #888;
}

.content {
  margin: 20px 0;
  width: 100%;
}

.welcome-card {
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  font-size: 14px;
}

.sign-btn {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
  border: none;
  border-radius: 20px;
  padding: 10px 30px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  width: 80%;
}

.sign-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 154, 158, 0.4);
}

.sign-btn:active:not(.disabled) {
  transform: translateY(0);
}

.sign-btn.disabled {
  background: #e0e0e0;
  cursor: not-allowed;
  transform: none;
}

.status-text {
  margin-top: 10px;
  font-size: 12px;
  color: #ff9a9e;
}

.footer {
  margin-top: auto;
  font-size: 10px;
  color: #ccc;
  border-top: 1px solid #eee;
  width: 100%;
  padding-top: 10px;
}
</style>