/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import "./assets/main.css";

import {createApp} from "vue";
import App from "./App.vue";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import {es} from "primelocale/es.json";
import type {ThemeOptions} from "@primeuix/themes";
import CoagrisanTheme from "@/CoagrisanTheme";
import {cacheService} from "@/services/cacheService";

const app = createApp(App);
app.use(PrimeVue, {
	theme: {
		preset: CoagrisanTheme,
		options: <ThemeOptions>{
			darkModeSelector: "none"
		}
	},
	locale: es
});
app.use(ConfirmationService);
app.mount("#app");

// Inicializar cache y refrescar datos expirados al cargar la página
cacheService.initialize().then(() => {
	cacheService.refreshExpiredCaches()
	cacheService.startPeriodicRefresh() // Verificar cada 15 min mientras el usuario está en la página
})
