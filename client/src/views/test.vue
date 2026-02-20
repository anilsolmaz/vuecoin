  <template>
    <div class="container-fluid flex m-10" style="padding: 0 50px" :style="elapsedTime>60000 ? 'filter: blur(3px);transform: scale(0.8);':''">

      <div class="row mt-2 mb-3 theme-text">
        <topcoin
            v-for="name in topCoins"
            v-bind:coinName="name"
            v-bind:coinData="coinData[name]"
            v-bind:usdtRate="calculatedUsdtRate"
        ></topcoin>
        <topcoin
            v-bind:coinName="'pda'"
            v-bind:coinData="coinData['pda']"
            v-bind:coinSource="'paribu'"
            v-bind:usdtRate="calculatedUsdtRate"
        ></topcoin>
      </div>
      <div class="row" v-if="Object.keys(coinData).length ==0" style="margin-top: 100px">
        <h1>Richmeme is loading</h1>
      </div>
      <div class="row mt-0" v-if="Object.keys(coinData).length>0">
        <div class="col-11">
          <div class="row">
            <coinbox
                class="coinbox col-12"
                v-for="(coin, name, index) in coinData"
                v-bind:coinName="name"
                v-bind:coinData="coin"
                v-bind:USDTMode="USDTMode"
            />
          </div>
        </div>
        <div class="col-1 theme-text-secondary">
          <div class="settings-action-card mb-3 shadow-sm">
            <router-link to="/configs" class="settings-link-wrapper justify-content-center">
              <i class="bi bi-gear-fill fs-5"></i>
              <span class="action-title fs-6">SETTINGS</span>
            </router-link>
          </div>
          
          <div class="currency-toggle-container mb-3 shadow-sm">
            <div class="currency-pills">
              <button 
                class="pill-btn" 
                :class="{ active: !USDTMode }" 
                @click="USDTMode = false"
              >
                <span class="pill-label">TRY</span>
                <span class="pill-symbol">₺</span>
              </button>
              <button 
                class="pill-btn" 
                :class="{ active: USDTMode }" 
                @click="USDTMode = true"
              >
                <span class="pill-label">USD</span>
                <span class="pill-symbol">$</span>
              </button>
              <div class="pill-slider" :class="{ 'slide-right': USDTMode }"></div>
            </div>
          </div>
          <div class="mt-3 p-3 border rounded-3 bg-light-soft theme-input-minimal shadow-sm">
            <label class="form-label small fw-bold mb-2">PROFIT CALCULATOR</label>
            <div class="theme-text-secondary">
              <div class="mb-2 p-2 rounded bg-dark-soft text-center fw-bold text-success border border-success-subtle">
                {{typeof coinData !== "undefined" ? formatNumber((coinData[selectedCoin].binance.usdt.price-buyPrice)*buyAmount,2) : '0.00'}}$
              </div>
              <Select2 v-model="selectedCoin" :options="coinList" :settings="{ placeholder: selectedCoin }" @change="myChangeEvent($event)" @select="mySelectEvent($event)" />
              <div class="mt-2 text-start">
                <input type="number" class="form-control form-control-sm theme-input-minimal" v-model="buyPrice" placeholder="Buy Price">
              </div>
              <input type="number" class="form-control form-control-sm theme-input-minimal mt-1" v-model="buyAmount" placeholder="Amount">
            </div>
          </div>

          <!--
          <hr>
          <div class="row" style="color: white">
            <label for="filterWord" class="col-sm-8 col-form-label">Filter by Name : </label>
            <div class="col-sm-4" style="border: white">
              <input type="text" class="form-control" id="filterWord" v-model="filterWord" STYLE="color: white" placeholder="coin name">
            </div>
          </div>
          -->
          <hr>
          <h6>Top
          <button @click="decreaseTopCoin"> - </button> {{ topCoinAmount }} <button @click="increaseTopCoin"> + </button>
          Deals</h6>
          <div class="row" v-for="i in parseFloat(topCoinAmount)">
            <div class="col-6" style="text-align: left;white-space: nowrap;text-size-adjust: 80%;">
              <img class="topDealsImage" :src="require(`@/assets/coins/${Object.keys(topDeals)[i-1]}.png`)" @error="require(`@/assets/coins/noimage.png`)">&nbsp;{{Object.keys(topDeals)[i-1] ? Object.keys(topDeals)[i-1].toUpperCase(): 'noData' }}
            </div>
            <div class="col-6" :class="cellClass(topDeals[Object.keys(topDeals)[i-1]])">{{ formatNumber(topDeals[Object.keys(topDeals)[i-1]],2) + '%'}}</div>
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
        filterWord: '',
        PDAPrice: null,
        coinData: [],
        coinData2: [],
        topDeals: [],
        topCoins: ['btc','bnb','ftt','usdt','jup','sevilla','eth','shib'],
        arbROIList : ['avax','eth','btc','xrp','ada','waves','mkr','link','xlm'],
        coinList : [2,3,4],
        topCoinAmount: 10,
        enabled: true,
        selectedCoin: 'btc',
        buyPrice: null,
        buyAmount: null,
        USDTMode: false,
        list: [
          { name: 'John', id: 1 },
          { name: 'Joao', id: 2 },
          { name: 'Jean', id: 3 },
          { name: 'Gerard', id: 4 },
        ],
        dragging: false,
        elapsedTime: 0,
        timer: undefined,
        socket: null
      }
    },
    filters: {
      lira (value) {
        return `$${value.toLocaleString()}`
      },
      ROI (value) {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4 })}`
      }
    },
    methods: {
      log(event) {
        console.log(event)
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
      },
      async updateData() {
        try {
            const response = await axios.get('/api/allParibuData');
            this.processData(response.data);
        } catch (error) {
            console.log(error);
        }
      },
      formatNumber (value,fraction) {
        let answer = Number(value).toFixed(fraction)
        return answer
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
      }
    },
    created() {
      this.start();
      
      // Initial Fetch Removed - Data comes via WebSocket on connect

      // WebSocket Connection
      this.socket = io();
      
      this.socket.on('connect', () => {
          console.log('Connected to WebSocket server');
      });

      this.socket.on('data_update', (data) => {
          // console.log('Data update received', data);
          if (data && data.btc) {
              this.processData(data);
          } else {
             // Fallback if data format is unexpected (e.g. initial message)
             this.updateData();
          }
      });

      this.socket.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
      });
    },
    watch: {
      selectedCoin(newVal) {
        if (this.coinData[newVal] && this.coinData[newVal].binance?.usdt?.price) {
          this.buyPrice = this.coinData[newVal].binance.usdt.price;
        }
      }
    },
    beforeUnmount() {
      this.stop();
      if (this.socket) {
          this.socket.disconnect();
      }
    },
    computed: {
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
    padding: 12px;
    text-decoration: none;
    color: white !important;
    gap: 8px;
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
