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
