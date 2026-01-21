/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type { RetrieveVisitasQueryParams } from "@coa/api-types";

export async function retrieveVisitas(filter: RetrieveVisitasQueryParams) {
	const queryParams = new URLSearchParams({
		fecha_inicio: filter.fecha_inicio,
		fecha_fin: filter.fecha_fin
	});

	return fetch(`${import.meta.env.VITE_API_HOST}/albaranes/visitas?${queryParams.toString()}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
