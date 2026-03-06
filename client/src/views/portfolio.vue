<template>
  <div class="container-fluid flex mt-2 portfolio-page" style="padding: 0 10px; max-width: 1200px; margin: 0 auto;">
    
    <!-- Top Action Bar -->
    <div class="row mt-1 mb-4 align-items-center justify-content-between">
       <div class="d-flex align-items-center gap-3">
          <router-link to="/" class="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
             <i class="bi bi-arrow-left fs-5"></i>
          </router-link>
          <div>
            <h4 class="mb-0 fw-bold theme-text" style="letter-spacing: 1px">My Portfolio</h4>
            <span class="small text-muted">Track your holdings in real-time</span>
          </div>
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
        <div class="card bg-transparent border theme-box-header rounded-4 p-4 h-100 shadow-sm">
          <h5 class="fw-bold theme-text mb-4 d-flex align-items-center gap-2">
            <i class="bi bi-plus-circle-fill text-primary"></i> Add Asset
          </h5>
          
          <div class="mb-3">
             <label class="form-label small fw-bold text-uppercase text-muted">Select Coin</label>
             <Select2 class="w-100" v-model="newAsset.coin" :options="select2Options" :settings="select2Settings" />
             <div v-if="newAsset.coin" class="mt-2 text-end small">
                Current price: <span class="fw-bold text-success">{{ formatNumber(getCurrentPrice(newAsset.coin), getCurrentPrice(newAsset.coin) < 1 ? 6 : 2) }} $</span>
             </div>
          </div>
          
          <div class="mb-3">
             <label class="form-label small fw-bold text-uppercase text-muted">Holdings Amount</label>
             <input type="number" step="0.00000001" class="form-control form-control-lg theme-input-minimal shadow-none font-monospace" v-model="newAsset.amount" placeholder="0.00">
          </div>
          
          <div class="mb-4">
             <label class="form-label small fw-bold text-uppercase text-muted">Average Buy Price (USDT) <span class="fw-normal opacity-50">(Optional)</span></label>
             <input type="number" step="0.0001" class="form-control form-control-lg theme-input-minimal shadow-none font-monospace" v-model="newAsset.avgPrice" placeholder="0.00">
          </div>
          
          <button @click="addAsset" :disabled="!newAsset.coin || !newAsset.amount || newAsset.amount <= 0" class="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow-sm mt-auto add-btn">
            Add to Portfolio
          </button>
        </div>
      </div>

      <!-- Assets Table -->
      <div class="col-12 col-lg-8 mb-4">
         <div class="card bg-transparent border theme-box-header rounded-4 p-4 h-100 shadow-sm overflow-hidden">
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
                        <th class="ps-0 pb-3 font-monospace">Asset</th>
                        <th class="text-end pb-3 font-monospace">Price</th>
                        <th class="text-end pb-3 font-monospace">Holdings</th>
                        <th class="text-end pb-3 font-monospace">Avg Buy Cost</th>
                        <th class="text-end pb-3 font-monospace">PnL</th>
                        <th class="text-end pe-0 pb-3 font-monospace">Action</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr v-for="(item, index) in portfolio" :key="index" class="asset-row border-top">
                        <td class="ps-0 py-3">
                           <div class="d-flex align-items-center gap-3">
                              <img :src="getIcon(item.coin)" class="shadow-sm bg-white rounded-circle p-1" style="width: 36px; height: 36px; object-fit: contain;">
                              <div>
                                 <div class="fw-bold theme-text fs-6">{{ item.coin.toUpperCase() }}</div>
                                 <div class="small text-muted font-monospace">{{ formatNumber(item.amount, 6) }}</div>
                              </div>
                           </div>
                        </td>
                        <td class="text-end py-3">
                           <div class="fw-bold theme-text">{{ formatNumber(getCurrentPrice(item.coin), getCurrentPrice(item.coin) < 1 ? 6 : 2) }} $</div>
                           <div class="small text-muted opacity-75">~{{ formatNumber(getCurrentPrice(item.coin) * calculatedUsdtRate, 2) }} ₺</div>
                        </td>
                        <td class="text-end py-3">
                           <div class="fw-bold theme-text">{{ formatNumber(item.amount * getCurrentPrice(item.coin), 2) }} $</div>
                        </td>
                        <td class="text-end py-3">
                           <div v-if="item.avgPrice" class="fw-bold theme-text">{{ formatNumber(item.avgPrice, 4) }} $</div>
                           <div v-else class="text-muted opacity-50">-</div>
                        </td>
                        <td class="text-end py-3">
                           <div v-if="item.avgPrice" :class="getPnLClass(item)">
                              <div class="fw-bold">{{ getPnLValue(item, true) }} $</div>
                              <div class="small font-monospace">{{ getPnLPercentage(item) }}%</div>
                           </div>
                           <div v-else class="text-muted opacity-50">-</div>
                        </td>
                        <td class="text-end pe-0 py-3">
                           <button @click="removeAsset(index)" class="btn btn-sm btn-outline-danger rounded-circle p-0 d-inline-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                              <i class="bi bi-trash"></i>
                           </button>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import axios from 'axios';
