import Vue from 'vue'
import App from './App.vue'
import iView from 'iview'
import './styles/km-grid.less'

import KmGrid from './components/km-grid'

Vue.config.productionTip = false
Vue.use(iView)
Vue.use(KmGrid)

new Vue({
  render: h => h(App),
}).$mount('#app')
