<template>
  <div class="container-fluid flex mt-2 portfolio-page" style="padding: 0 10px; max-width: 1200px; margin: 0 auto;">
    
    <!-- Top Action Bar -->
    <div class="row mt-1 mb-4 align-items-center justify-content-between">
       <div class="col d-flex align-items-center gap-3">
          <router-link to="/" class="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
             <i class="bi bi-arrow-left fs-5"></i>
          </router-link>
          <div>
            <h4 class="mb-0 fw-bold theme-text" style="letter-spacing: 1px">My Portfolio</h4>
            <span class="small theme-text-secondary">Track your holdings in real-time</span>
          </div>
       </div>
       <div class="col-auto d-flex align-items-center gap-2">
          <template v-if="currentProfile">
             <span class="fw-bold small me-1"><i class="bi bi-cloud-check text-success me-1"></i>{{ currentProfile }}</span>
             <button @click="deleteProfile" class="btn btn-sm btn-outline-danger rounded-pill px-3 d-flex align-items-center gap-1">
                <i class="bi bi-trash"></i><span class="d-none d-sm-inline small">Delete</span>
             </button>
          </template>
          <template v-else>
             <button @click="showRetrieveModal = true" class="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-2">
                <i class="bi bi-cloud-download"></i><span class="d-none d-sm-inline fw-bold small">Retrieve</span>
             </button>
             <button @click="onSaveClick" class="btn btn-sm btn-portfolio rounded-pill px-3 d-flex align-items-center gap-2">
                <i class="bi bi-cloud-upload text-white"></i><span class="d-none d-sm-inline fw-bold small text-white">Save</span>
             </button>
          </template>
       </div>
    </div>

    <!-- Total Balance Card -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="balance-card position-relative overflow-hidden p-4 rounded-4 shadow-lg border">
          <div class="card-bg-gradient position-absolute top-0 start-0 w-100 h-100 z-0"></div>
          <div class="position-relative z-1 d-flex flex-column align-items-center text-center">
            <span class="fw-bold text-uppercase opacity-75 mb-2" style="font-size: 0.85rem; letter-spacing: 2px;">Total Portfolio Value</span>
            
            <h1 class="display-3 fw-bolder mb-0 text-white value-shadow">
              {{ formatNumber(totalBalanceUsdt, 2) }} <span class="fs-3 opacity-75 text-white">$</span>
            </h1>
            <h4 class="fw-bold opacity-75 mt-2 text-white">
              ≈ {{ formatNumber(totalBalanceTry, 2) }} ₺
            </h4>
            
            <div class="mt-4 d-flex gap-3">
              <div class="p-2 px-3 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-25 backdrop-blur">
                <span class="small fw-bold opacity-75 me-2 text-white">24H CHANGE:</span>
                <span class="fw-bold text-white">Live updating...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Asset & Assets List -->
    <div class="row">
      <!-- Add Asset Form -->
      <div class="col-12 col-lg-4 mb-4">
        <div class="card premium-card rounded-4 p-4 h-100 shadow-sm border-0">
          <h5 class="fw-bold theme-text mb-4 d-flex align-items-center gap-2">
            <i class="bi bi-plus-circle-fill" style="color: #6366f1"></i> Add Asset
          </h5>
          
          <div class="mb-3 position-relative">
             <label class="form-label small fw-bold text-uppercase text-muted">Select Coin</label>
             <div class="coin-picker" :class="{ 'picker-focused': coinPickerOpen }" @click="focusCoinSearch">
                <img v-if="newAsset.coin" :src="getIcon(newAsset.coin)" class="coin-picker-icon" />
                <input
                   ref="coinSearchInput"
                   v-model="coinSearch"
                   type="text"
                   class="coin-search-input"
                   placeholder="Search coin..."
                   @focus="onPickerFocus"
                   @blur="closeCoinPicker"
                   @keydown="onPickerKeydown"
                />
             </div>
             <div v-if="coinPickerOpen && filteredCoins.length > 0" class="coin-dropdown shadow-lg border" ref="coinDropdown">
                <div
                   v-for="(coin, idx) in filteredCoins"
                   :key="coin"
                   class="coin-dropdown-item"
                   :class="{ 'dropdown-highlighted': idx === highlightIndex }"
                   @mousedown.prevent="selectCoin(coin)"
                   @mouseenter="highlightIndex = idx"
                >
                   <img :src="getIcon(coin)" class="coin-dropdown-img" />
                   <span>{{ coin.toUpperCase() }}</span>
                </div>
             </div>
             <div v-if="newAsset.coin" class="mt-2 text-end">
                <span class="fw-bold text-success small">{{ fmtPrice(getCurrentPrice(newAsset.coin)) }} $</span>
             </div>
          </div>
          
          <div class="mb-3">
             <label class="form-label small fw-bold text-uppercase text-muted"><i class="bi bi-hash me-1"></i>Holdings Amount</label>
             <div class="input-group input-group-lg">
                <input type="number" step="0.00000001" class="form-control theme-input-minimal shadow-none font-monospace" v-model="newAsset.amount" placeholder="0.00">
             </div>
          </div>
          
          <div class="mb-4">
             <label class="form-label small fw-bold text-uppercase text-muted"><i class="bi bi-tag me-1"></i>Avg Buy Price <span class="fw-normal opacity-50">(Optional)</span></label>
             <div class="input-group input-group-lg">
                <input type="number" step="0.0001" class="form-control theme-input-minimal shadow-none font-monospace" v-model="newAsset.avgPrice" placeholder="0.00" @keydown.enter="addAsset">
                <span class="input-group-text theme-input-minimal border-start-0 fw-bold" style="font-size:0.9rem;">$</span>
             </div>
          </div>
          
          <button @click="addAsset" :disabled="!newAsset.coin || !newAsset.amount || newAsset.amount <= 0" class="btn btn-lg w-100 rounded-pill fw-bold shadow-sm mt-auto add-btn">
            <i class="bi bi-plus-lg me-2"></i>Add to Portfolio
          </button>
        </div>
      </div>

      <!-- Assets Table -->
      <div class="col-12 col-lg-8 mb-4">
         <div class="card premium-card rounded-4 p-4 h-100 shadow-sm overflow-hidden border-0">
            <h5 class="fw-bold theme-text mb-4 d-flex align-items-center gap-2">
              <i class="bi bi-pie-chart-fill text-warning"></i> Your Assets
            </h5>
            
            <div v-if="portfolio.length === 0" class="text-center py-5 opacity-50">
               <i class="bi bi-wallet2 display-1 mb-3"></i>
               <p class="fs-5 fw-bold">Your portfolio is empty.</p>
               <p>Add an asset from the form to start tracking.</p>
            </div>
            
            <div v-else class="table-responsive">
               <table class="table table-hover table-borderless align-middle mb-0 portfolio-table">
                  <thead>
                     <tr class="text-muted small text-uppercase" style="letter-spacing: 1px;">
                        <th class="ps-0 pb-3">Asset</th>
                        <th class="text-end pb-3">Cost</th>
                        <th class="text-end pb-3">Current Price</th>
                        <th class="text-end pb-3">Current Value</th>
                        <th class="text-end pb-3">PnL</th>
                        <th class="text-end pb-3" style="width: 50px;"></th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr v-for="(item, index) in portfolio" :key="index" class="asset-row border-top">
                        <td class="ps-0 py-3">
                           <div class="d-flex align-items-center gap-2">
                              <img :src="getIcon(item.coin)" class="shadow-sm bg-white rounded-circle p-1" style="width: 32px; height: 32px; object-fit: contain;">
                              <div>
                                 <div class="fw-bold fs-6">{{ item.coin.toUpperCase() }}</div>
                                 <div class="small text-muted font-monospace">{{ formatNumber(item.amount, 4) }}</div>
                              </div>
                           </div>
                        </td>
                        <td class="text-end py-3">
                           <div v-if="item.avgPrice">
                              <div class="fw-bold text-nowrap">{{ fmtPrice(item.avgPrice) }}<small class="ms-1 opacity-75">$</small></div>
                              <div class="small text-muted text-nowrap">~{{ formatNumber(item.avgPrice * calculatedUsdtRate, 2) }}<small class="ms-1">₺</small></div>
                           </div>
                           <div v-else class="text-muted opacity-50">—</div>
                        </td>
                        <td class="text-end py-3">
                           <div class="fw-bold text-nowrap">{{ fmtPrice(getCurrentPrice(item.coin)) }}<small class="ms-1 opacity-75">$</small></div>
                           <div class="small text-muted text-nowrap">~{{ formatNumber(getCurrentPrice(item.coin) * calculatedUsdtRate, 2) }}<small class="ms-1">₺</small></div>
                        </td>
                        <td class="text-end py-3">
                           <div class="fw-bold text-nowrap">{{ formatNumber(item.amount * getCurrentPrice(item.coin), 2) }}<small class="ms-1 opacity-75">$</small></div>
                           <div class="small text-muted text-nowrap">~{{ formatNumber(item.amount * getCurrentPrice(item.coin) * calculatedUsdtRate, 2) }}<small class="ms-1">₺</small></div>
                        </td>
                        <td class="text-end py-3">
                           <div v-if="item.avgPrice" :class="getPnLClass(item)">
                              <div class="fw-bold text-nowrap">{{ getPnLValue(item, true) }}<small class="ms-1 opacity-75">$</small></div>
                              <div class="small font-monospace">{{ getPnLPercentage(item) }}%</div>
                           </div>
                           <div v-else class="text-muted opacity-50">—</div>
                        </td>
                        <td class="text-end py-3">
                           <button @click="removeAsset(index)" class="btn btn-sm btn-outline-danger rounded-circle p-0 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;">
                              <i class="bi bi-trash" style="font-size:0.75rem"></i>
                           </button>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>

    <!-- Save Profile Modal -->
    <div v-if="showSaveModal" class="modal-backdrop-custom d-flex justify-content-center align-items-center" @click.self="showSaveModal = false">
      <div class="modal-card p-4 rounded-4 shadow-lg border" style="width: 380px; max-width: 90vw;">
        <h5 class="fw-bold mb-3"><i class="bi bi-cloud-upload me-2" style="color:#dc3545"></i>Save Portfolio</h5>
        <p class="small text-muted">Enter a name to save your portfolio to the cloud.</p>
        <input ref="saveInput" v-model="profileName" class="form-control form-control-lg theme-input-minimal mb-3" placeholder="my_portfolio" @keydown.enter="profileName && saveProfile()">
        <div class="d-flex gap-2">
           <button @click="showSaveModal = false" class="btn btn-outline-secondary flex-grow-1 rounded-pill">Cancel</button>
           <button @click="saveProfile" :disabled="!profileName" class="btn add-btn flex-grow-1 rounded-pill fw-bold">Save</button>
        </div>
        <div v-if="saveMsg" class="mt-3 alert alert-success small py-2 mb-0">{{ saveMsg }}</div>
      </div>
    </div>

    <!-- Retrieve Profile Modal -->
    <div v-if="showRetrieveModal" class="modal-backdrop-custom d-flex justify-content-center align-items-center" @click.self="showRetrieveModal = false">
      <div class="modal-card p-4 rounded-4 shadow-lg border" style="width: 380px; max-width: 90vw;">
        <h5 class="fw-bold mb-3"><i class="bi bi-cloud-download me-2" style="color:#dc3545"></i>Retrieve Portfolio</h5>
        <p class="small text-muted">Enter the name you used to save your portfolio.</p>
        <input ref="retrieveInput" v-model="retrieveName" class="form-control form-control-lg theme-input-minimal mb-3" placeholder="my_portfolio" @keydown.enter="retrieveName && retrieveProfile()">
        <div class="d-flex gap-2">
           <button @click="showRetrieveModal = false" class="btn btn-outline-secondary flex-grow-1 rounded-pill">Cancel</button>
           <button @click="retrieveProfile" :disabled="!retrieveName" class="btn add-btn flex-grow-1 rounded-pill fw-bold">Retrieve</button>
        </div>
        <div v-if="retrieveMsg" class="mt-3 alert small py-2 mb-0" :class="retrieveError ? 'alert-danger' : 'alert-success'">{{ retrieveMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import axios from 'axios';
import { io } from "socket.io-client";

export default defineComponent({
  name: 'Portfolio',
  data() {
    return {
      portfolio: [], // shape: { coin: 'btc', amount: 1.5, avgPrice: 60000 }
      newAsset: {
        coin: '',
        amount: null,
        avgPrice: null
      },
      coinData: {},
      socket: null,
      usdtTryRate: 0,
      coinListCache: [],
      showSaveModal: false,
      showRetrieveModal: false,
      profileName: '',
      retrieveName: '',
      saveMsg: '',
      retrieveMsg: '',
      retrieveError: false,
      coinSearch: '',
      coinPickerOpen: false,
      highlightIndex: 0,
      currentProfile: null, // NOT persisted — lost on refresh
    }
  },
  computed: {
    filteredCoins() {
      const list = this.coinListCache.length > 0 ? this.coinListCache : Object.keys(this.coinData).sort();
      if (!this.coinSearch) return list;
      const q = this.coinSearch.toLowerCase();
      return list.filter(c => c.toLowerCase().includes(q));
    },
    calculatedUsdtRate() {
      // Find USDT to TRY rate
      if (this.coinData['usdt'] && this.coinData['usdt'].paribu?.try?.price) {
        return this.coinData['usdt'].paribu.try.price;
      }
      return this.usdtTryRate || 35.0; // fallback
    },
    totalBalanceUsdt() {
      return this.portfolio.reduce((sum, item) => {
        return sum + (item.amount * this.getCurrentPrice(item.coin));
      }, 0);
    },
    totalBalanceTry() {
      return this.totalBalanceUsdt * this.calculatedUsdtRate;
    }
  },
  watch: {
    showSaveModal(val) {
      if (val) this.$nextTick(() => this.$refs.saveInput?.focus());
    },
    showRetrieveModal(val) {
      if (val) this.$nextTick(() => this.$refs.retrieveInput?.focus());
    }
  },
  mounted() {
    this.loadPortfolio();
    
    // Connect websocket
    this.socket = io();
    this.socket.on('connect', () => {
        console.log('Portfolio connected to WebSocket server');
    });

    this.socket.on('data_update', (data) => {
        if (data && data.btc) {
            this.coinData = data;
            this.updateCoinListCache();
        } else {
            this.fetchData();
        }
    });

    // Fallback fetch
    this.fetchData();
  },
  unmounted() {
     if (this.socket) {
        this.socket.disconnect();
     }
  },
  methods: {
    async fetchData() {
        try {
            const response = await axios.get('/api/allParibuData');
            this.coinData = response.data;
            this.updateCoinListCache();
        } catch (error) {
            console.error("Failed to fetch initial market data:", error);
        }
    },
    updateCoinListCache() {
      if (this.coinListCache.length === 0 && Object.keys(this.coinData).length > 0) {
        this.coinListCache = Object.keys(this.coinData).sort();
        // Auto-select first coin if nothing selected
        if (!this.newAsset.coin && this.coinListCache.length > 0) {
          this.newAsset.coin = this.coinListCache[0];
          this.coinSearch = this.coinListCache[0].toUpperCase();
        }
      }
    },
    loadPortfolio() {
      const stored = localStorage.getItem('vuecoin_portfolio');
      if (stored) {
         try {
           this.portfolio = JSON.parse(stored);
         } catch (e) {
           this.portfolio = [];
         }
      }
    },
    savePortfolio() {
      localStorage.setItem('vuecoin_portfolio', JSON.stringify(this.portfolio));
      // If a profile is active, auto-sync to Redis
      if (this.currentProfile) {
        axios.post('/api/portfolio', { name: this.currentProfile, data: this.portfolio }).catch(() => {});
      }
    },
    addAsset() {
      if (!this.newAsset.coin || !this.newAsset.amount || this.newAsset.amount <= 0) return;
      
      const asset = {
         coin: this.newAsset.coin,
         amount: parseFloat(this.newAsset.amount),
         avgPrice: this.newAsset.avgPrice ? parseFloat(this.newAsset.avgPrice) : null
      };
      this.portfolio.push(asset);
      this.savePortfolio();
      
      // Reset only amount and price, keep coin selected
      this.newAsset.amount = null;
      this.newAsset.avgPrice = null;
      this.coinSearch = this.newAsset.coin.toUpperCase();
      // Focus back to coin search
      this.$nextTick(() => { this.$refs.coinSearchInput?.focus(); });
    },
    removeAsset(index) {
       this.portfolio.splice(index, 1);
       this.savePortfolio();
    },
    getCurrentPrice(coin) {
       if (!coin) return 0;
       if (coin === 'usdt') return 1;
       if (this.coinData[coin]) {
         // try Binance USDT price first
         if (this.coinData[coin].binance?.usdt?.price) return this.coinData[coin].binance.usdt.price;
         // fallback to paribu usdt
         if (this.coinData[coin].paribu?.usdt?.price) return this.coinData[coin].paribu.usdt.price;
         // fallback to TRY converted to USDT
         if (this.coinData[coin].paribu?.try?.price && this.calculatedUsdtRate) return this.coinData[coin].paribu.try.price / this.calculatedUsdtRate;
       }
       return 0;
    },
    getPnLValue(item, format = false) {
       if (!item.avgPrice) return 0;
       const currentVal = item.amount * this.getCurrentPrice(item.coin);
       const initialVal = item.amount * item.avgPrice;
       const diff = currentVal - initialVal;
       return format ? (diff > 0 ? '+' : '') + this.formatNumber(diff, 2) : diff;
    },
    getPnLPercentage(item) {
       if (!item.avgPrice || item.avgPrice === 0) return '0.00';
       const currentP = this.getCurrentPrice(item.coin);
       const diff = ((currentP - item.avgPrice) / item.avgPrice) * 100;
       return (diff > 0 ? '+' : '') + this.formatNumber(diff, 2);
    },
    getPnLClass(item) {
       const pnl = this.getPnLValue(item, false);
       if (pnl > 0) return 'text-success';
       if (pnl < 0) return 'text-danger';
       return 'theme-text-secondary';
    },
    getIcon(coinName) {
      if (!coinName) return require(`@/assets/coins/noimage.png`);
      try {
        return require(`@/assets/coins/${coinName.toLowerCase()}.png`);
      } catch (e) {
        return require(`@/assets/coins/noimage.png`);
      }
    },
    formatNumber(value, fraction) {
      if (!value) return "0.00";
      return Number(value).toLocaleString(undefined, { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
    },
    selectCoin(coin) {
      this.newAsset.coin = coin;
      this.coinSearch = coin.toUpperCase();
      this.coinPickerOpen = false;
    },
    onPickerKeydown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.highlightMove(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.highlightMove(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmHighlighted();
      } else if (e.key === 'Tab') {
        this.confirmHighlighted();
      }
    },
    onPickerFocus() {
      this.coinPickerOpen = true;
      this.coinSearch = '';
      this.highlightIndex = 0;
    },
    focusCoinSearch() {
      this.$refs.coinSearchInput?.focus();
    },
    closeCoinPicker() {
      setTimeout(() => {
        this.coinPickerOpen = false;
        // Restore display text to current selection
        if (this.newAsset.coin) {
          this.coinSearch = this.newAsset.coin.toUpperCase();
        }
      }, 200);
    },
    highlightMove(dir) {
      const max = Math.min(this.filteredCoins.length, 200) - 1;
      this.highlightIndex = Math.max(0, Math.min(max, this.highlightIndex + dir));
      // Scroll into view
      this.$nextTick(() => {
        const dropdown = this.$refs.coinDropdown;
        if (dropdown) {
          const item = dropdown.children[this.highlightIndex];
          if (item) item.scrollIntoView({ block: 'nearest' });
        }
      });
    },
    confirmHighlighted() {
      const visible = this.filteredCoins;
      if (visible.length > 0 && this.highlightIndex < visible.length) {
        this.selectCoin(visible[this.highlightIndex]);
      }
    },
    fmtPrice(price) {
      if (!price) return '0.00';
      if (price >= 1000) return this.formatNumber(price, 2);
      if (price >= 1) return this.formatNumber(price, 4);
      return this.formatNumber(price, 6);
    },
    async onSaveClick() {
      if (this.currentProfile) {
        // Already have a profile — save silently, no popup
        axios.post('/api/portfolio', { name: this.currentProfile, data: this.portfolio }).catch(() => {});
      } else {
        // No active profile — ask for name
        this.profileName = '';
        this.saveMsg = '';
        this.showSaveModal = true;
      }
    },
    async saveProfile() {
      this.saveMsg = '';
      try {
        const resp = await axios.post('/api/portfolio', {
          name: this.profileName,
          data: this.portfolio
        });
        this.currentProfile = this.profileName;
        this.savePortfolio();
        this.showSaveModal = false;
      } catch (e) {
        this.saveMsg = 'Error saving: ' + (e.response?.data?.error || e.message);
      }
    },
    async retrieveProfile() {
      this.retrieveMsg = '';
      this.retrieveError = false;
      try {
        const resp = await axios.get(`/api/portfolio/${encodeURIComponent(this.retrieveName)}`);
        if (resp.data && Array.isArray(resp.data)) {
          this.portfolio = resp.data;
          this.currentProfile = this.retrieveName;
          this.savePortfolio();
          this.showRetrieveModal = false;
        } else {
          this.retrieveError = true;
          this.retrieveMsg = 'Invalid portfolio data format';
        }
      } catch (e) {
        this.retrieveError = true;
        this.retrieveMsg = e.response?.data?.error || 'Portfolio not found';
      }
    },
    async deleteProfile() {
      if (!this.currentProfile) return;
      if (!confirm(`Delete profile "${this.currentProfile}"? This will remove from cloud but keep local data.`)) return;
      try {
        await axios.delete(`/api/portfolio/${encodeURIComponent(this.currentProfile)}`);
        this.currentProfile = null;
      } catch (e) {
        alert('Error deleting: ' + (e.response?.data?.error || e.message));
      }
    }
  }
});
</script>

<style scoped>
.portfolio-page {
  animation: fadeIn 0.4s ease-out;
  color: var(--current-text, #333);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Base Themes */
body.dark-mode .portfolio-page {
  --bg-deep: #0f172a;
  --bg-card: #1e293b;
  --bg-input: #0f172a;
  --text-main: #f8fafc;
  --text-dim: #94a3b8;
  --accent: #6366f1;
  --border: rgba(255, 255, 255, 0.1);
}

/* Glassmorphism & Cards */
.balance-card {
  background: var(--current-card-bg, #fff);
  border: 1px solid var(--current-border, #eee);
  position: relative;
  z-index: 1;
}

.card-bg-gradient {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  opacity: 1;
}

body.dark-mode .card-bg-gradient {
  background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.premium-card {
  background: var(--current-card-bg, #fff);
  border: 1px solid var(--current-border, #eee);
  transition: all 0.3s ease;
}

body.dark-mode .premium-card {
  background: #1e293b;
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Typography */
.theme-text { color: var(--current-text, inherit); }
body.dark-mode .theme-text { color: var(--text-main); }
.theme-text-secondary { color: var(--current-text-muted, #666); }
body.dark-mode .theme-text-secondary { color: var(--text-dim); }

.value-shadow {
  text-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Form Elements */
.theme-input-minimal {
  background-color: var(--current-card-bg, #fff) !important;
  border: 1px solid var(--current-border, #eee) !important;
  color: inherit !important;
  border-radius: 12px;
  transition: all 0.2s ease;
}

body.dark-mode .theme-input-minimal {
  background-color: #0f172a !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
}

.theme-input-minimal:focus {
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important;
}

.add-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45);
}

/* Table Design */
.portfolio-table {
  color: inherit;
  min-width: 850px;
  border-collapse: separate;
  border-spacing: 0 8px;
}

.portfolio-table th {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 12px;
  border: none;
  background: transparent !important;
}

.portfolio-table thead, .portfolio-table tr {
  background: transparent !important;
}

body.dark-mode .portfolio-table th {
  color: #94a3b8;
}

.asset-row td {
  background: #fff;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 16px 12px;
}

body.dark-mode .asset-row td {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
}

.asset-row td:first-child { border-left: 1px solid #eee; border-radius: 12px 0 0 12px; }
.asset-row td:last-child { border-right: 1px solid #eee; border-radius: 0 12px 12px 0; }

body.dark-mode .asset-row td:first-child { border-left-color: rgba(255, 255, 255, 0.05); }
body.dark-mode .asset-row td:last-child { border-right-color: rgba(255, 255, 255, 0.05); }

.asset-row:hover td {
  background: rgba(99, 102, 241, 0.05);
}

/* Coin Picker Fixes */
.coin-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--current-border, #eee);
  border-radius: 12px;
  background-color: #fff;
  transition: all 0.2s ease;
  position: relative;
}

body.dark-mode .coin-picker {
  background-color: #0f172a;
  border-color: rgba(255, 255, 255, 0.1);
}

.coin-picker.picker-focused {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.coin-picker-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  background: white;
  padding: 2px;
}

.coin-search-input {
  border: none !important;
  outline: none !important;
  background: transparent !important;
  flex: 1;
  color: inherit !important;
  font-weight: 600;
  padding: 8px 0;
  box-shadow: none !important;
  min-width: 100px;
}

body.dark-mode .coin-search-input {
  color: #fff !important;
}

.coin-dropdown {
  position: absolute;
  top: 100%; left: 0; right: 0;
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

body.dark-mode .coin-dropdown {
  background-color: #1e293b;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.coin-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.coin-dropdown-item:hover, .coin-dropdown-item.dropdown-highlighted {
  background-color: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.coin-dropdown-img {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: white;
  padding: 2px;
}

/* Modals */
.modal-backdrop-custom {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
}

.modal-card {
  background-color: #fff;
  border-radius: 20px;
  border: none;
}

body.dark-mode .modal-card {
  background: #1e293b;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Utils */
.text-success { color: #10b981 !important; }
.text-danger { color: #ef4444 !important; }

.btn-portfolio {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff !important;
  border: none;
}

.table-responsive::-webkit-scrollbar { height: 6px; }
.table-responsive::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
body.dark-mode .table-responsive::-webkit-scrollbar-thumb {
  background: #334155;
}


</style>
