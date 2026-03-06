<template>
<!--
  <div id="nav">
    <router-link to="/coincompare">Coin Compare</router-link> |
    <router-link to="/fanTokens">Fan Tokens</router-link>|
    <router-link to="/">Test</router-link>
  </div>
  -->
  <router-view/>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      themeMode: 'system',
      systemDarkMode: false
    };
  },
  methods: {
    updatePageTheme() {
      const isDark = this.themeMode === 'dark' || (this.themeMode === 'system' && this.systemDarkMode);
      document.body.classList.toggle('dark-mode', isDark);
      document.body.classList.toggle('light-mode', !isDark);
      
      // Update data-theme attribute for CSS targeting
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  },
  mounted() {
    // Theme initialization
    const savedTheme = localStorage.getItem('vuecoin_theme');
    if (savedTheme) this.themeMode = savedTheme;
    
    // System dark mode detection
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDarkMode = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      this.systemDarkMode = e.matches;
      this.updatePageTheme();
    });
    
    this.updatePageTheme();

    // Listen for theme changes from other tabs/local changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'vuecoin_theme') {
        this.themeMode = e.newValue;
        this.updatePageTheme();
      }
    });

    // Custom event for internal changes (like from configs.vue)
    window.addEventListener('theme-changed', (e) => {
      this.themeMode = e.detail;
      this.updatePageTheme();
    });
  }
}
</script>

<style>
:root {
  --bg-color-light: #f4f6f8;
  --bg-color-dark: #161a1e;
  --card-bg-light: #ffffff;
  --card-bg-dark: #212833;
  --text-main-light: #1a202c;
  --text-main-dark: #ffffff;
  --text-muted-light: #64748b;
  --text-muted-dark: #e2e8f0;
  --border-light: #e2e8f0;
  --border-dark: #2d364d;
  --transition-speed: 0.3s;
}

body {
  margin: 0;
  transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body.light-mode {
  background-color: var(--bg-color-light);
  color: var(--text-main-light);
  --current-card-bg: var(--card-bg-light);
  --current-border: var(--border-light);
  --current-text-muted: var(--text-muted-light);
  --current-text-main: var(--text-main-light);
  --roi-success: rgba(25, 135, 84, 0.15);
  --roi-warning: rgba(255, 193, 7, 0.15);
  --roi-danger: rgba(220, 53, 69, 0.15);
  --roi-neutral: rgba(0, 0, 0, 0.05);
}

body.dark-mode {
  background-color: var(--bg-color-dark);
  color: var(--text-main-dark);
  --current-card-bg: var(--card-bg-dark);
  --current-border: var(--border-dark);
  --current-text-muted: var(--text-muted-dark);
  --current-text-main: var(--text-main-dark);
  --roi-success: rgba(40, 167, 69, 0.4);
  --roi-warning: rgba(255, 193, 7, 0.35);
  --roi-danger: rgba(220, 53, 69, 0.45);
  --roi-neutral: rgba(255, 255, 255, 0.05);
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

/* Global Transitions */
.transition-all {
  transition: all var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

/* Global theme-aware text helpers */
.theme-text {
  color: var(--current-text-main, inherit) !important;
}

.theme-text-secondary {
  color: var(--current-text-muted) !important;
}

/* Global Select2 dark mode styling */
body.dark-mode .select2-container--default .select2-selection--single {
  background-color: var(--current-card-bg) !important;
  border-color: var(--current-border) !important;
  color: #fff !important;
}
body.dark-mode .select2-container--default .select2-selection--single .select2-selection__rendered {
  color: #fff !important;
}
body.dark-mode .select2-container--default .select2-results__option {
  background-color: var(--card-bg-dark) !important;
  color: #e2e8f0 !important;
}
body.dark-mode .select2-container--default .select2-results__option--highlighted {
  background-color: rgba(220, 53, 69, 0.3) !important;
  color: #fff !important;
}
body.dark-mode .select2-container--default .select2-search--dropdown .select2-search__field {
  background-color: var(--bg-color-dark) !important;
  border-color: var(--border-dark) !important;
  color: #fff !important;
}
body.dark-mode .select2-dropdown {
  background-color: var(--card-bg-dark) !important;
  border-color: var(--border-dark) !important;
}
</style>
