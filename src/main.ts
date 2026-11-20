import { createApp } from 'vue'
// Outfit served from our own domain (was a render-blocking Google Fonts stylesheet that
// also sent every visitor's IP to Google). Same variable font file and subsets Google
// served for weights 300-800.
import '@fontsource-variable/outfit'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
