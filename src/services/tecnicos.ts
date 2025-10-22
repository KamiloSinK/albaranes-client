/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveTecnicosQueryParams} from "@coa/api-types";

export async function retrieveTecnicos(filter: RetrieveTecnicosQueryParams) {
	let query = new URLSearchParams(<Record<string, string>>filter).toString();
	return fetch(`${import.meta.env.VITE_API_HOST}/tecnicos?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
