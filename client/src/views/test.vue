  <template>
    <div class="container-fluid flex mt-2" style="padding: 0 10px" :style="elapsedTime>60000 ? 'filter: blur(3px);transform: scale(0.8);':''">

      <!-- Demo Mode Banner -->
      <div v-if="isDemoMode" class="alert alert-warning text-center py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-4 mx-2 mt-2" style="font-size: 0.85rem; border: 1px solid #ffc107; color: #856404; background-color: #fff3cd; margin-bottom: 5px;">
          <i class="bi bi-info-circle-fill"></i>
          <strong>Demo Mode:</strong> Mock data recorded on {{ demoRecordedAt }}. Simulating live refreshes...
      </div>

      <!-- Top Navigation Action Bar -->
      <div class="row mt-1 mb-2 align-items-center justify-content-between">
         <div class="col-auto">
            <h4 class="mb-0 fw-bold theme-text" style="letter-spacing: 1px">Richmeme Scanner</h4>
         </div>
         
         <!-- Desktop Navigation Actions -->
         <div class="col-auto d-none d-md-flex gap-3 align-items-center">
            
            <!-- Top Deals Limit Stepper -->
            <div class="d-flex align-items-center shadow-sm rounded-pill px-2 py-1 top-bar-pill border">
               <span class="small fw-bold section-label me-2 border-end pe-2">Top Deals</span>
               <button type="button" class="btn btn-sm border-0 p-0 px-1 fw-bold top-bar-btn" @click="decrementTopDeals" :disabled="saving || topDealsCount <= 1">−</button>
               <span class="fw-bold mx-2" style="min-width: 20px; text-align: center">{{ topDealsCount }}</span>
               <button type="button" class="btn btn-sm border-0 p-0 px-1 fw-bold top-bar-btn" @click="incrementTopDeals" :disabled="saving || topDealsCount >= 50">+</button>
            </div>

            <!-- Currency Toggle -->
            <div class="currency-toggle-container shadow-sm" style="width: 140px; margin-bottom: 0;">
              <div class="currency-pills">
                <button class="pill-btn" :class="{ active: !USDTMode }" @click="USDTMode = false">
                  <span class="pill-label">TRY</span><span class="pill-symbol">₺</span>
                </button>
                <button class="pill-btn" :class="{ active: USDTMode }" @click="USDTMode = true">
                  <span class="pill-label">USD</span><span class="pill-symbol">$</span>
                </button>
                <div class="pill-slider" :class="{ 'slide-right': USDTMode }"></div>
              </div>
            </div>
            
            <!-- Profile Badge & Balance (if data exists) -->
            <div v-if="portfolio.length > 0" class="d-flex align-items-center gap-2">
               <!-- Active Profile Badge -->
               <div v-if="currentProfile" class="d-flex align-items-center profile-badge rounded-pill px-3 shadow-sm" title="Active Profile">
                  <div class="rounded-circle bg-success d-flex align-items-center justify-content-center me-2" style="width: 18px; height: 18px;">
                     <i class="bi bi-person-fill text-white" style="font-size: 0.75rem;"></i>
                  </div>
                  <span class="fw-bold small text-truncate" style="max-width: 90px;">{{ currentProfile }}</span>
                  <button @click="exitProfile" class="btn btn-sm p-0 d-flex align-items-center justify-content-center border-0 opacity-50 hover-opacity-100 ms-2" style="color: inherit; background: none;" title="Exit profile">
                     <i class="bi bi-x-circle-fill"></i>
                  </button>
               </div>

               <!-- Balance Card -->
               <div class="d-flex align-items-center gap-2 portfolio-balance-card rounded-pill px-3 shadow-sm balance-header">
                  <div class="d-flex align-items-center gap-2 text-decoration-none" style="cursor: pointer;" @click="$router.push('/portfolio')" title="View Portfolio">
                     <i class="bi bi-wallet2" :class="USDTMode ? 'text-primary' : 'text-success'"></i>
                     <span class="fw-bold small theme-text mb-0">
                        {{ showBalance ? (USDTMode ? formatNumber(totalBalanceUsdt, 2) + '$' : formatNumber(totalBalanceTry, 2) + '₺') : (USDTMode ? '***,***.**$' : '***,***.**₺') }}
                     </span>
                  </div>
                  <div class="ms-1">
                     <button @click.stop="showBalance = !showBalance" class="btn btn-sm p-0 border-0 theme-text-secondary opacity-50 hover-opacity-100">
                        <i :class="showBalance ? 'bi bi-eye' : 'bi bi-eye-slash'" style="font-size: 0.9rem;"></i>
                     </button>
                  </div>
               </div>
            </div>

            <!-- My Portfolio Link -->
            <router-link to="/portfolio" class="btn btn-portfolio d-flex align-items-center gap-2 shadow-sm rounded-pill px-3">
              <i class="bi bi-wallet2 text-white"></i><span class="fw-bold small text-white">My Portfolio</span>
            </router-link>
            
            <!-- Calculator Toggle Button -->
            <button @click="showCalculatorModal = true" class="btn btn-dark d-flex align-items-center gap-2 shadow-sm rounded-pill px-3">
              <i class="bi bi-calculator"></i><span class="fw-bold small">Calculator</span>
            </button>
            
            <!-- Settings Link -->
            <router-link to="/configs" class="btn btn-outline-danger d-flex align-items-center gap-2 shadow-sm rounded-pill px-3">
              <i class="bi bi-gear-fill"></i><span class="fw-bold small">Settings</span>
            </router-link>
         </div>
         
         <!-- Mobile Hamburger Menu Button -->
         <div class="col-auto d-md-none position-relative">
            <button class="btn btn-outline-secondary border-0 hamburger-btn" @click="mobileMenuOpen = !mobileMenuOpen">
               <i class="bi bi-list fs-2"></i>
            </button>
            <!-- Mobile Menu Dropdown -->
            <div v-if="mobileMenuOpen" class="position-absolute end-0 mt-2 p-3 shadow-lg rounded-4 border z-3 mobile-dropdown" style="width: 260px; z-index: 1000 !important">
               
               <div class="mb-3 d-flex align-items-center justify-content-between">
               <span class="small fw-bold section-label">Top Deals</span>
               <div class="d-flex align-items-center gap-2 ms-2">
                 <button type="button" class="btn btn-sm btn-outline-secondary border-0 py-0 px-2" @click="decrementTopDeals">−</button>
                 <span class="fw-bold">{{ topDealsCount }}</span>
                 <button type="button" class="btn btn-sm btn-outline-secondary border-0 py-0 px-2" @click="incrementTopDeals">+</button>
               </div>
               </div>
               
               <hr class="my-2">
               
               <div class="mb-3 mt-3 d-flex justify-content-center">
                 <div class="currency-toggle-container w-100 m-0">
                    <div class="currency-pills">
                      <button class="pill-btn w-50" :class="{ active: !USDTMode }" @click="USDTMode = false">
                        <span class="pill-label">TRY</span><span class="pill-symbol">₺</span>
                      </button>
                      <button class="pill-btn w-50" :class="{ active: USDTMode }" @click="USDTMode = true">
                        <span class="pill-label">USD</span><span class="pill-symbol">$</span>
                      </button>
                      <div class="pill-slider" :class="{ 'slide-right': USDTMode }"></div>
                    </div>
                  </div>
               </div>
               
               <!-- Profile Badge & Balance (if data exists) -->
               <div v-if="portfolio.length > 0" class="mb-3">
                  <!-- Active Profile Badge -->
                  <div v-if="currentProfile" class="d-flex align-items-center justify-content-between profile-badge rounded-4 p-3 border shadow-sm mb-2">
                     <div class="d-flex align-items-center gap-2">
                        <div class="rounded-circle bg-success d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;">
                           <i class="bi bi-cloud-check-fill text-white small"></i>
                        </div>
                        <span class="fw-bold small">{{ currentProfile }}</span>
                     </div>
                     <button @click="exitProfile" class="btn btn-sm p-0 border-0 theme-text-secondary opacity-75" title="Exit profile">
                        <i class="bi bi-x-circle-fill fs-5"></i>
                     </button>
                  </div>

                  <!-- Balance Card -->
                  <div class="d-flex align-items-center justify-content-between gap-2 bg-dark-soft rounded-4 p-3 border shadow-sm">
                     <div class="d-flex align-items-center gap-2 text-decoration-none" style="cursor: pointer;" @click="$router.push('/portfolio')" title="View Portfolio">
                        <i class="bi bi-wallet2" :class="USDTMode ? 'text-primary' : 'text-success'"></i>
                        <span class="fw-bold small theme-text">
                           {{ showBalance ? (USDTMode ? formatNumber(totalBalanceUsdt, 2) + '$' : formatNumber(totalBalanceTry, 2) + '₺') : (USDTMode ? '***,***.**$' : '***,***.**₺') }}
                        </span>
                     </div>
                     <button @click.stop="showBalance = !showBalance" class="btn btn-sm p-0 border-0 theme-text-secondary opacity-75">
                        <i :class="showBalance ? 'bi bi-eye' : 'bi bi-eye-slash'" style="font-size: 1.1rem;"></i>
                     </button>
                  </div>
               </div>

               <router-link to="/portfolio" class="btn btn-portfolio text-white w-100 mb-2 d-flex justify-content-center align-items-center gap-2">
                 <i class="bi bi-wallet2 text-white"></i><span class="fw-bold small text-white">My Portfolio</span>
               </router-link>
               
               <button @click="showCalculatorModal = true; mobileMenuOpen = false" class="btn btn-dark w-100 mb-2 d-flex justify-content-center align-items-center gap-2">
                 <i class="bi bi-calculator"></i><span class="fw-bold small">Calculator</span>
               </button>
               
               <router-link to="/configs" class="btn btn-outline-danger w-100 d-flex justify-content-center align-items-center gap-2">
                 <i class="bi bi-gear-fill"></i><span class="fw-bold small">Settings</span>
               </router-link>
            </div>
         </div>
      </div>

      <!-- Top Coins Row -->
      <div class="row mt-1 mb-0 theme-text pb-0">
        <topcoin
            v-for="name in topCoins"
            v-bind:coinName="name"
            v-bind:coinData="coinData[name]"
        ></topcoin>
      </div>
      <div class="row" v-if="Object.keys(coinData).length ==0" style="margin-top: 100px">
        <h1>Richmeme is loading</h1>
      </div>
      <div class="row mt-0" v-if="Object.keys(coinData).length>0">
         
         <!-- Display Top Deals Based on API settings Limit -->
         <div class="d-flex align-items-center mb-1 mt-0">
            <i class="bi bi-fire text-danger me-2"></i>
            <span class="small fw-bold section-label text-uppercase" style="letter-spacing:1px; font-size: 0.75rem;">Top Deals</span>
            <hr class="flex-grow-1 ms-2 my-0 section-hr">
            <div class="d-flex align-items-center ms-2 gap-1 theme-text" style="font-size: 0.75rem;">
               <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none theme-text fw-bold" @click="changeFontSize('topDeals', -1)"><i class="bi bi-dash fs-5"></i></button>
               <span class="mx-1"><i class="bi bi-fonts fs-6"></i></span>
               <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none theme-text fw-bold" @click="changeFontSize('topDeals', 1)"><i class="bi bi-plus fs-5"></i></button>
            </div>
         </div>
         <div class="row mb-1">
            <coinbox
                class="coinbox"
                v-for="coinName in Object.keys(topDeals).slice(0, topDealsCount)"
                :key="'top_'+coinName"
                :coinName="coinName"
                :coinData="coinData[coinName]"
                :USDTMode="USDTMode"
                :forceShowROI="true"
                :isTopDeal="true"
                :dealDuration="topDealTimers[coinName] || 0"
                :customFontSize="topDealsFontSize"
            />
         </div>
         
         <!-- Display Remaining Coins Alphabetically -->
         <div class="d-flex align-items-center mb-1 mt-1">
            <i class="bi bi-coin text-warning me-2"></i>
            <span class="small fw-bold section-label text-uppercase" style="letter-spacing:1px; font-size: 0.75rem;">All Markets</span>
            <hr class="flex-grow-1 ms-2 my-0 section-hr">
            <div class="d-flex align-items-center ms-2 gap-1 theme-text" style="font-size: 0.75rem;">
               <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none theme-text fw-bold" @click="changeFontSize('allMarkets', -1)"><i class="bi bi-dash fs-5"></i></button>
               <span class="mx-1"><i class="bi bi-fonts fs-6"></i></span>
               <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none theme-text fw-bold" @click="changeFontSize('allMarkets', 1)"><i class="bi bi-plus fs-5"></i></button>
            </div>
         </div>
         <div class="row pb-3">
            <coinbox
                class="coinbox"
                v-for="coinName in sortedRemainingCoins"
                :key="'list_'+coinName"
                :coinName="coinName"
                :coinData="coinData[coinName]"
                :USDTMode="USDTMode"
                :minROI="settings.crossMinROI"
                :isTopDeal="false"
                :dealDuration="0"
                :customFontSize="allMarketsFontSize"
            />
         </div>
         
      </div>
    </div>

    <!-- Profit Calculator Modal Backdrop Overlay -->
    <div v-if="showCalculatorModal" class="modal-backdrop-custom d-flex justify-content-center align-items-center" @click.self="showCalculatorModal = false">
      <div class="modal-wrapper p-4 rounded-4 shadow-lg border" style="width: 380px; max-width: 90vw; position: relative; background-color: var(--current-card-bg, #ffffff); opacity: 1;">
        <button class="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-3 border-0 rounded-circle" @click="showCalculatorModal = false">
          <i class="bi bi-x-lg"></i>
        </button>
        
        <div class="text-center mb-4">
           <i class="bi bi-calculator-fill fs-2 text-primary mb-2"></i>
           <h5 class="fw-bold theme-text mb-0">Profit Calculator</h5>
           <p class="small text-muted mb-0">Live estimation tool</p>
        </div>
        
        <div class="p-3 border rounded-3 bg-light-soft theme-input-minimal shadow-sm">
          <div class="theme-text-secondary">
            <div class="mb-3 p-3 rounded bg-dark-soft text-center fw-bold text-success border border-success-subtle fs-4 bg-opacity-25 shadow-inner">
              {{typeof coinData !== "undefined" ? formatNumber((coinData[selectedCoin]?.binance?.usdt?.price-buyPrice)*buyAmount,2) : '0.00'}}$
            </div>
            
            <label class="form-label small fw-bold mb-1 mt-2 text-uppercase text-muted">Select Asset</label>
            <Select2 v-model="selectedCoin" :options="coinList" :settings="{ placeholder: selectedCoin }" @change="myChangeEvent($event)" @select="mySelectEvent($event)" />
            
            <div class="mt-3 text-start">
              <label class="form-label small fw-bold mb-1 text-uppercase text-muted">Buy Order Target (Price)</label>
              <input type="number" class="form-control form-control-lg theme-input-minimal font-monospace" v-model="buyPrice" placeholder="0.0000">
            </div>
            
            <div class="mt-3 text-start">
              <label class="form-label small fw-bold mb-1 text-uppercase text-muted">Position Size (Amount)</label>
              <input type="number" class="form-control form-control-lg theme-input-minimal font-monospace" v-model="buyAmount" placeholder="100.0">
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  <script>
  import { defineComponent } from 'vue';
  import coinBox from '../components/coinBox';
  import topCoin from '../components/topCoin';
  import axios from 'axios';
  import { io } from "socket.io-client";
  export default defineComponent({
    components: {
      coinbox: coinBox,
      topcoin: topCoin,
    },
    data() {
      return {
        isDemoMode: true,
        demoRecordedAt: '',
        demoFrames: [],
        currentFrameIndex: 0,
        demoInterval: null,
        filterWord: '',
        coinData: [],
        coinData2: [],
        topDeals: [],
        topCoins: ['btc','bnb','ftt','usdt','jup','sevilla','eth','shib'],
        topDealsCount: 10,
        topDealTimers: {},
        topDealEntryTimes: JSON.parse(localStorage.getItem('vuecoin_topDealEntryTimes')) || {},
        crossMinROI: 0.5,
        coinList : [],
        enabled: true,
        selectedCoin: 'btc',
        buyPrice: null,
        buyAmount: null,
        showCalculatorModal: false,
        USDTMode: false,
        dragging: false,
        elapsedTime: 0,
        timer: undefined,
        socket: null,
        mobileMenuOpen: false,
        saving: false,
        topDealsFontSize: parseFloat(localStorage.getItem('vuecoin_topDealsFontSize')) || 0.72,
        allMarketsFontSize: parseFloat(localStorage.getItem('vuecoin_allMarketsFontSize')) || 0.75,
        settings: {
           topDealsCount: 10,
           crossMinROI: 0.5
        },
        portfolio: [],
        showBalance: localStorage.getItem('vuecoin_showBalance') !== 'false',
        currentProfile: null,
     }
    },
    filters: {
      lira (value) {
        return `$${Number(value).toLocaleString('en-US')}`
      },
      ROI (value) {
        return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 4 })}`
      }
    },
    methods: {
      async fetchSettings() {
        try {
          const response = await axios.get('/api/settings');
          if (response.data) {
            this.settings = response.data;
            if (response.data.topCoins) this.topCoins = response.data.topCoins;
            if (response.data.topDealsCount !== undefined) this.topDealsCount = response.data.topDealsCount;
            if (response.data.crossMinROI !== undefined) this.crossMinROI = response.data.crossMinROI;
          }
        } catch (error) {
          console.error("Failed to fetch settings:", error);
        }
      },
      async saveSettings() {
        this.saving = true;
        try {
          await axios.post('/api/settings', this.settings);
          this.topDealsCount = parseInt(this.settings.topDealsCount);
        } catch (error) {
           console.error('Failed to save settings:', error);
        } finally {
           this.saving = false;
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
        
        if (this.portfolio.length === 0 && this.isDemoMode) {
            this.portfolio = [
               { coin: 'btc', amount: 0.15, avgPrice: 62000 },
               { coin: 'eth', amount: 2.5, avgPrice: 3200 },
               { coin: 'doge', amount: 15000, avgPrice: 0.11 }
            ];
            localStorage.setItem('vuecoin_portfolio', JSON.stringify(this.portfolio));
        }

        this.currentProfile = localStorage.getItem('vuecoin_current_profile') || null;
      },
      exitProfile() {
        this.currentProfile = null;
        localStorage.setItem('vuecoin_current_profile', '');
        this.loadPortfolio();
      },
      getCurrentPrice(coin) {
         if (!coin) return 0;
         if (coin === 'usdt') return 1;
         if (this.coinData[coin]) {
           if (this.coinData[coin].binance?.usdt?.price) return this.coinData[coin].binance.usdt.price;
           if (this.coinData[coin].paribu?.usdt?.price) return this.coinData[coin].paribu.usdt.price;
           if (this.coinData[coin].paribu?.try?.price && this.USDTMode) {
              const rate = this.coinData['usdt']?.paribu?.try?.price || 35;
              return this.coinData[coin].paribu.try.price / rate;
           }
         }
         return 0;
      },
      formatNumber(value, forceFraction = null) {
        const val = parseFloat(value);
        if (isNaN(val)) return "0";
        
        if (forceFraction !== null && !isNaN(parseInt(forceFraction))) {
            const f = parseInt(forceFraction);
            return val.toLocaleString('en-US', { 
              minimumFractionDigits: f, 
              maximumFractionDigits: f 
            });
        }

        let maxF = 4;
        const absVal = Math.abs(val);

        if (absVal >= 1000) maxF = 0; // e.g. 1450
        else if (absVal >= 100) maxF = 1; // e.g. 123.4
        else if (absVal >= 10) maxF = 2; // e.g. 12.34
        else if (absVal >= 1) maxF = 3;  // e.g. 1.234
        else if (absVal >= 0.1) maxF = 4; // e.g. 0.1234
        else if (absVal >= 0.01) maxF = 5; // e.g. 0.01234
        else if (absVal >= 0.001) maxF = 6;
        else if (absVal >= 0.0001) maxF = 7;
        else maxF = 8;

        return val.toLocaleString('en-US', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: maxF
        });
      },
      log(event) {
        console.log(event)
      },
      getIcon(coinName) {
        if (!coinName) return require(`@/assets/coins/noimage.png`);
        try {
          return require(`@/assets/coins/${coinName.toLowerCase()}.png`);
        } catch (e) {
          return require(`@/assets/coins/noimage.png`);
        }
      },
      increaseTopCoin (){
        this.topCoinAmount++
      },
      decreaseTopCoin (){
        this.topCoinAmount--
      },
      myChangeEvent(val){
        console.log(val);
      },
      mySelectEvent({id}){
        console.log('Selected:', id);
        if (this.coinData[id] && this.coinData[id].binance?.usdt?.price) {
          this.buyPrice = this.coinData[id].binance.usdt.price;
        }
      },
      processData(data) {
          this.coinData = data;
          this.reset();
          const topData = {};
          let coinList = [];
          Object.keys(this.coinData).forEach(function(coinName) {
              topData[coinName] = data[coinName].ROI;
              coinList.push(coinName);
          });
          this.coinList = coinList;
          let x = Object.entries(topData)
              .sort(([,a],[,b]) => a-b)
              .reverse()
              .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
          this.topDeals = x;

          // Track how long each coin has been in Top Deals
          const now = Date.now();
          const activeTopDealKeys = Object.keys(x).slice(0, this.topDealsCount);
          // Add entry time for new coins
          activeTopDealKeys.forEach(coin => {
            if (!this.topDealEntryTimes[coin]) {
              this.topDealEntryTimes[coin] = now;
            }
          });
          // Remove entry times for coins no longer in top deals
          Object.keys(this.topDealEntryTimes).forEach(coin => {
            if (!activeTopDealKeys.includes(coin)) {
              delete this.topDealEntryTimes[coin];
            }
          });
          
          // Save to localStorage so timers persist across reloads
          localStorage.setItem('vuecoin_topDealEntryTimes', JSON.stringify(this.topDealEntryTimes));
          
          // Compute elapsed seconds
          const timers = {};
          activeTopDealKeys.forEach(coin => {
            timers[coin] = Math.round((now - this.topDealEntryTimes[coin]) / 1000);
          });
          this.topDealTimers = timers;
      },
      async updateData() {
        try {
            const response = await axios.get('/api/allParibuData');
            this.processData(response.data);
        } catch (error) {
            console.log(error);
        }
      },

      incrementTopDeals() {
        if (this.topDealsCount < 50) {
          this.topDealsCount++;
          this.settings.topDealsCount = this.topDealsCount;
          this.saveSettings();
        }
      },
      decrementTopDeals() {
        if (this.topDealsCount > 1) {
          this.topDealsCount--;
          this.settings.topDealsCount = this.topDealsCount;
          this.saveSettings();
        }
      },
      changeFontSize(type, step) {
        if (type === 'topDeals') {
          this.topDealsFontSize = Math.max(0.4, Math.min(1.5, this.topDealsFontSize + (step * 0.05)));
          localStorage.setItem('vuecoin_topDealsFontSize', this.topDealsFontSize);
        } else if (type === 'allMarkets') {
          this.allMarketsFontSize = Math.max(0.4, Math.min(1.5, this.allMarketsFontSize + (step * 0.05)));
          localStorage.setItem('vuecoin_allMarketsFontSize', this.allMarketsFontSize);
        }
      },
      cellClass(coinROI) {
        if (!coinROI || coinROI < 0.2) return 'theme-text-secondary';
        if (coinROI < 1.0) return 'text-success fw-bold';
        if (coinROI < 3.0) return 'text-warning fw-bold';
        return 'text-danger fw-bold';
      },
      start() {
        this.timer = setInterval(() => {
          this.elapsedTime += 1000;
        }, 1000);
      },
      stop() {
        clearInterval(this.timer);
      },
      reset() {
        this.elapsedTime = 0;
      },
      filteredBySearch(arr, filterWord) {
        return Object.keys(arr).filter(coin => coin.includes(filterWord.toLowerCase()))
      },
      async fetchMockData() {
          try {
              // Ensure we load from the base path properly
              const response = await axios.get('./mockData.json');
              if (response.data && response.data.frames) {
                  this.demoRecordedAt = response.data.recordedAt || 'Unknown Date';
                  this.demoFrames = response.data.frames;
                  this.currentFrameIndex = 0;
                  
                  // Initial frame
                  this.processData(this.demoFrames[this.currentFrameIndex]);
                  
                  // Cycle frames every 2.5 seconds
                  this.demoInterval = setInterval(() => {
                      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.demoFrames.length;
                      this.processData(this.demoFrames[this.currentFrameIndex]);
                  }, 2500);
              }
          } catch (error) {
              console.error("Failed to load mock data:", error);
          }
      }
    },
    created() {
      this.start();
      
      if (this.isDemoMode) {
          this.fetchMockData();
      } else {
          // Initial Fetch Removed - Data comes via WebSocket on connect

          // WebSocket Connection
          this.socket = io();
          
          this.socket.on('connect', () => {
              console.log('Connected to WebSocket server');
          });

          this.socket.on('data_update', (data) => {
              if (data && data.btc) {
                  this.processData(data);
              } else {
                 this.updateData();
              }
          });

          this.socket.on('disconnect', () => {
              console.log('Disconnected from WebSocket server');
          });
      }
      
      // Fetch user settings
      this.fetchSettings();
      this.loadPortfolio();
    },
    watch: {
      selectedCoin(newVal) {
        if (this.coinData[newVal] && this.coinData[newVal].binance?.usdt?.price) {
          this.buyPrice = this.coinData[newVal].binance.usdt.price;
        }
      },
      showBalance(newVal) {
         localStorage.setItem('vuecoin_showBalance', newVal);
      }
    },
    beforeUnmount() {
      this.stop();
      if (this.socket) {
          this.socket.disconnect();
      }
      if (this.demoInterval) {
          clearInterval(this.demoInterval);
      }
    },
    computed: {
      totalBalanceUsdt() {
         return this.portfolio.reduce((sum, item) => {
            return sum + (item.amount * this.getCurrentPrice(item.coin));
         }, 0);
      },
      totalBalanceTry() {
         const rate = this.coinData['usdt']?.paribu?.try?.price || 35;
         return this.totalBalanceUsdt * rate;
      },
      formattedElapsedTime() {
        const date = new Date(null);
        date.setSeconds(this.elapsedTime / 1000);
        const utc = date.toUTCString();
        return utc.substr(utc.indexOf(":") - 2, 8);
      },
      calculatedUsdtRate() {
         // Priority: Binance TRY -> Paribu TRY -> Default 36.5
         if (this.coinData && this.coinData['usdt']) {
             if (this.coinData['usdt'].binance && this.coinData['usdt'].binance.try && this.coinData['usdt'].binance.try.price) {
                 return this.coinData['usdt'].binance.try.price;
             }
             if (this.coinData['usdt'].paribu && this.coinData['usdt'].paribu.try && this.coinData['usdt'].paribu.try.price) {
                 return this.coinData['usdt'].paribu.try.price;
             }
         }
         return 36.5; // Fallback
      },
      sortedRemainingCoins() {
         // Show ALL coins (including top deals) sorted alphabetically
         const remaining = Object.keys(this.coinData).filter(coin => {
            if (coin === 'usdt') return false;
            const d = this.coinData[coin];
            if (!d) return false;
            const hasActiveData = (d.paribu?.try?.price > 0) || (d.binance?.usdt?.price > 0) || (d.BTCTurk?.try?.price > 0);
            return hasActiveData;
         });
         return remaining.sort((a,b) => a.localeCompare(b));
      }
    }
  })
  </script>


  <style>
  div {
    transition: all 2s;
  }


  .white {
    color: inherit !important;
  }
  .green {
    color: #198754 !important; /* Bootstrap Success */
  }
  .yellow {
    color: #ffc107 !important; /* Bootstrap Warning */
  }
  .red {
    color: #dc3545 !important; /* Bootstrap Danger */
  }
  .itemhover:hover {
    background-color: var(--current-border);
    transition: all 0.2s;
  }

  .theme-input-minimal {
    background: var(--current-card-bg) !important;
    border: 1px solid var(--current-border) !important;
    color: inherit !important;
  }

  .bg-light-soft {
    background-color: rgba(128, 128, 128, 0.05);
  }

  .bg-dark-soft {
    background-color: rgba(0, 0, 0, 0.1);
  }

  body.dark-mode .bg-dark-soft {
    background-color: rgba(255, 255, 255, 0.05);
  }

  body.dark-mode .bg-light-soft {
    background-color: rgba(255, 255, 255, 0.05);
  }

  /* Section Labels - theme aware */
  .section-label {
    color: #64748b;
  }
  body.dark-mode .section-label {
    color: #94a3b8;
  }

  /* Section HR lines */
  .section-hr {
    opacity: 0.15;
    border-color: currentColor;
  }
  body.dark-mode .section-hr {
    opacity: 0.25;
    border-color: #475569;
  }

  /* Top Bar Pill - theme aware */
  .top-bar-pill, .profile-badge, .portfolio-balance-card {
    background-color: var(--current-card-bg, #fff);
    border: 1px solid var(--current-border, #dee2e6) !important;
    height: 38px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    color: inherit;
  }

  body.dark-mode .top-bar-pill, 
  body.dark-mode .profile-badge, 
  body.dark-mode .portfolio-balance-card {
    background: rgba(255,255,255,0.05);
  }

  .hover-opacity-100:hover { opacity: 1 !important; }

  .top-bar-btn {
    color: inherit;
    opacity: 0.6;
    font-size: 1.1em;
    line-height: 1;
  }
  .top-bar-btn:hover {
    opacity: 1;
    color: #dc3545 !important;
  }
  .top-bar-btn:disabled {
    opacity: 0.2;
  }

  /* Calculator button - dark mode */
  body.dark-mode .btn-dark {
    background-color: rgba(255,255,255,0.12) !important;
    border-color: rgba(255,255,255,0.2) !important;
    color: #e2e8f0 !important;
  }
  body.dark-mode .btn-dark:hover {
    background-color: rgba(255,255,255,0.22) !important;
    color: #fff !important;
  }

  /* Settings button - dark mode */
  body.dark-mode .btn-outline-danger {
    color: #ff6b7a !important;
    border-color: rgba(255, 107, 122, 0.5) !important;
  }
  body.dark-mode .btn-outline-danger:hover {
    background-color: rgba(220, 53, 69, 0.15) !important;
    color: #ff8a97 !important;
  }

  /* Secondary buttons in dark mode */
  body.dark-mode .btn-outline-secondary {
    color: rgba(255,255,255,0.7) !important;
    border-color: rgba(255,255,255,0.2) !important;
  }

  /* Hamburger menu button */
  .hamburger-btn {
    color: inherit !important;
  }

  /* Mobile dropdown */
  .mobile-dropdown {
    background-color: var(--current-card-bg, #fff);
    border-color: var(--current-border, #dee2e6) !important;
    color: inherit;
  }

  /* Global dark mode text fixes */
  body.dark-mode .text-dark {
    color: #e2e8f0 !important;
  }
  
  /* Portfolio custom button to match general design */
  .btn-portfolio {
    background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%);
    border: none;
    transition: transform 0.2s, box-shadow 0.2s;
    color: #fff !important;
  }
  .btn-portfolio:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
    color: #fff !important;
  }
  body.dark-mode .border-end {
    border-color: var(--current-border) !important;
  }
  body.dark-mode .border {
    border-color: var(--current-border) !important;
  }
  
  /* Select2 Theme Sync */
  .select2-container--default .select2-selection--single {
    background-color: var(--current-card-bg) !important;
    border-color: var(--current-border) !important;
    color: inherit !important;
  }
  
  .select2-container--default .select2-selection--single .select2-selection__rendered {
    color: inherit !important;
  }

  /* Premium Settings Action Card */
  .settings-action-card {
    background: linear-gradient(135deg, #e52d27 0%, #b31217 100%);
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .settings-action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(229, 45, 39, 0.4);
  }

  .settings-link-wrapper {
    display: flex;
    align-items: center;
    padding: 0px;
    text-decoration: none;
    color: white !important;
    gap: 8px;
  }
  .modal-backdrop-custom {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 1050;
    backdrop-filter: blur(4px);
  }
  .action-title {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  /* Segmented Toggle Styling (Previously added) */
  .currency-toggle-container {
    background: var(--current-card-bg);
    border: 1px solid var(--current-border);
    border-radius: 12px;
    padding: 4px;
    width: 100%;
  }

  .currency-pills {
    position: relative;
    display: flex;
    justify-content: space-between;
    height: 38px;
    isolation: isolate;
  }

  .pill-btn {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--current-text-muted);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    z-index: 2;
    transition: color 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.1;
  }

  .pill-btn.active {
    color: #ffffff;
  }

  body.light-mode .pill-btn.active {
    color: #ffffff;
  }

  .pill-symbol {
    font-size: 14px;
    opacity: 0.8;
  }

  .pill-slider {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background: linear-gradient(135deg, #ff416c, #ff4b2b);
    border-radius: 8px;
    z-index: 1;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(255, 65, 108, 0.3);
  }

  .pill-slider.slide-right {
    transform: translateX(100%);
  }

  .anasayfa {
    background: transparent; /* Background is now controlled by App.vue body */
  }

  .theme-text {
    color: inherit; /* Controlled by body */
  }

  .theme-text-secondary {
    color: var(--current-text-muted);
  }

  .theme-box-header {
    background-color: var(--current-card-bg);
    color: inherit;
    border: 1px solid var(--current-border);
    font-size: 0.8em;
    backdrop-filter: blur(5px);
  }

  .hucre {
    color: inherit;
    background: var(--current-card-bg);
    border: 1px solid var(--current-border);
    font-family: Cairo, monospace;
    font-size: 13px;
    border-radius: 4px;
  }

  .coinPair {
    font-weight: 900;
    font-size: 14px;
    font-family: Cairo, sans-serif;
  }

  .hucre-baslik {
    color: var(--current-text-muted);
    font-weight: 900;
    font-size: 18px;
  }

  .satir {
    color: inherit;
    font-weight: 900;
    background: var(--current-card-bg);
    border-bottom: 1px solid var(--current-border);
  }

  .topDealsImage{
    width: 20px;
    height: 20px;
    margin: 1px;
    border-radius: 3px;
  }

  </style>
