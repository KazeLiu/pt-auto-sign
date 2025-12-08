import { createRouter, createWebHashHistory } from 'vue-router';

// 注意这里的路径：.. 代表回到 options 目录，然后进入 src 目录找组件
import Dashboard from '../src/Dashboard.vue';

const routes = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/dashboard',
        component: Dashboard,
        name: 'Dashboard',
        meta: { title: '概览' }
    }
];

const router = createRouter({
    // 必须使用 Hash 模式
    history: createWebHashHistory(),
    routes,
});

export default router;