<template>
  <div class="col">
    <h4 :style="textColor">
      <a :href="binanceUrl" target="_blank">
        <img
            :src="coinImageUrl"
            style="height: 32px; width: 32px; border-radius: 50%; opacity: 0.9;"
            @error="noImage"
        >
      </a>
      &nbsp;{{ displayCoinName }}<br>
      {{ displayCoinPrice }}
    </h4>
  </div>
</template>


<script>
export default {
  name: "TopCoin",
  props: {
    coinName: {
      type: String,
      required: false,
      default: 'coinName',
    },
    coinData: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    coinSource: {
      type: String,
      required: false,
      default: 'binance',
    },
    imageURL: {
      type: String,
      required: false,
      default: 'noimage.png',
    }
  },
  computed: {
    boxStyle() {
      // User requested to remove color effects
      return { backgroundColor: 'rgba(255, 255, 255, 0)' };
    },
    displayCoinName() {
      return this.coinName ? this.coinName.toUpperCase() : '';
    },
    binanceUrl() {
      const pair = this.coinName.toUpperCase() === 'USDT' ? 'TRY' : 'USDT';
      return `https://www.binance.com/en/trade/${this.coinName.toUpperCase()}_${pair}?layout=pro&theme=dark&type=spot`;
    },
    coinImageUrl() {
      try {
        return require(`@/assets/coins/${this.coinName}.png`);
      } catch (e) {
        return require(`@/assets/coins/noimage.png`);
      }
    },
    displayCoinPrice() {
        if (!this.coinData) return '';
        
        // Priority: Binance USDT -> Paribu TRY -> Binance TRY
        let binanceUSDT = this.coinData.binance?.usdt?.price;
        let paribuTRY = this.coinData.paribu?.try?.price;
        
        if (this.coinName === 'usdt') return `${paribuTRY ?? ''} ₺`;
        
        if (binanceUSDT) {
            return `${this.formatNumber(binanceUSDT)} $`;
        }
        if (paribuTRY) {
             return `${this.formatNumber(paribuTRY)} ₺`;
        }
        return '';
    },

    textColor() {
       return ''; // Inherit monochrome colors from theme
    }
  },
  methods: {
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
    noImage(event) {
      event.target.src = require('../assets/coins/noimage.png');
    },
  },
};
</script>

<style scoped>
.coin-info {
  display: flex;
  align-items: center;
}
h4 {
  white-space: nowrap;
}
</style>
