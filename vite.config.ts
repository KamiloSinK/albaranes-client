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
			includeAssets: ["favicon.png", "favicon.ico", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
			manifest: {
				name: "Coagrisan - Gestión de Albaranes",
				short_name: "Coagrisan",
				description: "Aplicación web de Coagrisan para gestión de albaranes y productos agrícolas",
				theme_color: "#4f46e5",
				background_color: "#ffffff",
				icons: [
					{
						src: "/favicon.ico",
						type: "image/x-icon",
						sizes: "16x16"
					},
					{
						src: "/favicon.png",
						type: "image/png",
						sizes: "242x242"
					},
					{
						src: "/icon-192.png",
						type: "image/png",
						sizes: "192x192",
						purpose: "any maskable"
					},
					{
						src: "/icon-512.png",
						type: "image/png",
						sizes: "512x512",
						purpose: "any maskable"
					}
				],
				lang: "es",
				display: "standalone",
				categories: ["business", "productivity"],
				scope: "/",
				start_url: "/",
				orientation: "any",
				prefer_related_applications: false,
				display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
				edge_side_panel: {
					preferred_width: 400
				}
			},
			mode: process.env.NODE_ENV === "development" ? "development" : "production",
			strategies: "injectManifest",
			srcDir: "src",
			filename: "sw.ts",
			devOptions: {
				enabled: false, // Deshabilitado en dev para evitar conflictos con HMR
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
