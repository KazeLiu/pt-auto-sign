import { createRouter, createWebHashHistory } from 'vue-router';

// 注意这里的路径：.. 代表回到 options 目录，然后进入 src 目录找组件
import Home from '../src/Home.vue';
import Setting from '../src/Setting.vue';
import Push from '../src/Push.vue';

const routes = [
    {
        path: '/',
        redirect: '/Home'
    },
    {
        path: '/Home',
        component: Home,
        name: 'Home',
        meta: { title: '概览' }
    },
    {
        path: '/Setting',
        component: Setting,
        name: 'Setting',
        meta: { title: '设置' }
    },
    {
        path: '/Push',
        component: Push,
        name: 'Push',
        meta: { title: '推送设置' }
    }
];

const router = createRouter({
    // 必须使用 Hash 模式
    history: createWebHashHistory(),
    routes,
});

export default router;