import { io } from "socket.io-client";
import Select2 from 'vue3-select2-component';

export default defineComponent({
  name: 'Portfolio',
  components: {
    Select2
  },
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
    }
  },
  computed: {
    select2Options() {
       return Object.keys(this.coinData).sort().map(coin => ({
          id: coin,
          text: coin.toUpperCase(),
          img: this.getIcon(coin)
       }));
    },
    select2Settings() {
       return {
          width: '100%',
          placeholder: 'Type to search...',
          templateResult: this.formatSelect2Result,
          templateSelection: this.formatSelect2Result
       };
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
        } catch (error) {
            console.error("Failed to fetch initial market data:", error);
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
    },
    addAsset() {
      if (!this.newAsset.coin || !this.newAsset.amount) return;
      
      const asset = {
         coin: this.newAsset.coin,
         amount: parseFloat(this.newAsset.amount),
         avgPrice: this.newAsset.avgPrice ? parseFloat(this.newAsset.avgPrice) : null
      };

      // Check if already exists, maybe merge or just push
      this.portfolio.push(asset);
      this.savePortfolio();
      
      // Reset form
      this.newAsset = { coin: '', amount: null, avgPrice: null };
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
    formatSelect2Result(state) {
      if (!state.id) {
         return state.text;
      }
      var wrapper = document.createElement('span');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      var img = document.createElement('img');
      img.src = state.img || this.getIcon(state.id);
      img.style.cssText = 'width:20px;height:20px;border-radius:50%;object-fit:contain;background:white;';
      var label = document.createElement('span');
      label.textContent = state.text;
      wrapper.appendChild(img);
      wrapper.appendChild(label);
      return wrapper;
    }
  }
});
</script>

<style scoped>
.portfolio-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.balance-card {
  background-color: var(--current-card-bg, #ffffff);
  border-color: var(--current-border) !important;
}

.card-bg-gradient {
  background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%);
  opacity: 0.95;
}

body.dark-mode .card-bg-gradient {
  background: linear-gradient(135deg, #842029 0%, #5c161d 100%);
  opacity: 1;
}

body.dark-mode .balance-card {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

.value-shadow {
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.backdrop-blur {
  backdrop-filter: blur(8px);
}

.theme-box-header {
  background-color: var(--current-card-bg);
  border-color: var(--current-border) !important;
  color: inherit;
}

.theme-input-minimal {
  background-color: var(--current-card-bg) !important;
  border: 1px solid var(--current-border) !important;
  color: inherit !important;
  border-radius: 8px;
}

.theme-input-minimal:focus {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25) !important;
}

.add-btn {
  background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
  color: #fff !important;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(220, 53, 69, 0.4);
}

.portfolio-table {
  color: inherit;
}

.portfolio-table th {
  border-bottom: 2px solid var(--current-border);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.portfolio-table td {
  border-color: var(--current-border) !important;
  vertical-align: middle;
}

.asset-row {
  transition: background-color 0.2s;
  color: inherit;
}

.asset-row:hover {
  background-color: rgba(220, 53, 69, 0.05);
}

body.dark-mode .asset-row:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

/* Custom Scrollbar for table if active */
.table-responsive::-webkit-scrollbar {
  height: 6px;
}
.table-responsive::-webkit-scrollbar-track {
  background: transparent;
}
.table-responsive::-webkit-scrollbar-thumb {
  background: var(--current-border);
  border-radius: 10px;
}
</style>
