import { createApp } from 'vue'
import App from './App.vue'
import SimpleWebWorker from 'simple-web-worker'
import 'bootstrap/dist/css/bootstrap.css'

const app = createApp(App)
app.config.globalProperties.$worker = SimpleWebWorker;

app.mount('#app')
