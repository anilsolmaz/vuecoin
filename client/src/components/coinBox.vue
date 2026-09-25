<template>
  <div class="coinbox" :class="{ 'top-deal-box': isTopDeal, 'all-market-box': !isTopDeal }" :style="cellClass(coinName, coinData.ROI)" @click="toggleExpand">
    <h6 class="header" :style="{ fontSize: (customFontSize * 1.25) + 'rem' }">
      <img class="coinBoxImage" :style="{ width: (customFontSize * 1.7) + 'rem', height: (customFontSize * 1.7) + 'rem', minWidth: (customFontSize * 1.7) + 'rem' }" :src="coinImageSource" @error="handleImageError">
      <b>{{ coinName.toUpperCase() }}</b>
      <span v-if="forceShowROI || coinData.ROI >= minROI" class="roi-badge" :style="{ fontSize: (customFontSize * 0.95) + 'rem' }">{{ coinData.ROI > 0 ? formatNumber(coinData.ROI, 2) + '%' : '' }}</span>
      <span v-if="dealDuration > 0" class="deal-timer" :style="{ fontSize: (customFontSize * 0.8) + 'rem' }" :title="'In Top Deals for ' + formatDuration(dealDuration)">{{ formatDuration(dealDuration) }}</span>
    </h6>
    <div v-if="isExpanded" class="w-100 flex-grow-1 d-flex flex-column">
      <template v-if="(isTopDeal || isExpandedAllMarkets) && arbitrageBidsAndAsks.length > 0">
        <div class="d-flex flex-column w-100 mt-1 flex-grow-1" :style="{ fontSize: customFontSize + 'rem', lineHeight: '1.2' }">
          <!-- Header Row -->
          <div class="d-flex w-100 align-items-center mb-1 pb-1 border-bottom border-secondary border-opacity-25 position-relative">
             <div class="col-6 text-center opacity-75 fw-bold" :style="{ fontSize: (customFontSize * 0.85) + 'rem', letterSpacing: '0.5px' }">ASK</div>
             <div class="position-absolute start-50 translate-middle-x fw-bolder" style="top: 0px; color: var(--text-muted, #888); font-size: 0.7rem; z-index:5;"><i class="bi bi-arrow-right"></i></div>
             <div class="col-6 text-center opacity-75 fw-bold" :style="{ fontSize: (customFontSize * 0.85) + 'rem', letterSpacing: '0.5px' }">BID</div>
          </div>
          
          <!-- Data Row -->
          <div class="d-flex w-100 align-items-stretch flex-grow-1">
             <!-- Ask Column (You Buy) -->
             <div class="col-6 pe-2 border-end border-secondary border-opacity-25 d-flex flex-column justify-content-start">
                <div v-for="(row, idx) in arbitrageBidsAndAsks" :key="'ask_'+idx" class="d-flex align-items-center mb-1 text-nowrap gap-1" :style="{ minHeight: (customFontSize * 1.5) + 'rem' }">
                  <template v-if="row.ask">
                    <a :href="getExchangeLink(row.ask.exchange, coinName, row.ask.symbol)" target="_blank" @click.stop class="d-flex align-items-center flex-shrink-0">
                      <img class="marketBoxImage" :style="{ width: (customFontSize * 1.25) + 'rem', height: (customFontSize * 1.25) + 'rem', minWidth: (customFontSize * 1.25) + 'rem' }" :src="getMarketIcon(row.ask.exchange)">
                    </a>
                    <span class="fw-medium font-monospace">{{ row.ask.symbol }} {{ formatNumber(row.ask.rawPrice, getExchangeFraction(row.ask.exchange, row.ask.symbol)) }}</span>
                  </template>
                </div>
             </div>
             
             <!-- Bid Column (You Sell) -->
             <div class="col-6 ps-2 d-flex flex-column justify-content-start">
                <div v-for="(row, idx) in arbitrageBidsAndAsks" :key="'bid_'+idx" class="d-flex align-items-center mb-1 text-nowrap gap-1" :style="{ minHeight: (customFontSize * 1.5) + 'rem' }">
                  <template v-if="row.bid">
                    <a :href="getExchangeLink(row.bid.exchange, coinName, row.bid.symbol)" target="_blank" @click.stop class="d-flex align-items-center flex-shrink-0">
                      <img class="marketBoxImage" :style="{ width: (customFontSize * 1.25) + 'rem', height: (customFontSize * 1.25) + 'rem', minWidth: (customFontSize * 1.25) + 'rem' }" :src="getMarketIcon(row.bid.exchange)">
                    </a>
                    <span class="fw-medium font-monospace">{{ row.bid.symbol }} {{ formatNumber(row.bid.rawPrice, getExchangeFraction(row.bid.exchange, row.bid.symbol)) }}</span>
                  </template>
                </div>
             </div>
          </div>

          <!-- Potential Gain Row -->
          <div v-if="isTopDeal && potentialGain > 0" class="potential-gain-row mt-1 pt-1 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between" :style="{ fontSize: (customFontSize * 0.85) + 'rem' }" :title="'Potential Gain: ' + (USDTMode ? '$ ' : '₺ ') + formatProfit(potentialGain)">
             <span class="gain-label d-flex align-items-center gap-1">
               <i class="bi bi-cash-stack text-success"></i>
               <span>Gain:</span>
             </span>
             <span class="gain-value font-monospace">
               +{{ USDTMode ? '$ ' : '₺ ' }}{{ formatProfit(potentialGain) }}
             </span>
          </div>
        </div>
      </template>

      <template v-else>
         <div class="text-center flex-grow-1 d-flex align-items-center justify-content-center price-display" :style="{ padding: '0px', fontSize: customFontSize + 'rem', letterSpacing: '0.3px', lineHeight: '1.1' }">
            <span class="fw-bold font-monospace">
               {{ USDTMode ? '$ ' : '₺ ' }}{{ formatNumber(USDTMode ? singleDisplayPriceUSD : singleDisplayPriceTRY, USDTMode ? getExchangeFraction('binance', '$') : getExchangeFraction('paribu', '₺')) }}
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
      if (!this.coinName) return require('@/assets/coins/noimage.png');
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
    cleanExchangeName(name) {
      if (!name) return '';
      const lower = String(name).toLowerCase();
      if (lower.includes('paribu')) return 'paribu';
      if (lower.includes('binance')) return 'binance';
      if (lower.includes('btcturk')) return 'BTCTurk';
      if (lower.includes('coinbase')) return 'coinbase';
      if (lower.includes('okx')) return 'okx';
      if (lower.includes('kucoin')) return 'kucoin';
      if (lower.includes('gateio') || lower.includes('gate.io')) return 'gateio';
      if (lower.includes('mexc')) return 'mexc';
      if (lower.includes('upbit')) return 'upbit';
      return name.replace(/\(.*?\)/g, '').trim();
    },
    arbitrageBidsAndAsks() {
      const item = this.coinData;
      if (!item || typeof item !== 'object') return [];

      // 1. If backend provided official arbitrageDetails (cross or intra), use it directly!
      const arbDetails = item.arbitrageDetails;
      if (arbDetails) {
        const primary = arbDetails.cross || arbDetails.intra;
        if (primary && primary.buyExchange && primary.sellExchange) {
          const buyEx = this.cleanExchangeName(primary.buyExchange);
          const sellEx = this.cleanExchangeName(primary.sellExchange);
          const buySymbol = primary.buyExchange.includes('USDT') ? '$' : '₺';
          const sellSymbol = primary.sellExchange.includes('USDT') ? '$' : '₺';

          // Strictly enforce: Buy market and Sell market MUST NOT be identical!
          if (buyEx !== sellEx || buySymbol !== sellSymbol) {
            return [{
              ask: {
                exchange: buyEx,
                rawPrice: primary.buyPriceRaw || primary.buyPrice,
                priceTRY: primary.effectiveBuyPriceTRY || primary.buyPrice,
                symbol: buySymbol
              },
              bid: {
                exchange: sellEx,
                rawPrice: primary.sellPriceRaw || primary.sellPrice,
                priceTRY: primary.effectiveSellPriceTRY || primary.sellPrice,
                symbol: sellSymbol
              }
            }];
          }
        }
      }

      // 2. Gather all buy quotes (asks) and sell quotes (bids) from all available exchange nodes
      const usdtTryRate = item.usdt?.paribu?.try?.price || item.usdt?.binance?.try?.price || 35.5;
      const asks = [];
      const bids = [];

      Object.keys(item).forEach(exchange => {
        if (['ROI', 'arbitrageDetails', 'fraction', 'precisions', 'recordedAt', 'profit'].includes(exchange)) return;
        const exchData = item[exchange];
        if (!exchData || typeof exchData !== 'object') return;

        const exClean = this.cleanExchangeName(exchange);

        // TRY Market
        if (exchData.try) {
          const askPrice = exchData.try.ask || exchData.try.price;
          const bidPrice = exchData.try.bid || exchData.try.price;
          if (askPrice > 0) asks.push({ priceTRY: askPrice, rawPrice: askPrice, exchange: exClean, symbol: '₺' });
          if (bidPrice > 0) bids.push({ priceTRY: bidPrice, rawPrice: bidPrice, exchange: exClean, symbol: '₺' });
        }

        // USDT Market
        if (exchData.usdt) {
          const askPrice = exchData.usdt.ask || exchData.usdt.price;
          const bidPrice = exchData.usdt.bid || exchData.usdt.price;
          const askTRY = exchData.usdt.askInTRY || (askPrice ? askPrice * usdtTryRate : 0);
          const bidTRY = exchData.usdt.bidInTRY || (bidPrice ? bidPrice * usdtTryRate : 0);
          if (askTRY > 0) asks.push({ priceTRY: askTRY, rawPrice: askPrice, exchange: exClean, symbol: '$' });
          if (bidTRY > 0) bids.push({ priceTRY: bidTRY, rawPrice: bidPrice, exchange: exClean, symbol: '$' });
        }
      });

      // 3. Form ALL valid cross-market or intra-market pairs where Ask and Bid are DIFFERENT markets
      const validPairs = [];
      asks.forEach(a => {
        bids.forEach(b => {
          // Strictly forbid pairing an exchange with itself on the same currency
          const isSameMarket = (a.exchange.toLowerCase() === b.exchange.toLowerCase() && a.symbol === b.symbol);
          if (!isSameMarket) {
            const spreadTRY = b.priceTRY - a.priceTRY;
            const roi = (spreadTRY / a.priceTRY) * 100;
            validPairs.push({
              ask: a,
              bid: b,
              roi: roi,
              spreadTRY: spreadTRY
            });
          }
        });
      });

      if (validPairs.length === 0) {
        return [];
      }

      // Sort by ROI descending (highest profit first)
      validPairs.sort((p1, p2) => p2.roi - p1.roi);

      // Return top profitable pair
      if (this.isTopDeal) {
        const profitable = validPairs.filter(p => p.roi > 0);
        if (profitable.length > 0) {
          return [profitable[0]];
        }
        if (this.coinData?.ROI > 0) {
          return [validPairs[0]];
        }
        return [];
      }

      // If expanded in All Markets, return top distinct pairs
      return validPairs.slice(0, 2);
    },
    potentialGainTRY() {
      if (this.coinData?.arbitrageDetails) {
        const crossP = this.coinData.arbitrageDetails.cross?.profit || 0;
        const intraP = this.coinData.arbitrageDetails.intra?.profit || 0;
        if (crossP > 0 || intraP > 0) return Math.max(crossP, intraP);
      }
      if (this.coinData?.profit > 0) return this.coinData.profit;
      
      // Fallback for demo or when ROI is positive
      if (this.coinData?.ROI > 0) {
        const isDemo = typeof window !== 'undefined' && (window.location.hostname.includes('github.io') || window.location.search.includes('demo=1'));
        if (isDemo) {
          const pseudoSeed = (this.coinName || 'btc').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const mockVolume = 8000 + ((pseudoSeed * 491) % 32000);
          return (mockVolume * this.coinData.ROI) / 100;
        }
      }
      return 0;
    },
    potentialGain() {
      const pTry = this.potentialGainTRY;
      if (pTry <= 0) return 0;
      if (this.USDTMode) {
        const usdtRate = this.coinData?.usdt?.paribu?.try?.price || 35.5;
        return pTry / usdtRate;
      }
      return pTry;
    }
  },
  data() {
    return {
      isExpanded: true,
      isExpandedAllMarkets: false
    };
  },
  mounted() {
  },
  watch: {
  },
  methods: {
    toggleExpand() {
      if (!this.isTopDeal) {
          this.isExpandedAllMarkets = !this.isExpandedAllMarkets;
      }
    },
    checkAutoExpand() {
      // if (this.coinData.ROI > 1) {
      //   this.isExpanded = true;
      // }
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
    formatProfit(value) {
      const val = parseFloat(value);
      if (isNaN(val) || val <= 0) return "0";
      if (val >= 1000) {
        return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      }
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    },
    getMarketIcon(exchange) {
      if (!exchange) return require('@/assets/markets/noimage.png');
      const ex = String(exchange).toLowerCase();
      try {
        if (ex.includes('paribu')) return require('@/assets/markets/paribu.png');
        if (ex.includes('binance')) return require('@/assets/markets/binance.png');
        if (ex.includes('btcturk')) return require('@/assets/markets/BTCTurk.png');
        if (ex.includes('ftx')) return require('@/assets/markets/FTX.png');
        return require(`@/assets/markets/${exchange}.png`);
      } catch (e) {
        return require('@/assets/markets/noimage.png');
      }
    },
    getExchangeFraction(exchange, symbol) {
      if (!this.coinData) return null;
      const ex = exchange ? String(exchange).toLowerCase() : '';
      const sym = (symbol === '₺' || symbol === 'TRY') ? 'try' : 'usdt';
      
      if (this.coinData.precisions) {
        if (ex.includes('paribu') && this.coinData.precisions.paribu?.[sym] !== undefined) {
          return this.coinData.precisions.paribu[sym];
        }
        if (ex.includes('btcturk') && this.coinData.precisions.btcturk?.[sym] !== undefined) {
          return this.coinData.precisions.btcturk[sym];
        }
        if (ex.includes('binance') && this.coinData.precisions.binance?.[sym] !== undefined) {
          return this.coinData.precisions.binance[sym];
        }
      }
      
      if (this.coinData.fraction !== undefined && this.coinData.fraction !== null) {
        return this.coinData.fraction;
      }
      return null;
    }
  }
};
</script>

