/// <reference lib="webworker" />
import {precacheAndRoute, cleanupOutdatedCaches} from "workbox-precaching";
import {BackgroundSyncPlugin} from "workbox-background-sync";
import {registerRoute, NavigationRoute} from "workbox-routing";
import {NetworkOnly, NetworkFirst, CacheFirst, StaleWhileRevalidate} from "workbox-strategies";
import {ExpirationPlugin} from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

// Limpiar caches antiguos
cleanupOutdatedCaches();

// Precargar y enrutar archivos estáticos
precacheAndRoute(self.__WB_MANIFEST);

// Plugin de sincronización en segundo plano
const bgSyncPlugin = new BackgroundSyncPlugin("formSubmissionsQueue", {
	maxRetentionTime: 4320 // Retry for up to 3 days
});

// Plugin de expiración para caches
const cacheExpirationPlugin = new ExpirationPlugin({
	maxEntries: 50,
	maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
});

// Estrategia para navegación (páginas HTML)
const navigationRoute = new NavigationRoute(
	new NetworkFirst({
		cacheName: "navigation-cache",
		plugins: [cacheExpirationPlugin]
	})
);
registerRoute(navigationRoute);

// Cache para recursos estáticos (CSS, JS, imágenes)
registerRoute(
	({request}) => request.destination === "style" || 
	               request.destination === "script" || 
	               request.destination === "image",
	new CacheFirst({
		cacheName: "static-resources",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
			}),
		],
	})
);

// Cache para fuentes
registerRoute(
	({request}) => request.destination === "font",
	new CacheFirst({
		cacheName: "fonts",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 10,
				maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
			}),
		],
	})
);

// API calls con background sync para formularios
registerRoute(
	({url}): boolean => url.pathname === "/albaranes" || url.pathname === "/albaranes/duplicate",
	new NetworkOnly({
		plugins: [bgSyncPlugin]
	}),
	"POST"
);

registerRoute(
	({url}): boolean => url.pathname.match(/^\/albaran\/\w+$/) !== null,
	new NetworkOnly({
		plugins: [bgSyncPlugin]
	}),
	"PATCH"
);

registerRoute(
	({url}): boolean  => url.pathname.match(/^\/albaran\/\w+\/productos$/) !== null,
	new NetworkOnly({
		plugins: [bgSyncPlugin]
	}),
	"PATCH"
);

registerRoute(
	({url}): boolean  => url.pathname.match(/^\/albaran\/\w+\/abonos$/) !== null,
	new NetworkOnly({
		plugins: [bgSyncPlugin]
	}),
	"PATCH"
);

// Cache para datos de API (GET requests)
registerRoute(
	({url, request}) => url.origin === self.location.origin && 
	                   request.method === "GET" && 
	                   url.pathname.startsWith("/api/"),
	new StaleWhileRevalidate({
		cacheName: "api-cache",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 5 * 60, // 5 minutos
			}),
		],
	})
);

// Evento de instalación
self.addEventListener("install", (event) => {
	console.log("Service Worker instalado");
	self.skipWaiting();
});

// Evento de activación
self.addEventListener("activate", (event) => {
	console.log("Service Worker activado");
	event.waitUntil(self.clients.claim());
});

// Manejo de mensajes desde la aplicación
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});
