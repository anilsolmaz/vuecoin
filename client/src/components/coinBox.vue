<template>
  <div class="coinbox" :style="cellClass(coinName, coinData.ROI)" @click="toggleExpand">
    <h6 class="header" style="margin-bottom:2px">
      <img class="coinBoxImage" :style="{ width: (customFontSize * 25) + 'px', height: (customFontSize * 25) + 'px' }" :src="coinImageSource" @error="handleImageError">
      <b>{{ coinName.toUpperCase() }}</b>
      <span v-if="forceShowROI || coinData.ROI >= minROI" class="roi-badge">{{ coinData.ROI > 0 ? formatNumber(coinData.ROI, 2) + '%' : '' }}</span>
      <span v-if="dealDuration > 0" class="deal-timer" :title="'In Top Deals for ' + formatDuration(dealDuration)">{{ formatDuration(dealDuration) }}</span>
    </h6>
    <div v-if="isExpanded">
      <template v-if="isTopDeal">
        <div class="d-flex flex-column w-100 mt-1" :style="{ fontSize: customFontSize + 'rem', lineHeight: '1.1' }">
          <!-- Header Row -->
          <div class="d-flex w-100 align-items-center mb-1 pb-1 border-bottom border-secondary border-opacity-25 position-relative">
             <div class="w-50 text-center opacity-75 fw-bold" style="font-size:0.65rem; letter-spacing: 0.5px;">ASK</div>
             <div class="position-absolute start-50 translate-middle-x fw-bolder" style="top: -2px; color: var(--text-muted, #777); font-size: 0.75rem; z-index:5;">&gt;</div>
             <div class="w-50 text-center opacity-75 fw-bold" style="font-size:0.65rem; letter-spacing: 0.5px;">BID</div>
          </div>
          
          <!-- Data Row -->
          <div class="d-flex w-100 h-100" style="min-height: 20px;">
             <!-- Ask Column (You Buy) -->
             <div class="w-50 pe-1 border-end border-secondary border-opacity-25">
                <div v-for="(row, idx) in arbitrageBidsAndAsks" :key="'ask_'+idx" class="d-flex align-items-center mb-1" style="height: 16px;">
                  <template v-if="row.ask">
                    <a :href="getExchangeLink(row.ask.exchange, coinName, row.ask.symbol)" target="_blank" @click.stop class="d-flex align-items-center">
                      <img class="marketBoxImage" :style="{ width: (customFontSize * 19.4) + 'px', height: (customFontSize * 19.4) + 'px', marginRight: '4px' }" :src="require(`@/assets/markets/${row.ask.exchange}.png`)">
                    </a>
                    <span class="fw-medium text-nowrap">{{ formatNumber(row.ask.rawPrice, coinData.fraction || 5) }} {{ row.ask.symbol }}</span>
                  </template>
                </div>
             </div>
             
             <!-- Bid Column (You Sell) -->
             <div class="w-50 ps-2">
                <div v-for="(row, idx) in arbitrageBidsAndAsks" :key="'bid_'+idx" class="d-flex align-items-center mb-1" style="height: 16px;">
                  <template v-if="row.bid">
                    <a :href="getExchangeLink(row.bid.exchange, coinName, row.bid.symbol)" target="_blank" @click.stop class="d-flex align-items-center">
                      <img class="marketBoxImage" :style="{ width: (customFontSize * 19.4) + 'px', height: (customFontSize * 19.4) + 'px', marginRight: '4px' }" :src="require(`@/assets/markets/${row.bid.exchange}.png`)">
                    </a>
                    <span class="fw-medium text-nowrap">{{ formatNumber(row.bid.rawPrice, coinData.fraction || 5) }} {{ row.bid.symbol }}</span>
                  </template>
                </div>
             </div>
          </div>
        </div>
      </template>

      <template v-else>
         <div class="text-start ps-3" :style="{ padding: '2px 0', fontSize: customFontSize + 'rem', letterSpacing: '0.5px' }">
            <span class="fw-bold">
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
    },
    customFontSize: {
      type: Number,
      required: false,
      default: 0.72
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

      // Check Paribu (Only TRY)
      if (item?.paribu?.try?.ask) checkBuy(item.paribu.try.ask, 'paribu', item.paribu.try.ask, '₺');
      if (item?.paribu?.try?.bid) checkSell(item.paribu.try.bid, 'paribu', item.paribu.try.bid, '₺');

      // Check Binance (Only USDT)
      if (item?.binance?.usdt?.askInTRY) checkBuy(item.binance.usdt.askInTRY, 'binance', item.binance.usdt.ask, '$');
      if (item?.binance?.usdt?.bidInTRY) checkSell(item.binance.usdt.bidInTRY, 'binance', item.binance.usdt.bid, '$');

      // Check BTCTurk (Only TRY)
      // Note: BTCTurk image is BTCTurk.png, so we use BTCTurk
      if (item?.BTCTurk?.try?.ask) checkBuy(item.BTCTurk.try.ask, 'BTCTurk', item.BTCTurk.try.ask, '₺');
      if (item?.BTCTurk?.try?.bid) checkSell(item.BTCTurk.try.bid, 'BTCTurk', item.BTCTurk.try.bid, '₺');

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
    formatNumber(value, fraction = null) {
      const val = parseFloat(value);
      if (isNaN(val)) return "0";
      
      let maxF = 4;
      const absVal = Math.abs(val);

      if (absVal >= 10000) {
         maxF = 0; // 5+ hane
      } else if (absVal >= 1000) {
         maxF = 0; // 4 hane
      } else if (absVal >= 100) {
         maxF = 1; // 3 hane + 1 ondalık = 4
      } else if (absVal >= 10) {
         maxF = 2; // 2 hane + 2 ondalık = 4
      } else if (absVal >= 1) {
         maxF = 3; // 1 hane + 3 ondalık = 4
      } else {
         // < 1 olan sayılar için (örn: 0.03453)
         maxF = (fraction !== null && !isNaN(parseInt(fraction))) ? parseInt(fraction) : 5;
      }

      return val.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: Math.max(0, Math.min(maxF, 20))
      });
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
  margin: 3px 6px 3px 0;
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
  font-size: 1.45em; /* Increased for better visibility */
  margin: 1px auto;
  padding: 1px;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.roi-badge {
  font-size: 0.95em; /* Increased for better visibility */
  font-weight: 700;
  opacity: 0.95;
}

.deal-timer {
  font-size: 0.75em; /* Increased for better visibility */
  color: var(--text-muted, #999);
  opacity: 0.7;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.coinBoxImage {
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
  margin: 1px;
  border-radius: 3px;
}
</style>
