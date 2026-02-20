<template>
  <div class="coinbox" :style="cellClass(coinName, coinData.ROI)" @click="toggleExpand">
    <h6 class="header">
      <img class="coinBoxImage" :src="coinImageSource" @error="handleImageError">
      <b>{{ coinName.toUpperCase() }}</b>
      <span style="font-size:0.7em">{{ formatNumber(coinData.ROI, 2) > 0 ? formatNumber(coinData.ROI, 2) + '%' : '' }}</span>
    </h6>
    <div v-if="isExpanded">
      <div v-if="coinData.paribu?.try?.price > 0">
        <a :href="`https://www.paribu.com/markets/${coinName.toLowerCase()}_tl`" target="_blank" @click.stop>
          <img class="marketBoxImage" :src="require(`@/assets/markets/paribu.png`)">
        </a>
        {{ USDTMode ? formatNumber(coinData.paribu.try.inUSDT, coinData.fraction ? coinData.fraction : 5) : formatNumber(coinData.paribu.try.price, coinData.fraction ? coinData.fraction : 6) }}
        {{ USDTMode ? '$' : '₺' }}
      </div>
      <div v-if="coinData.binance?.usdt?.price > 0">
        <a :href="`https://www.binance.com/en/trade/${coinName.toUpperCase()}_USDT?layout=pro&theme=dark&type=spot`" target="_blank" @click.stop>
          <img class="marketBoxImage" :src="require(`@/assets/markets/binance.png`)">
        </a>
        {{ USDTMode ? formatNumber(coinData.binance.usdt.price, coinData.fraction ? coinData.fraction : 5) : formatNumber(coinData.binance.usdt.inTRY, coinData.fraction ? coinData.fraction : 6) }}
        {{ USDTMode ? '$' : '₺' }}
      </div>
      <div v-if="coinData.BTCTurk?.try?.price > 0">
        <a :href="`https://pro.btcturk.com/pro/al-sat/${coinName.toUpperCase()}_TRY`" target="_blank" @click.stop>
          <img class="marketBoxImage" :src="require(`@/assets/markets/BTCTurk.png`)">
        </a>
        {{ USDTMode ? formatNumber(coinData.BTCTurk.try.inUSDT, coinData.fraction ? coinData.fraction : 5) : formatNumber(coinData.BTCTurk.try.price, coinData.fraction ? coinData.fraction : 6) }}
        {{ USDTMode ? '$' : '₺' }}
      </div>
      <div v-if="coinData.chiliz?.chz?.inTRY > 0">
        <a :href="`https://www.chiliz.net/exchange/${coinName.toUpperCase()}/CHZ`" target="_blank" @click.stop>
          <img class="marketBoxImage" :src="require(`@/assets/markets/chiliz.png`)">
        </a>
        {{ USDTMode ? formatNumber(coinData.chiliz.chz.inTRY / (coinData.paribu?.try?.inUSDT ? coinData.paribu.try.price / coinData.paribu.try.inUSDT : 1), coinData.fraction ? coinData.fraction : 5) : formatNumber(coinData.chiliz.chz.inTRY, coinData.fraction ? coinData.fraction : 6) }}
        {{ USDTMode ? '$' : '₺' }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "coinBox",
  props: {
    coinName: {
      type: String,
      required: false,
      default: 'coinName'
    },
    coinData: {
      required: false,
      default: 'Data'
    },
    USDTMode: {
      required: false,
      default: true
    }
  },
  computed: {
    coinImageSource() {
      try {
        return require(`@/assets/coins/${this.coinName.toLowerCase()}.png`);
      } catch (e) {
        return require(`@/assets/coins/noimage.png`);
      }
    }
  }
  ,
  data() {
    return {
      isExpanded: true
    };
  },
  mounted() {
  },
  watch: {
  },
  methods: {
    toggleExpand() {
      // this.isExpanded = !this.isExpanded;
    },
    checkAutoExpand() {
      // if (this.coinData.ROI > 1) {
      //   this.isExpanded = true;
      // }
    },
    formatNumber(value, fraction) {
      let answer = Number(value).toFixed(fraction);
      return answer;
    },
    handleImageError(event) {
      event.target.src = require(`@/assets/coins/noimage.png`);
    },
    cellClass(coinName, coinROI) {
      let bg = 'var(--roi-neutral)';
      
      if (coinROI > 4) bg = 'var(--roi-danger)';
      else if (coinROI > 2) bg = 'var(--roi-warning)';
      else if (coinROI > 0.5) bg = 'var(--roi-success)';

      return {
        backgroundColor: bg,
        cursor: 'pointer'
      };
    }
  }
};
</script>

<style scoped>
.coinbox {
  width: auto !important;
  height: auto !important;
  margin: 4px auto 4px 4px;
  padding: 4px 4px;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease;
  font-size: 0.8em;
  text-align: left;
  color: inherit;
  border: 1px solid var(--current-border);
  background-color: var(--current-card-bg);
}

.coinbox:hover {
  transition: all 0.2s !important;
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  z-index: 10;
}

.header {
  border-radius: 8px 8px 0px 0px;
  border-bottom: 1px solid var(--current-border);
  font-size: 1.4em;
  margin: 2px auto;
  padding: 2px;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.coinBoxImage {
  width: 22px;
  height: 22px;
  margin: 1px;
  border-radius: 50%;
  background-color: #ffffff;
  padding: 1px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.light-mode .coinBoxImage {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

.marketBoxImage {
  width: 16px;
  height: 16px;
  margin: 1px;
  border-radius: 3px;
}
</style>
