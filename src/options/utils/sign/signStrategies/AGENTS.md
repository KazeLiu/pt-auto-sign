# 签到策略约定

- 策略由 `chrome.scripting.executeScript` 传递函数本体到网页执行，无法访问扩展模块作用域；函数及其辅助逻辑必须自包含。验证时应把函数 `toString()` 后放入独立上下文执行，例如 `test/ttg-sign.test.js`。
- 点击已触发但尚未确认的结果使用 `pending: true`、`status: 'action-triggered'`；调度器依据此状态停止自动重试，避免重复提交。明确的已签到状态才返回成功。修改异步点击策略时须覆盖延迟回执、超时未确认和不重复点击的行为。
