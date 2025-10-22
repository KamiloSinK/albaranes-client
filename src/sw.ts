/// <reference lib="webworker" />
import {precacheAndRoute} from "workbox-precaching";
import {BackgroundSyncPlugin} from "workbox-background-sync";
import {registerRoute} from "workbox-routing";
import {NetworkOnly} from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

const bgSyncPlugin = new BackgroundSyncPlugin("formSubmissionsQueue", {
	maxRetentionTime: 4320 // Retry for up to 3 days
});

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
