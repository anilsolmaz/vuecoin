import { createStore } from 'vuex';
import { io } from 'socket.io-client';
import axios from 'axios';

let socketInstance = null;

export default createStore({
  state: {
    coinData: {},
    coinList: [],
    isConnected: false,
    lastUpdateTime: null,
    settings: {
      crossEnabled: true,
      intraEnabled: true,
      paribuEnabled: true,
      crossMinProfit: 1000,
      crossMinROI: 0.50,
      crossCooldown: 5,
      intraMinROI: 0,
      intraMinProfit: 100,
      intraCooldown: 5,
      paribuMinROI: 0,
      paribuMinProfit: 50,
      blockedCoins: [],
      topCoins: ['btc', 'bnb', 'eth', 'usdt', 'fet', 'sol', 'ftt', 'xrp', 'pepe', 'shib', 'btt', 'chz'],
      topDealsCount: 10
    },
    isInitialized: false
  },
  mutations: {
    SET_COIN_DATA(state, data) {
      if (data && typeof data === 'object') {
        state.coinData = data;
        state.coinList = Object.keys(data).filter(k => k !== 'usdt');
        state.lastUpdateTime = Date.now();
        state.isInitialized = true;
      }
    },
    SET_CONNECTED(state, val) {
      state.isConnected = val;
    },
    SET_SETTINGS(state, settings) {
      state.settings = { ...state.settings, ...settings };
    }
  },
  actions: {
    initSocket({ commit, dispatch }) {
      if (socketInstance) return; // Persistent singleton socket across entire SPA lifecycle

      const isDemo = typeof window !== 'undefined' && 
        (window.location.hostname.includes('github.io') || window.location.search.includes('demo=1'));
      if (isDemo) return;

      socketInstance = io();

      socketInstance.on('connect', () => {
        commit('SET_CONNECTED', true);
        console.log('⚡ [Vuex] Global WebSocket connected');
      });

      socketInstance.on('data_update', (data) => {
        if (data && (data.btc || Object.keys(data).length > 5)) {
          commit('SET_COIN_DATA', data);
        }
      });

      socketInstance.on('settings_update', (newSettings) => {
        if (newSettings && typeof newSettings === 'object') {
          console.log('⚙️ [Vuex] Live settings update received');
          commit('SET_SETTINGS', newSettings);
        }
      });

      socketInstance.on('disconnect', () => {
        commit('SET_CONNECTED', false);
        console.log('⚠️ [Vuex] Global WebSocket disconnected');
      });

      dispatch('fetchSettings');
    },

    async fetchSettings({ commit }) {
      try {
        const response = await axios.get('/api/settings');
        if (response.data) {
          commit('SET_SETTINGS', response.data);
        }
      } catch (e) {
        // Fallback silently if offline or demo
      }
    }
  },
  getters: {
    coinData: state => state.coinData,
    isConnected: state => state.isConnected,
    isInitialized: state => state.isInitialized,
    usdtRate: state => {
      const d = state.coinData;
      if (d && d['usdt']) {
        if (d['usdt'].binance?.try?.price) return d['usdt'].binance.try.price;
        if (d['usdt'].paribu?.try?.price) return d['usdt'].paribu.try.price;
        if (d['usdt'].BTCTurk?.try?.price) return d['usdt'].BTCTurk.try.price;
      }
      return 36.5;
    }
  }
});
