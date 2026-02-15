<template>
  <div class="col" :style="boxStyle">
    <h4>
      <a :href="binanceUrl" target="_blank">
        <img
            :src="coinImageUrl"
            style="height: 32px; width: 32px;"
            @error="noImage"
        >
      </a>
      &nbsp;{{ displayCoinName }}<br>
      {{ displayCoinPrice }}
      <span v-if="isPDA">{{ percentageChange }}</span>
    </h4>
  </div>
</template>


<script>
export default {
  name: "coinBox",
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
    },
  },
  computed: {
    boxStyle() {
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
      return require(`@/assets/coins/${this.coinName}.png`);
    },
    displayCoinPrice() {
      if (this.coinSource == 'binance') {
        if (!this.coinData?.binance) return '';

        const { usdt, try: tryPrice } = this.coinData.binance;
        if (this.coinName.toLowerCase() === 'usdt') return `${tryPrice?.price} ₺`;

        return usdt?.price ? `${usdt.price} $` : `${this.coinData.paribu?.try?.price?.toFixed(2)} ₺`;
      } else if (this.coinSource == 'paribu') {

        if (!this.coinData?.binance) return '';

        const { usdt, try: tryPrice } = this.coinData.binance;
        if (this.coinName.toLowerCase() === 'usdt') return `${tryPrice?.price} ₺`;

        return  `${this.coinData.paribu?.try?.price?.toFixed(4)} ₺`;

      }
    },
    isPDA() {
      return this.coinName.toLowerCase() === 'pda';
    },
    percentageChange() {
      if (this.coinData?.paribu?.try?.price) {
        return `(${((this.coinData.paribu.try.price/42.6 / 0.156 - 1) * 100).toFixed(1)}%)`;
      }
      return '';
    },
  },
  methods: {
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
</style>
