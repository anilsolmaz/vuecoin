<template>
  <div class="col">
    <h4>
      <a>
        <img
            style="height: 32px; width: 32px;"
            :src="require(`@/assets/coins/${coinName}.png`)"
        >
      </a>&nbsp{{coinName.toUpperCase()}}<br>
      {{ (coinPrice*0.00075).toFixed(3)+'$ (↑'+((coinPrice*0.00075/0.156-1)*100).toFixed(0)+'%)'}}
<!--    {{ (coinPrice*0.00075).toFixed(3)+'$ ('+((coinPrice*0.00075/0.156-1)*100).toFixed(0)+'%)'+((coinPrice*0.00075/0.156-1)*100*1300).toFixed(0)+'k$'}} -->
    </h4>
  </div>
</template>

<script>
export default {
  name: "TopCoinExt",
  props: {
    coinName: {
      type: String,
      required: true
    },
    coinPrice: {
      required: true
    }
  }
}
</script>

<style scoped>
/* Add your scoped styles here if needed */
</style>
