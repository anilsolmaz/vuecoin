<template>

  <div class="container anasayfa">
    <h4 style="color: white">Select Coin: </h4>
    <div>
      <Select2 v-model="coinRequest" :options="myOptions" multiple :settings="{ settingOption: value, settingOption: value, multiple:true }" @change="myChangeEvent($event)" @select="mySelectEvent($event)" />
    </div>
    <div class="d-md-none">
      <div class="row">
        <div class="col-3 hucre-baslik card-header"> Coin </div>
        <div class="col-3 hucre-baslik card-header"> Paribu </div>
        <div class="col-3 hucre-baslik card-header"> Binance </div>
        <div class="col-3 hucre-baslik card-header"> ROI </div>
      </div>
    </div>
    <div clasS="d-none d-md-block d-lg-none">
      <div class="row">
        <div class="col-6 row">
          <div class="col-3 hucre-baslik card-header"> Coin </div>
          <div class="col-3 hucre-baslik card-header"> Paribu </div>
          <div class="col-3 hucre-baslik card-header"> Binance </div>
          <div class="col-3 hucre-baslik card-header"> ROI </div>
        </div>
        <div class="col-6 row">
          <div class="col-3 hucre-baslik card-header"> Coin </div>
          <div class="col-3 hucre-baslik card-header"> Paribu </div>
          <div class="col-3 hucre-baslik card-header"> Binance </div>
          <div class="col-3 hucre-baslik card-header"> ROI </div>
        </div>
      </div>
    </div>
    <div class="d-none d-lg-block">
      <div class="row">
        <div class="col-1 hucre-baslik card-header"> Coin </div>
        <div class="col-1 hucre-baslik card-header"> Paribu </div>
        <div class="col-1 hucre-baslik card-header"> Binance </div>
        <div class="col-1 hucre-baslik card-header"> ROI </div>
        <div class="col-1 hucre-baslik card-header"> Coin </div>
        <div class="col-1 hucre-baslik card-header"> Paribu </div>
        <div class="col-1 hucre-baslik card-header"> Binance </div>
        <div class="col-1 hucre-baslik card-header"> ROI </div>
        <div class="col-1 hucre-baslik card-header"> Coin </div>
        <div class="col-1 hucre-baslik card-header"> Paribu </div>
        <div class="col-1 hucre-baslik card-header"> Binance </div>
        <div class="col-1 hucre-baslik card-header"> ROI </div>
      </div>
    </div>
      <div class="row satir">
        <div class="col-lg-4 col-md-6 col-sm-12" v-for="(coin, index, key) in coinData">
          <div class="row">
            <div class="col-3 coinPair"><b>{{ formatName(coin.coinPair) }}</b></div>
            <div class="col-3 hucre">{{ formatNumber(coin.average,3) }}</div>
            <div class="col-3 hucre">{{ formatNumber(coin.binanceAverage,3) }}</div>
            <div class="col-3 hucre" :class="cellClass(index)">{{ formatNumber(coin.ROI,2) }}</div>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'
import Select2 from 'vue3-select2-component';
import { io } from "socket.io-client";


export default {
  name: 'Coin Compare',
  components: {Select2},
  data()  {
    return {
      coinRequest : ['asr','acm','juv','atm','psg','bar'],
      coinData : [],
      coin : '',
      myValue: [],
      myOptions: [],
      value:'',
      socket: null

    }
  } ,
  methods: {
    processData(allData) {
        // Filter the global data for only the coins in coinRequest
        let filtered = {};
        this.coinRequest.forEach(coin => {
            if (allData[coin]) {
                filtered[coin] = allData[coin];
            }
        });
        this.coinData = filtered;
    },
    updateData() {
      axios
          .get('/api/allParibuData')
          .then(response => {
            this.processData(response.data);
          })
          .catch(error =>{
            console.log(error)
          })
    },

    myChangeEvent(val){
      console.log(val);
    },

    mySelectEvent({id, text}){
      console.log({id, text})
    },

    formatNumber (value,fraction) {
      let answer = Number(value).toFixed(fraction)
      return answer
    },
    formatName (name) {
      return name.toUpperCase().split('-')[0]
    },
    cellClass(coin) {
      let ROI = this.coinData[coin].ROI
      let className
      if (ROI < 0.5) {
        className = 'white'
      } else if (ROI < 2) {
        className = 'green'
      } else if (ROI < 4) {
        className = 'yellow'
      } else {
        className = 'red'
      }
      return className
    }
  },
  created() {
    this.updateData()

    axios.get('https://www.paribu.com/ticker')
        .then( (response) => {
          let responseData = response.data
          Object.entries(responseData).forEach((coin) => {
            if (coin[0].toLowerCase().split('_')[1] == 'tl')
            this.myOptions.push(coin[0].toLowerCase().split('_')[0])
          })
        })
        .catch( (error) => {
          console.log(error)
        })
    
    // WebSocket Connection
    this.socket = io();
    
    this.socket.on('data_update', (data) => {
        if (data && data.paribu) {
            this.processData(data);
        } else {
            this.updateData();
        }
    });
  },
  beforeUnmount() {
      if (this.socket) {
          this.socket.disconnect();
      }
  },
  computed: {

  }
}
</script>

<style>

.white {
  color:white !important;
}
.green {
  color:green !important;
}
.yellow {
  color:yellow !important;
}
.red {
  color:red !important;;
}

.anasayfa {
  background: #212529;
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
  font-size: 16px;
}

.satir {
  color: white;
  font-weight: 900;
  background: #212529;
}

</style>
