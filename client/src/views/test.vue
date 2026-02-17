  <template>
    <div class="container-fluid flex m-10" style="padding: 0 50px" :style="elapsedTime>60000 ? 'filter: blur(3px);transform: scale(0.8);':''">

      <div class="row m-4" style="color: white">
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
      <div class="row m-4" style="color: white">
      </div>
      <div class="row" v-if="Object.keys(coinData).length ==0" style="margin-top: 100px">
        <h1>Richmeme is loading</h1>
      </div>
      <div class="row" v-if="Object.keys(coinData).length>0">
        <div class="col-11">
          <div v-if="squareMode" class="row">
            <coinbox
                class="coinbox col-12"
                v-for="(coin, name, index) in coinData"
                v-bind:coinName="name"
                v-bind:coinData="coin"
                v-bind:USDTMode="USDTMode"
            />
          </div>
          <draggable class="row dragArea" :list="coinData2" @change="log" v-if="!squareMode">
            <div
                style="color: antiquewhite"
                class="col-xxl-3 col-xl-4 col-md-6 col-sm-12 hucre-baslik"
            >
              <div class="row" >
                <div class="col-2 p-0 hucre-baslik">Coin</div>
                <div class="col-3 p-0 hucre-baslik">Paribu</div>
                <div class="col-2 p-0 hucre-baslik">?</div>
                <div class="col-3 p-0 hucre-baslik">Binance</div>
                <div class="col-2 p-0 hucre-baslik" style="text-align: right">ROI</div>
              </div>
            </div>
            <div
                style="color: antiquewhite"
                class="col-xxl-3 col-xl-4 col-md-6 col-sm-12 d-none d-xxl-block hucre-baslik"
            >
              <div class="row" >
                <div class="col-2 p-0 hucre-baslik">Coin</div>
                <div class="col-3 p-0 hucre-baslik">Paribu</div>
                <div class="col-2 p-0 hucre-baslik">?</div>
                <div class="col-3 p-0 hucre-baslik">Binance</div>
                <div class="col-2 p-0 hucre-baslik" style="text-align: right">ROI</div>
              </div>
            </div>
            <div
                style="color: antiquewhite"
                class="col-xxl-3 col-xl-4 col-md-6 col-sm-12 d-none d-xl-block hucre-baslik"
            >
              <div class="row" >
                <div class="col-2 p-0 hucre-baslik">Coin</div>
                <div class="col-3 p-0 hucre-baslik">Paribu</div>
                <div class="col-2 p-0 hucre-baslik">?</div>
                <div class="col-3 p-0 hucre-baslik">Binance</div>
                <div class="col-2 p-0 hucre-baslik" style="text-align: right">ROI</div>
              </div>
            </div>
            <div
                style="color: antiquewhite"
                class="col-xxl-3 col-xl-4 col-md-6 col-sm-12 d-none d-md-block hucre-baslik"
            >
              <div class="row" >
                <div class="col-2 p-0 hucre-baslik">Coin</div>
                <div class="col-3 p-0 hucre-baslik">Paribu</div>
                <div class="col-2 p-0 hucre-baslik">?</div>
                <div class="col-3 p-0 hucre-baslik">Binance</div>
                <div class="col-2 p-0 hucre-baslik" style="text-align: right">ROI</div>
              </div>
            </div>
            <div
              style="
              background-color: rgba(0,0,0,0.5) ;
              color: antiquewhite;
              border: #444444 solid 1px;
              font-size: 0.8em"
              class="col-xxl-3 col-xl-4 col-md-6 col-sm-12 rounded itemhover"
              v-for="(coin, name, index) in filteredBySearch(coinData,filterWord)"
              :key="name"
          >
            <div class="row p-1 itemhover" >
              <div class="col-2 p-0" style="text-align: left"><b>{{ coin.toUpperCase() }}</b></div>
              <div class="col-3 p-0">{{ formatNumber(coinData[coin].paribu.try.price, coinData[coin].fraction ? coinData[coin].fraction: 3) }}₺ </div>
              <div class="col-2 p-0">{{ coinData[coin].paribu.try.price > coinData[coin].binance.usdt.inTRY ? '←' : '→' }}</div>
              <div class="col-3 p-0">{{ formatNumber(coinData[coin].binance.usdt.inTRY, coinData[coin].fraction ? coinData[coin].fraction: 3) }}₺ </div>
              <div class="col-2 p-0" style="text-align: right" :class="cellClass(coinData[coin].ROI)"><b>{{ formatNumber(coinData[coin].ROI,2) }}%</b></div>
            </div>
          </div>
          </draggable>
        </div>
        <div class="col-1" style="color: wheat">
          <div class="row" style="color: antiquewhite; text-align: left">
          sorry under maintenance
          </div>
          <hr>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" v-model="squareMode">
            <label class="form-check-label" for="flexSwitchCheckChecked">{{squareMode ? 'Square' : 'Line'}}</label>
          </div>
          <hr v-if="squareMode">
          <div class="form-check form-switch" v-if="squareMode" >
            <input class="form-check-input" type="checkbox" role="switch"  v-model="USDTMode">
            <label class="form-check-label" for="flexSwitchCheckChecked">{{USDTMode ? 'USD&nbsp($)' : 'TRY&nbsp(₺)'}}</label>
          </div>
          <hr>
          <div class="button">
              <router-link class="btn btn-danger" to="/configs">Go Configs</router-link>
          </div>
          <hr>
          <div style="left: auto">
            <label>Profit:{{typeof coinData !== "undefined" ? formatNumber((coinData[selectedCoin].binance.usdt.price-buyPrice)*buyAmount,0) : coinData}}$</label>
            <div>
              <Select2 :style="'background-color: darkblue'" v-model="selectedCoin" :options="coinList" :settings="{ placeholder: selectedCoin }" @change="myChangeEvent($event)" @select="mySelectEvent($event)" />
              <input type="number" class v-model="buyPrice" style="width: 80%" placeholder="buy price">&nbsp;<a @click="buyPrice = coinData[selectedCoin].binance.usdt.price ">+</a>
              <input type="number" v-model="buyAmount" style="width: 90%" placeholder="buy amount">
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
          <hr>

          <div class="row p-1" style="color: antiquewhite; text-align: left">
            <p> New stuff will be here </p>
          </div>
        </div>
      </div>
    </div>
  </template>
  <script>
  import { defineComponent } from 'vue';
  import draggable from 'vuedraggable';
  import coinBox from '../components/coinBox';
  import topCoin from '../components/topCoin';
  import axios from 'axios';
  import { io } from "socket.io-client";
  export default defineComponent({
    components: {
      draggable,
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
        squareMode: true,
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
      mySelectEvent({id, text}){
        console.log({id, text})
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
        if (coinROI < 0.5) {
          return 'white'
        } else if (coinROI < 2) {
          return 'green'
        } else if (coinROI < 4) {
          return 'yellow'
        } else {
          return  'red'
        }
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
      
      // Initial Fetch
      this.updateData();

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
    color:white !important;
  }
  .green {
    color: chartreuse !important;
  }
  .yellow {
    color:yellow !important;
  }
  .red {
    color:red !important;;
  }
  .itemhover:hover {
    background-color: brown;
    transition: all 0.25s;
  }

  .anasayfa {
    background: #161923;
  }
  .hucre {
    color: white;
    background: #303344;
    font-family: Cairo, monospace;
    font-size: 13px;
  }

  .coinPair {
    font-weight: 900;
    font-size: 14px;
    font-family: Cairo, sans-serif;
  }

  .hucre-baslik {
    color: white;
    font-weight: 900;
    font-size: 18px;
  }

  .satir {
    color: white;
    font-weight: 900;
    background: #212529;
  }

  .topDealsImage{
    width: 20px;
    height: 20px;
    margin: 1px;
    border-radius: 3px;
  }

  </style>
