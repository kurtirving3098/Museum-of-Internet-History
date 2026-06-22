import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap-icons/font/bootstrap-icons.min.css';

import 'notyf/notyf.min.css';
import '@/assets/main.css';

import { createApp } from 'vue';
import App from '@/App.vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/pages/Home.vue';
import Register from '@/pages/Register.vue';
import Login from '@/pages/Login.vue';
import Blog from '@/pages/Blog.vue';
import Admin from '@/pages/Admin.vue';
import Dig from '@/pages/Dig.vue';
import Exhibits from '@/pages/Exhibits.vue';
import ExhibitDetail from '@/pages/ExhibitDetail.vue';
import Subscription from '@/pages/Subscription.vue';
import Forum from '@/pages/Forum.vue';
import UserProfile from '@/pages/UserProfile.vue';

import { useGlobalStore } from '@/stores/globalStore';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', name: "Home", component: Home },
        { path: '/register', name: 'Register', component: Register },
        { path: '/login', name: 'Login', component: Login },
        { path: '/blog', name: 'Blog', component: Blog},       
        { path: '/admin', name: 'Admin', component: Admin},
        { path: '/dig', name: 'Dig', component: Dig },       
        { path: '/exhibits', name: 'Exhibits', component: Exhibits },
        { path: '/exhibits/:id', name: 'ExhibitDetail', component: ExhibitDetail },
        { path: '/subscription', name: 'Subscription', component: Subscription },
        { path: '/forum', name: 'Forum', component: Forum },
        { path: '/profile', name: 'UserProfile', component: UserProfile },
    ]
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia); 

router.beforeEach((to) => {
    const globalStore = useGlobalStore();
    const protectedRoutes = ['Admin']; // add more route names as needed

    if (protectedRoutes.includes(to.name) && !globalStore.isAuthenticated) {
        return { name: 'Login' };
    }
});


app.use(router);
app.mount('#app');