<style scoped>
.coinbox {
  display: inline-flex;
  flex-direction: column;
  width: auto;
  min-width: max-content;
  box-sizing: border-box;
  border-radius: 7px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease;
  font-size: 0.75em;
  text-align: left;
  color: inherit;
  border: 1px solid var(--current-border);
  background-color: var(--current-card-bg);
  overflow: visible;
  height: auto;
}

.top-deal-box {
  padding: 6px 10px 8px 10px;
  margin: 3px 6px 4px 0;
}

.all-market-box {
  padding: 2px 6px 2px 6px;
  margin: 2px 4px 2px 0;
}

.all-market-box .header {
  margin: 0 0 1px 0;
  padding: 0 0 1px 0;
  gap: 4px;
}

.all-market-box .coinBoxImage {
  margin: 0 1px 0 0;
}

.all-market-box .price-display {
  padding: 0 !important;
  margin-top: 0px;
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
  margin: 0 0 3px 0;
  padding: 0 0 2px 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.roi-badge {
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

.potential-gain-row {
  white-space: nowrap;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

.gain-label {
  font-weight: 600;
  opacity: 0.8;
  font-size: 0.9em;
}

.gain-value {
  font-weight: 800;
  color: #00c076;
}

body.light-mode .gain-value {
  color: #0d8a55;
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
