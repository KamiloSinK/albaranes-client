/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveAbonosQueryParams} from "@coa/api-types";

export async function retrieveAbonos(filter: RetrieveAbonosQueryParams) {
	let query = new URLSearchParams(<Record<string, string>>filter).toString();
	return await fetch(`${import.meta.env.VITE_API_HOST}/abonos?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export async function retrieveAbono(id: string | number) {
	if (typeof id === "number") id = id.toString();

	return await fetch(`${import.meta.env.VITE_API_HOST}/abono/${id}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
