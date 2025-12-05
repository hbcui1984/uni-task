import App from './App'
import store from './store'
import plugin from './js_sdk/uni-admin/plugin'

// #ifdef VUE3
import {createSSRApp} from 'vue'

export function createApp() {
	const app = createSSRApp(App)
	app.use(plugin)
	app.use(store)
	return {app}
}
// #endif
