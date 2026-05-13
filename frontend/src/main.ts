import App from './App.vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VxeUITable from 'vxe-table'
import 'vxe-table/lib/style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import router from './router'
import './style.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VxeUITable)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      // 主题色通过 CSS 变量覆盖，不使用 PrimeVue 暗色模式
      darkModeSelector: 'none',
    },
  },
})

useThemeStore(pinia).applyStoredTheme()

app.mount('#app')
