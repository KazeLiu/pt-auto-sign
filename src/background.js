console.log("Hello from the PT sign");

// chrome.runtime.onInstalled.addListener((details) => {
//   console.log("Extension installed:", details);
// });

// 针对 Chrome (Manifest V3)
// if (typeof chrome.action !== 'undefined') {
//     chrome.action.onClicked.addListener(() => {
//         // 使用 chrome.runtime.openOptionsPage() 替代手动创建 Tab，这是官方推荐且最简洁的方法
//         if (chrome.runtime.openOptionsPage) {
//             chrome.runtime.openOptionsPage();
//         } else {
//             // 兼容性写法，以防万一
//             chrome.tabs.create({ url: 'src/options/index.html' });
//         }
//     });
// }