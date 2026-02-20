<template>
  <div :class="['settings-layout d-flex min-vh-100 transition-colors', themeMode === 'dark' || (themeMode === 'system' && systemDarkMode) ? 'dark-mode bg-dark' : 'bg-light']">
    <!-- Sidebar Navigation -->
    <aside class="settings-sidebar border-end shadow-sm flex-shrink-0">
      <div class="p-4 border-bottom d-flex align-items-center mb-2">
        <i class="bi bi-gear-fill fs-4 text-danger me-2"></i>
        <h5 class="mb-0 fw-bold theme-text">Settings</h5>
      </div>
      <nav class="p-2 flex-grow-1 overflow-y-auto">
        <!-- Appearance Section -->
        <button @click="scrollToSection('general')"
                :class="['nav-link w-100 text-start border-0 rounded-3 p-3 mb-1 transition', activeSection === 'general' ? 'active-tab shadow-sm' : '']">
          <i class="bi bi-palette-fill me-3"></i>
          <span class="fw-semibold">Appearance</span>
        </button>

        <!-- Scanner Section -->
        <div class="mb-1">
          <button @click="scrollToSection('scanner')"
                  :class="['nav-link w-100 text-start border-0 rounded-3 p-3 transition', (activeSection === 'scanner' || activeSection === 'scanner-global' || activeSection === 'scanner-cross' || activeSection === 'scanner-intra') ? 'active-tab shadow-sm' : '']">
            <i class="bi bi-cpu-fill me-3"></i>
            <span class="fw-semibold">Scanner Engine</span>
          </button>
          
          <!-- Sub-navigation for Scanner -->
          <div v-if="activeSection.startsWith('scanner')" class="ps-4 mt-1 d-none d-lg-block">
            <button v-for="sub in [{id:'scanner-global', label:'Global Rules'}, {id:'scanner-cross', label:'Cross-Exchange'}, {id:'scanner-intra', label:'Same-Exchange'}]"
                    :key="sub.id"
                    @click="scrollToSection(sub.id)"
                    class="btn btn-sm w-100 text-start border-0 py-2 text-muted transition hover-danger small">
              <i class="bi bi-dot me-1"></i>{{ sub.label }}
            </button>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer p-3 border-top">
        <router-link to="/" class="btn btn-outline-secondary w-100 text-start border-0 py-2">
          <i class="bi bi-arrow-left me-2"></i><span>Exit Dashboard</span>
        </router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-grow-1 p-4 p-lg-5 overflow-auto" @scroll="handleScroll">
      <div class="content-container mx-auto pb-5">
        <header class="mb-5 d-flex justify-content-between align-items-end border-bottom pb-4">
          <div>
            <h1 class="display-5 fw-bold theme-text mb-2">Configuration Hub</h1>
            <p class="text-muted mb-0">Manage all your arbitrage parameters in one place.</p>
          </div>
          <div class="d-none d-md-block sticky-save-btn">
             <transition name="fade">
              <span v-if="message" :class="['me-3 fw-medium', messageType === 'success' ? 'text-success' : 'text-danger']">
                <i :class="[messageType === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill', 'me-1']"></i>
                {{ message }}
              </span>
            </transition>
            <button @click="saveSettings" class="btn btn-danger px-4 py-2 fw-bold shadow-sm" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
              Save All Changes
            </button>
          </div>
        </header>

        <form @submit.prevent="saveSettings">
          <!-- Appearance Settings Section -->
          <div id="general" class="settings-card rounded-4 shadow-sm p-4 p-md-5 border mb-5 transition">
            <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom text-start">
              <div class="icon-circle bg-danger-vibrant shadow-danger flex-shrink-0">
                <i class="bi bi-palette-fill text-white fs-4"></i>
              </div>
              <div>
                <h3 class="fw-bold mb-0 theme-text">Appearance</h3>
                <p class="text-muted mb-0 small-description">Customize your interface and theme settings.</p>
              </div>
            </div>
            
            <div class="row g-4 ps-md-5 ms-md-2">
              <div class="col-12">
                <label class="form-label text-uppercase fw-bold small text-secondary mb-3">Color Theme</label>
                <div class="d-flex gap-2 max-w-400">
                  <button v-for="mode in ['light', 'dark', 'system']" :key="mode"
                          type="button"
                          @click="setTheme(mode)"
                          :class="['btn flex-grow-1 p-3 border rounded-3 transition d-flex flex-column align-items-center gap-2 theme-toggle-btn', 
                                  themeMode === mode ? 'active-mode' : 'bg-transparent theme-text']">
                    <i :class="['bi fs-3', mode === 'light' ? 'bi-sun' : mode === 'dark' ? 'bi-moon-stars' : 'bi-display']"></i>
                    <span class="small fw-bold">{{ mode.charAt(0).toUpperCase() + mode.slice(1) }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div id="scanner" class="settings-card rounded-4 shadow-sm p-4 p-md-5 border mb-5 transition">
            <div class="d-flex align-items-center gap-3 mb-5 pb-3 border-bottom text-start">
              <div class="icon-circle bg-danger-vibrant shadow-danger flex-shrink-0">
                <i class="bi bi-cpu-fill text-white fs-4"></i>
              </div>
              <div>
                <h3 class="fw-bold mb-0 theme-text">Scanner Engine</h3>
                <p class="text-muted mb-0 small-description">Configure how the arbitrage engine identifies and reports deals.</p>
              </div>
            </div>

            <!-- Global Engine Section -->
            <div id="scanner-global" class="mb-5 sub-section-box p-4 rounded-4 shadow-sm">
              <div class="d-flex align-items-center mb-4">
                <div class="sub-icon-circle bg-danger-subtle me-3">
                  <i class="bi bi-gear-wide-connected text-danger fs-5"></i>
                </div>
                <h6 class="fw-bold mb-0 text-uppercase tracking-wider theme-text">Global Rules</h6>
              </div>
              <div class="row g-4 ps-md-3">
                <div class="col-12">
                  <div class="form-group custom-input-group">
                    <label class="form-label fw-bold small text-secondary">TELEGRAM COOLDOWN</label>
                    <div class="input-group input-group-lg border-bottom">
                      <input type="number" step="1" v-model="settings.globalCooldown" class="form-control border-0 bg-transparent theme-input" required>
                      <span class="input-group-text text-muted border-0 bg-transparent theme-unit">MIN</span>
                    </div>
                    <small class="form-text text-muted">Delay before repeating alerts for the same asset.</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cross-Exchange Section -->
            <div id="scanner-cross" class="mb-5 sub-section-box p-4 rounded-4 shadow-sm">
              <div class="d-flex align-items-center mb-4">
                <div class="sub-icon-circle bg-danger-subtle me-3">
                  <i class="bi bi-arrow-left-right text-danger fs-5"></i>
                </div>
                <h6 class="fw-bold mb-0 text-uppercase tracking-wider theme-text">Cross-Exchange Market</h6>
              </div>
              <div class="row g-4 ps-md-3">
                <div class="col-md-6">
                  <div class="form-group custom-input-group">
                    <label class="form-label fw-bold small text-secondary">MIN ROI %</label>
                    <div class="input-group border-bottom">
                      <input type="number" step="0.1" v-model="settings.crossMinROI" class="form-control border-0 bg-transparent theme-input" required>
                      <span class="input-group-text text-muted border-0 bg-transparent theme-unit">%</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group custom-input-group">
                    <label class="form-label fw-bold small text-secondary">MIN PROFIT (TRY)</label>
                    <div class="input-group border-bottom">
                      <span class="input-group-text text-muted border-0 bg-transparent theme-unit">₺</span>
                      <input type="number" step="10" v-model="settings.crossMinProfit" class="form-control border-0 bg-transparent theme-input" required>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Same-Exchange Section -->
            <div id="scanner-intra" class="mb-2 sub-section-box p-4 rounded-4 shadow-sm">
              <div class="d-flex align-items-center mb-4">
                <div class="sub-icon-circle bg-danger-subtle me-3">
                  <i class="bi bi-arrow-repeat text-danger fs-5"></i>
                </div>
                <h6 class="fw-bold mb-0 text-uppercase tracking-wider theme-text">Same-Exchange Market</h6>
              </div>
              <div class="row g-4 ps-md-3">
                <div class="col-md-6">
                  <div class="form-group custom-input-group">
                    <label class="form-label fw-bold small text-secondary">MIN ROI %</label>
                    <div class="input-group border-bottom">
                      <input type="number" step="0.1" v-model="settings.intraMinROI" class="form-control border-0 bg-transparent theme-input" required>
                      <span class="input-group-text text-muted border-0 bg-transparent theme-unit">%</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group custom-input-group">
                    <label class="form-label fw-bold small text-secondary">MIN PROFIT (TRY)</label>
                    <div class="input-group border-bottom">
                      <span class="input-group-text text-muted border-0 bg-transparent theme-unit">₺</span>
                      <input type="number" step="10" v-model="settings.intraMinProfit" class="form-control border-0 bg-transparent theme-input" required>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        <!-- Fixed Bottom Save Bar for Mobile -->
        <div class="mobile-save-box d-md-none p-3 border-top shadow-lg theme-card-bg">
           <button @click="saveSettings" class="btn btn-danger w-100 py-3 fw-bold shadow" :disabled="saving">
              Save All Changes
            </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "configs",
  data() {
    return {
      settings: {
        globalCooldown: 5,
        crossMinProfit: 1000,
        crossMinROI: 0.5,
        intraMinROI: 0,
        intraMinProfit: 100
      },
      saving: false,
      message: '',
      messageType: 'success',
      themeMode: 'system', // light, dark, system
      systemDarkMode: false,
      activeSection: 'general'
    };
  },
  methods: {
    scrollToSection(id) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    async fetchSettings() {
      try {
        const response = await axios.get('/api/settings');
        this.settings = { ...this.settings, ...response.data };
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    },
    async saveSettings() {
      this.saving = true;
      this.message = '';
      try {
        const response = await axios.post('/api/settings', this.settings);
        this.message = response.data.message || 'Settings saved successfully';
        this.messageType = 'success';
      } catch (error) {
        this.message = 'Error saving settings';
        this.messageType = 'danger';
        console.error("Failed to save settings:", error);
      } finally {
        this.saving = false;
        setTimeout(() => { this.message = ''; }, 3000);
      }
    },
    setTheme(mode) {
      this.themeMode = mode;
      localStorage.setItem('vuecoin_theme', mode);
      this.updatePageTheme();
      // Dispatch custom event for App.vue
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: mode }));
    },
    updatePageTheme() {
      const isDark = this.themeMode === 'dark' || (this.themeMode === 'system' && this.systemDarkMode);
      document.body.classList.toggle('dark-mode', isDark);
    },
    handleScroll(event) {
      const sections = ['general', 'scanner', 'scanner-global', 'scanner-cross', 'scanner-intra'];
      const scrollPos = event.target.scrollTop + 200;
      
      sections.forEach(section => {
        const el = document.getElementById(section);
        if (el && scrollPos >= el.offsetTop) {
          this.activeSection = section;
        }
      });
    }
  },
  mounted() {
    this.fetchSettings();
    
    // Theme initialization
    const savedTheme = localStorage.getItem('vuecoin_theme');
    if (savedTheme) this.themeMode = savedTheme;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDarkMode = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      this.systemDarkMode = e.matches;
      this.updatePageTheme();
    });
    
    this.updatePageTheme();
  }
}
</script>

