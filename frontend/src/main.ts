import App from './App.vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VxeUITable from 'vxe-table'
import 'vxe-table/lib/style.css'
import router from './router'
import './style.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VxeUITable)

useThemeStore(pinia).applyStoredTheme()

app.mount('#app')
