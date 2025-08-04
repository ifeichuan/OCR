import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { usePDFStore } from './stores/PDFStore'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
const Pinia = createPinia()

app.use(Pinia)
export const PDFStore = usePDFStore()
app.use(router)
app.use(ElementPlus)

app.mount('#app')
