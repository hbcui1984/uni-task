import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
	plugins: [uni()],
	esbuild: {
		// 生产环境移除 console 和 debugger
		drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
	}
})
