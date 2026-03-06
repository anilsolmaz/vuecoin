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
      <br v-if="isPDA">
      <span v-if="isPDA" style="font-size: 0.8em;">{{ percentageChange }}</span>
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
    // We might need global data to get USDT rate if not passed in coinData
    // But coinData is specific to THIS coin.
    // Wait, test.vue passes coinData[name].
    // We need USDT rate.
    // Let's assume we can't get USDT rate easily inside this component unless we look at 'usdt' coin data.
    // BUT, the USER said: "paribu'dan gelen veriyi kullanmak istiyorum ama paribuda da pdatry verisi geliyor".
    // We need to convert TRY to USD.
    // The component doesn't have access to OTHER coins (like USDT).
    // I should ask user or inject USDT rate?
    // Actually, `test.vue` has `coinData` (all coins). 
    // `topCoin` uses `coinData[name]`.
    // I should update `test.vue` to pass `usdtRate` prop OR pass the whole `coinData`?
    // Passing whole `coinData` is heavy.
    // Better: Helper function or prop.
    // BUT checking `coinData` prop in `topCoin.vue`: it is `coinData` (Object).
    // In `test.vue`: `v-bind:coinData="coinData[name]"`.
    // So `topCoin` gets ONLY that coin's data. It DOES NOT know USDT price.
    
    // Quick Fix: Hardcode for now? NO, User hates hardcode.
    // I will modify `test.vue` to pass `usdtPrice` as a prop.
    
    // Wait, let's look at `test.vue` again in next step.
    // For now, I will write the logic assuming `usdtPrice` is available or calculated differently.
    // Maybe `coinData` HAS `usdt` property? 
    // Backend `CoinDataService` structure: `binance: { usdt: { price: ... } }`.
    // So `coinData.binance.usdt.price` exists!
    // That is the price of THIS coin in USDT.
    // PDA doesn't have Binance USDT price (User said it's buggy).
    // So PDA has `paribu.try.price`.
    // We need USDT/TRY rate to convert.
    // That rate is `coinData['usdt'].paribu.try.price` (or binance).
    // `topCoin.vue` for 'pda' DOES NOT receive `coinData['usdt']`.
    
    // I MUST modify `test.vue` to pass USDT rate.
    
    imageURL: {
      type: String,
      required: false,
      default: 'noimage.png',
    },
    usdtRate: { // New Prop
      type: Number,
      required: false,
      default: 36.5 // Fallback if missing, but we'll pass it
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

        // User specifically said for PDA use Paribu BUT show in USD.
        if (this.isPDA && paribuTRY && this.usdtRate) {
             let priceUSD = paribuTRY / this.usdtRate;
             return `${this.formatNumber(priceUSD, 4)} $`;
        }
        
        if (binanceUSDT) {
            return `${this.formatNumber(binanceUSDT)} $`;
        }
        if (paribuTRY) {
             return `${this.formatNumber(paribuTRY)} ₺`;
        }
        return '';
    },
    isPDA() {
      return this.coinName.toLowerCase() === 'pda';
    },
    getROI() {
         if (this.isPDA) {
            // PDA Specific Calculation
            // Cost: 0.156 USD
            // Price: Paribu TRY
            // Formula: ( (ParibuTRY / USDT_TRY) - 0.156 ) / 0.156 * 100
            if (this.coinData?.paribu?.try?.price && this.usdtRate) {
                let priceUSD = this.coinData.paribu.try.price / this.usdtRate;
                return ( (priceUSD - 0.156) / 0.156 ) * 100;
            }
            return 0;
         } else {
             // General ROI from Backend (Arbitrage)
             return this.coinData.ROI ?? 0;
         }
    },
    percentageChange() {
      let roi = this.getROI;
      if (typeof roi === 'number') {
          return `(%${this.formatNumber(roi, 2)})`;
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
