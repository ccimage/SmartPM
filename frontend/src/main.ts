import App from './App.vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VxeUITable from 'vxe-table'
import 'vxe-table/lib/style.css'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VxeUITable)

app.mount('#app')
