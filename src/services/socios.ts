/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveSociosQueryParams} from "@coa/api-types";

export async function retrieveSocios(filter: RetrieveSociosQueryParams) {
	let query = new URLSearchParams(<Record<string, string>>filter).toString();
	return await fetch(`${import.meta.env.VITE_API_HOST}/socios?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export async function retrieveSocio(id: string | number) {
	if (typeof id === "number") id = id.toString();

	return await fetch(`${import.meta.env.VITE_API_HOST}/socio/${id}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
