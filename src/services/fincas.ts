/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveFincasQueryParams} from "@coa/api-types";

export async function retrieveFincas(filter: RetrieveFincasQueryParams) {
	let query = new URLSearchParams(<Record<string, string>>filter).toString();
	return fetch(`${import.meta.env.VITE_API_HOST}/fincas?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export async function retrieveFinca(id: string | number) {
	if (typeof id === "number") id = id.toString();

	return fetch(`${import.meta.env.VITE_API_HOST}/finca/${id}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
