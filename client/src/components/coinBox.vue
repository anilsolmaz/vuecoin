<template>
  <div class="coinbox" :style="cellClass(coinName, coinData.ROI)" @click="toggleExpand">
    <h6 class="header" style="margin-bottom:2px">
      <img class="coinBoxImage" :src="coinImageSource" @error="handleImageError">
      <b>{{ coinName.toUpperCase() }}</b>
      <span v-if="forceShowROI || coinData.ROI >= minROI" style="font-size:0.7em">{{ formatNumber(coinData.ROI, 2) > 0 ? formatNumber(coinData.ROI, 2) + '%' : '' }}</span>
      <span v-if="dealDuration > 0" class="deal-timer" :title="'In Top Deals for ' + formatDuration(dealDuration)">{{ formatDuration(dealDuration) }}</span>
    </h6>
    <div v-if="isExpanded">
      <template v-if="isTopDeal">
        <div class="d-flex w-100 mt-1" style="font-size: 0.72rem; line-height: 1.1;">
          <!-- Bid Column (You Sell) -->
          <div class="flex-grow-1 border-end border-secondary border-opacity-25 pe-1">
             <div class="opacity-75 fw-bold mb-1 border-bottom border-secondary border-opacity-25 pb-1 text-center" style="font-size:0.65rem; letter-spacing: 0.5px">BID</div>
             <div v-for="(row, idx) in arbitrageBidsAndAsks" :key="'bid_'+idx" class="d-flex align-items-center mb-1" style="height: 16px;">
               <template v-if="row.bid">
                 <a :href="getExchangeLink(row.bid.exchange, coinName, row.bid.symbol)" target="_blank" @click.stop class="d-flex align-items-center">
                   <img class="marketBoxImage" style="width: 14px; height: 14px; margin-right: 4px;" :src="require(`@/assets/markets/${row.bid.exchange}.png`)">
                 </a>
                 <span class="ms-auto fw-medium" style="font-family: monospace;">{{ formatNumber(row.bid.rawPrice, coinData.fraction || 5) }} {{ row.bid.symbol }}</span>
               </template>
             </div>
          </div>
          <!-- Ask Column (You Buy) -->
          <div class="flex-grow-1 ps-1">
             <div class="opacity-75 fw-bold mb-1 border-bottom border-secondary border-opacity-25 pb-1 text-center" style="font-size:0.65rem; letter-spacing: 0.5px">ASK</div>
             <div v-for="(row, idx) in arbitrageBidsAndAsks" :key="'ask_'+idx" class="d-flex align-items-center mb-1" style="height: 16px;">
               <template v-if="row.ask">
                 <a :href="getExchangeLink(row.ask.exchange, coinName, row.ask.symbol)" target="_blank" @click.stop class="d-flex align-items-center">
                   <img class="marketBoxImage" style="width: 14px; height: 14px; margin-right: 4px;" :src="require(`@/assets/markets/${row.ask.exchange}.png`)">
                 </a>
                 <span class="ms-auto fw-medium" style="font-family: monospace;">{{ formatNumber(row.ask.rawPrice, coinData.fraction || 5) }} {{ row.ask.symbol }}</span>
               </template>
             </div>
          </div>
        </div>
      </template>

      <template v-else>
         <div class="text-center" style="padding:2px 0; font-size:0.88em">
            <span class="fw-bold" style="color: var(--text-main)">
               {{ USDTMode ? formatNumber(singleDisplayPriceUSD, coinData.fraction || 5) : formatNumber(singleDisplayPriceTRY, coinData.fraction || 6) }}
               {{ USDTMode ? '$' : '₺' }}
            </span>
         </div>
      </template>
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
    },
    forceShowROI: {
      type: Boolean,
      required: false,
      default: false
    },
    minROI: {
      type: Number,
      required: false,
      default: -9999
    },
    isTopDeal: {
      type: Boolean,
      required: false,
      default: true
    },
    dealDuration: {
      type: Number,
      required: false,
      default: 0
    }
  },
  computed: {
    coinImageSource() {
      try {
        return require(`@/assets/coins/${this.coinName.toLowerCase()}.png`);
      } catch (e) {
        return require(`@/assets/coins/noimage.png`);
      }
    },
    singleDisplayPriceTRY() {
      let prices = [];
      if (this.coinData?.paribu?.try?.price > 0) prices.push(this.coinData.paribu.try.price);
      if (this.coinData?.binance?.usdt?.inTRY > 0) prices.push(this.coinData.binance.usdt.inTRY);
      if (this.coinData?.BTCTurk?.try?.price > 0) prices.push(this.coinData.BTCTurk.try.price);
      if (prices.length === 0) return 0;
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    },
    singleDisplayPriceUSD() {
      let prices = [];
      if (this.coinData?.paribu?.try?.inUSDT > 0) prices.push(this.coinData.paribu.try.inUSDT);
      if (this.coinData?.binance?.usdt?.price > 0) prices.push(this.coinData.binance.usdt.price);
      if (this.coinData?.BTCTurk?.try?.inUSDT > 0) prices.push(this.coinData.BTCTurk.try.inUSDT);
      if (prices.length === 0) return 0;
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    },
    arbitrageBidsAndAsks() {
      let bids = [];
      let asks = [];
      const item = this.coinData;
      if (!item) return [];

      const checkBuy = (priceTRY, exchange, rawPrice, symbol) => {
          if (priceTRY > 0) {
              asks.push({ priceTRY, rawPrice: rawPrice || priceTRY, exchange, symbol });
          }
      };

      const checkSell = (priceTRY, exchange, rawPrice, symbol) => {
          if (priceTRY > 0) {
              bids.push({ priceTRY, rawPrice: rawPrice || priceTRY, exchange, symbol });
          }
      };

      // Check Paribu
      if (item?.paribu?.try?.ask) checkBuy(item.paribu.try.ask, 'paribu', item.paribu.try.ask, '₺');
      if (item?.paribu?.try?.bid) checkSell(item.paribu.try.bid, 'paribu', item.paribu.try.bid, '₺');
      if (item?.paribu?.usdt?.askInTRY) checkBuy(item.paribu.usdt.askInTRY, 'paribu', item.paribu.usdt.ask, '$');
      if (item?.paribu?.usdt?.bidInTRY) checkSell(item.paribu.usdt.bidInTRY, 'paribu', item.paribu.usdt.bid, '$');

      // Check Binance
      if (item?.binance?.usdt?.askInTRY) checkBuy(item.binance.usdt.askInTRY, 'binance', item.binance.usdt.ask, '$');
      if (item?.binance?.usdt?.bidInTRY) checkSell(item.binance.usdt.bidInTRY, 'binance', item.binance.usdt.bid, '$');
      if (item?.binance?.try?.ask) checkBuy(item.binance.try.ask, 'binance', item.binance.try.ask, '₺');
      if (item?.binance?.try?.bid) checkSell(item.binance.try.bid, 'binance', item.binance.try.bid, '₺');

      // Check BTCTurk
      // Note: BTCTurk image is BTCTurk.png, so we use BTCTurk
      if (item?.BTCTurk?.try?.ask) checkBuy(item.BTCTurk.try.ask, 'BTCTurk', item.BTCTurk.try.ask, '₺');
      if (item?.BTCTurk?.try?.bid) checkSell(item.BTCTurk.try.bid, 'BTCTurk', item.BTCTurk.try.bid, '₺');
      if (item?.BTCTurk?.usdt?.askInTRY) checkBuy(item.BTCTurk.usdt.askInTRY, 'BTCTurk', item.BTCTurk.usdt.ask, '$');
      if (item?.BTCTurk?.usdt?.bidInTRY) checkSell(item.BTCTurk.usdt.bidInTRY, 'BTCTurk', item.BTCTurk.usdt.bid, '$');

      // Sort
      bids.sort((a, b) => b.priceTRY - a.priceTRY);
      asks.sort((a, b) => a.priceTRY - b.priceTRY);

      // Filter Arbitrage Range
      let bestBid = bids.length > 0 ? bids[0].priceTRY : 0;
      let bestAsk = asks.length > 0 ? asks[0].priceTRY : 0;
      
      let filteredAsks = asks;
      let filteredBids = bids;

      // Only filter if there is actual arbitrage, keeping only those inside the range.
      if (bestBid > 0 && bestAsk > 0 && bestBid >= bestAsk) {
         filteredAsks = asks.filter(a => a.priceTRY <= bestBid);
         filteredBids = bids.filter(b => b.priceTRY >= bestAsk);
      } else {
         // If no real arbitrage at the moment, just show top 1 of each to avoid empty box
         filteredAsks = asks.slice(0, 1);
         filteredBids = bids.slice(0, 1);
      }

      // Convert into rows
      let maxLen = Math.max(filteredAsks.length, filteredBids.length);
      let rows = [];
      for (let i = 0; i < maxLen; i++) {
        rows.push({
           bid: filteredBids[i] || null,
           ask: filteredAsks[i] || null
        });
      }
      return rows;
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
    formatDuration(seconds) {
      if (seconds < 60) return seconds + 's';
      let m = Math.floor(seconds / 60);
      let s = seconds % 60;
      if (m < 60) return m + ':' + String(s).padStart(2, '0');
      let h = Math.floor(m / 60);
      m = m % 60;
      return h + ':' + String(m).padStart(2, '0');
    },
    getExchangeLink(exchange, coinName, symbol) {
      if (!coinName) return '#';
      let pair = symbol === '₺' ? 'TRY' : 'USDT';
      
      if (exchange === 'paribu') {
        let paribuPair = symbol === '₺' ? 'tl' : 'usdt';
        return `https://www.paribu.com/markets/${coinName.toLowerCase()}_${paribuPair}`;
      } else if (exchange === 'binance') {
        return `https://www.binance.com/en/trade/${coinName.toUpperCase()}_${pair}?layout=pro&theme=dark&type=spot`;
      } else if (exchange === 'BTCTurk') {
        return `https://kripto.btcturk.com/pro/al-sat/${coinName.toUpperCase()}_${pair}`;
      }
      return '#';
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
  margin: 2px auto 2px 2px;
  padding: 2px 4px;
  border-radius: 6px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease;
  font-size: 0.75em;
  text-align: left;
  color: inherit;
  border: 1px solid var(--current-border);
  background-color: var(--current-card-bg);
}

.coinbox:hover {
  transition: all 0.2s !important;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 10;
}

.header {
  border-radius: 6px 6px 0px 0px;
  border-bottom: 1px solid var(--current-border);
  font-size: 1.25em;
  margin: 1px auto;
  padding: 1px;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.deal-timer {
  font-size: 0.5em;
  color: var(--text-muted, #999);
  opacity: 0.7;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.coinBoxImage {
  width: 18px;
  height: 18px;
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
  width: 14px;
  height: 14px;
  margin: 1px;
  border-radius: 3px;
}
</style>
