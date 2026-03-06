import { createRouter, createWebHashHistory } from 'vue-router';
import coinCompare from '../views/coinCompare.vue';

const routes = [
  {
    path: '/coincompare',
    name: 'Coin Compare',
    component: coinCompare,
  },
  {
    path: '/fantokens',
    name: 'Fan Tokens',
    component: () => import(/* webpackChunkName: "fanTokens" */ '../views/fanTokens.vue'),
  },
  {
    path: '/',
    name: 'Test Page',
    component: () => import(/* webpackChunkName: "test" */ '../views/test.vue'),
  },
  {
    path: '/configs',
    name: 'Configs',
    component: () => import(/* webpackChunkName: "configs" */ '../views/configs.vue'),
  },
  {
    path: '/portfolio',
    name: 'Portfolio',
    component: () => import(/* webpackChunkName: "portfolio" */ '../views/portfolio.vue'),
  },
];

// Create a new router instance
const router = createRouter({
  history: createWebHashHistory(), // Ensure this is correctly imported
  routes,
});

export default router;
