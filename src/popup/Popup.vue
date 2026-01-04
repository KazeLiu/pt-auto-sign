<template>
  <div class="container">
    <div class="header">
      <h2>PT 签到小助手</h2>
      <p class="subtitle">让签到变成一件轻松的小事</p>
    </div>

    <div class="content">
      <!-- 普通打开，不做操作 -->
      <div class="sign-btn" type="primary" @click="openOptions">打开设置页</div>

      <!-- 打开新窗口并自动签到 -->
      <div class="sign-btn" style="margin-top: 20px" @click="openAndAutoSign">一键自动签到</div>
    </div>

    <div class="footer">
      <p>Author: KazeLiu</p>
    </div>
  </div>
</template>
<script setup>
// 普通打开 options 页面（浏览器标签页模式）
const openOptions = () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
};

// 新窗口打开并自动签到
const openAndAutoSign = () => {
  const baseUrl = chrome.runtime.getURL('src/options/index.html');
  const url = `${baseUrl}#/Home?action=autoSign`;
  chrome.windows.create({
    url: url,
    type: 'normal',
    width: 1600,
    height: 800,
    focused: true
  });
};
</script>
<style scoped>
.container {
  width: 240px;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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

.footer {
  margin-top: auto;
  font-size: 10px;
  color: #ccc;
  border-top: 1px solid #eee;
  width: 100%;
  padding-top: 10px;
}
</style>