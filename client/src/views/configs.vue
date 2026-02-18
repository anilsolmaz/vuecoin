<template>
  <div class="container mt-5">
    <div class="card shadow-sm">
      <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
        <h4 class="mb-0">Arbitrage Alert Settings</h4>
        <router-link to="/" class="btn btn-sm btn-light">Back to Dashboard</router-link>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveSettings">
          <div class="row g-3">
            <!-- Cooldown -->
            <div class="col-md-4">
              <label class="form-label fw-bold">Telegram Cooldown (Min)</label>
              <div class="input-group">
                <input type="number" step="1" v-model="settings.cooldown" class="form-control" required>
                <span class="input-group-text">minutes</span>
              </div>
              <small class="text-muted">Minimum time between alerts for the same coin.</small>
            </div>

            <!-- Min Profit -->
            <div class="col-md-4">
              <label class="form-label fw-bold">Min Potential Gain (TRY)</label>
              <div class="input-group">
                <span class="input-group-text">₺</span>
                <input type="number" step="10" v-model="settings.minProfit" class="form-control" required>
              </div>
              <small class="text-muted">Minimum estimated TRY profit to trigger alert.</small>
            </div>

            <!-- Min ROI -->
            <div class="col-md-4">
              <label class="form-label fw-bold">Min ROI Threshold (%)</label>
              <div class="input-group">
                <input type="number" step="0.1" v-model="settings.minROI" class="form-control" required>
                <span class="input-group-text">%</span>
              </div>
              <small class="text-muted">Minimum ROI required for deals to be logged/alerted.</small>
            </div>
          </div>

          <hr class="my-4">

          <div class="d-flex justify-content-end align-items-center">
            <span v-if="message" :class="['me-3', messageType === 'success' ? 'text-success' : 'text-danger']">
              {{ message }}
            </span>
            <button type="submit" class="btn btn-danger px-4" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "configs",
  data() {
    return {
      settings: {
        cooldown: 5,
        minProfit: 1000,
        minROI: 0.5
      },
      saving: false,
      message: '',
      messageType: 'success'
    };
  },
  methods: {
    async fetchSettings() {
      try {
        const response = await axios.get('/api/settings');
        this.settings = response.data;
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    },
    async saveSettings() {
      this.saving = true;
      this.message = '';
      try {
        const response = await axios.post('/api/settings', this.settings);
        this.message = response.data.message;
        this.messageType = 'success';
      } catch (error) {
        this.message = 'Error saving settings';
        this.messageType = 'danger';
        console.error("Failed to save settings:", error);
      } finally {
        this.saving = false;
        setTimeout(() => { this.message = ''; }, 3000);
      }
    }
  },
  mounted() {
    this.fetchSettings();
  }
}
</script>

<style scoped>
.card {
  border-radius: 12px;
  overflow: hidden;
}
.card-header {
  border-bottom: none;
}
.form-label {
  color: #c82333;
}
</style>