<style scoped>
.settings-layout {
  --bg-color: #f8f9fa;
  --sidebar-bg: #ffffff;
  --card-bg: #ffffff;
  --text-main: #212529;
  --text-secondary: #495057;
  --text-muted: #6c757d;
  --border-color: #dee2e6;
  --input-bg: #ffffff;
  --icon-bg: rgba(220, 53, 69, 0.1);
}

.settings-layout.dark-mode {
  --bg-color: #161a1e;
  --sidebar-bg: #1c2229;
  --card-bg: #212833;
  --text-main: #ffffff;
  --text-secondary: #ffffff;
  --text-muted: #f1f5f9;
  --border-color: #2d364d;
  --input-bg: #2b3544;
  --icon-bg: rgba(220, 53, 69, 0.4);
  --section-bg: rgba(255, 255, 255, 0.05);
}

.settings-layout {
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-main);
  transition: background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
              color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-sidebar {
  width: 280px;
  background-color: var(--sidebar-bg);
  border-color: var(--border-color) !important;
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

.theme-text, .text-main {
  color: var(--text-main) !important;
}

.text-muted {
  color: var(--text-muted) !important;
}

.text-secondary, .form-label {
  color: var(--text-secondary) !important;
}

.form-text {
  color: var(--text-muted) !important;
  font-size: 0.85rem;
  font-weight: 500;
}

.transition-colors {
  transition: background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
}

.nav-link {
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.nav-link:hover {
  background-color: var(--icon-bg) !important;
  color: #dc3545 !important;
}

.active-tab {
  background-color: #dc3545 !important;
  color: white !important;
  box-shadow: 0 8px 20px rgba(220, 53, 69, 0.3);
}

.content-container {
  max-width: 900px;
}

.icon-circle {
  background-color: var(--icon-bg) !important;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
}

.bg-danger-vibrant {
  background: linear-gradient(135deg, #ff4d4d, #dc3545) !important;
}

.shadow-danger {
  box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
}

.sub-icon-circle {
  width: 42px;
  height: 42px;
  background-color: var(--icon-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.settings-card {
  background-color: var(--card-bg);
  border-color: var(--border-color) !important;
  transition: background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
}

.settings-card:hover {
  box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
}

.theme-input {
  background-color: var(--input-bg) !important;
  border-color: var(--border-color) !important;
  color: var(--text-main) !important;
  transition: all 0.3s ease;
}

.theme-input:focus {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.15) !important;
}

.theme-input-group-text {
  background-color: transparent !important;
  border-color: var(--border-color) !important;
  color: var(--text-muted) !important;
  transition: all 0.3s ease;
}

.theme-unit {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.sub-section-box {
  background-color: var(--section-bg, #fcfcfd);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.sub-section-box:hover {
  border-color: rgba(220, 53, 69, 0.3);
  transform: translateY(-2px);
}

.hover-danger:hover {
  color: #dc3545 !important;
}

.tracking-wider {
  letter-spacing: 1.2px;
}

small, .small, p.small-description {
  font-size: 0.95rem !important;
  font-weight: 500 !important;
  color: var(--text-muted) !important;
  line-height: 1.5;
  opacity: 1 !important;
}

h3, h4, h5, h6 {
  color: var(--text-main) !important;
  text-align: left !important;
}

.overflow-y-auto {
  overflow-y: auto;
}

.sticky-save-btn {
  position: sticky;
  top: 0;
  z-index: 10;
}

.mobile-save-box {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: var(--card-bg);
  border-color: var(--border-color) !important;
  transition: background-color 0.4s ease;
}

.max-w-400 {
  max-width: 450px;
}

.theme-active-border {
  border-color: #dc3545 !important;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.1);
}

.theme-toggle-btn {
  border-color: var(--border-color) !important;
}

.active-mode {
  background-color: #dc3545 !important;
  color: white !important;
  border-color: #dc3545 !important;
  box-shadow: 0 8px 20px rgba(220, 53, 69, 0.35);
}

.active-mode i {
  color: white !important;
}

.theme-input {
  background-color: var(--input-bg) !important;
  border-color: transparent !important;
  border-bottom: 2px solid var(--border-color) !important;
  color: var(--text-main) !important;
  transition: all 0.3s ease;
  border-radius: 0;
}

.theme-input:focus {
  border-bottom-color: #dc3545 !important;
  box-shadow: none !important;
}

.bg-light-subtle {
  background-color: var(--input-bg) !important;
}

html {
  scroll-behavior: smooth;
}

hr {
  border-color: var(--border-color) !important;
  opacity: 0.15;
}

@media (max-width: 991px) {
  .settings-sidebar {
    width: 80px;
  }
  .settings-sidebar span, .settings-sidebar h5, .sidebar-footer span, .theme-switcher-box label {
    display: none;
  }
  .nav-link {
    text-align: center !important;
  }
  .nav-link i {
    margin-right: 0 !important;
    font-size: 1.5rem;
  }
}
</style>

