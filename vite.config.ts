/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import {fileURLToPath, URL} from "node:url";

import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import Components from "unplugin-vue-components/vite";
import {PrimeVueResolver} from "@primevue/auto-import-resolver";
import tailwindcss from "@tailwindcss/vite";
import {VitePWA} from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
		tailwindcss(),
		Components({
			resolvers: [
				PrimeVueResolver()
			]
		}),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.png", "favicon.ico"],
			manifest: {
				name: "Coagrisan",
				short_name: "Coagrisan",
				description: "Aplicación web de Coagrisan",
				theme_color: "#ffffff",
				background_color: "#ebefff",
				icons: [
					{
						src: "/favicon.png",
						type: "image/png",
						sizes: "242x242"
					},
					{
						src: "/favicon.ico",
						type: "image/x-icon",
						sizes: "16x16"
					}
				],
				lang: "es",
				display: "standalone",
				categories: ["business"],
				scope: "/",
				start_url: "/",
				orientation: "landscape"
			},
			mode: process.env.NODE_ENV === "development" ? "development" : "production",
			strategies: "injectManifest",
			srcDir: "src",
			filename: "sw.ts",
			devOptions: {
				enabled: true,
				type: "module"
			},
			injectRegister: "auto",
			injectManifest: {
				swSrc: "src/sw.ts",
				injectionPoint: "self.__WB_MANIFEST"
			}
/*			workbox: {
				globPatterns: ["**!/!*.{js,css,html,png,svg,ico}"],
				skipWaiting: true,
				sourcemap: true,
				runtimeCaching: [{
					urlPattern: /\/albaranes(\/duplicate)?$/,
					handler: "NetworkOnly",
					method: "POST",
					options: {
						backgroundSync: {
							name: "formSubmissionQueue",
							options: {
								maxRetentionTime: 72 * 60
							}
						}
					}
				}]
			}*/
		})
	],
	dev: {
		sourcemap: true
	},
	build: {
		sourcemap: true,
		rollupOptions: {
			external: ["@coa/api-types"]
		}
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url))
		}
	}
});
