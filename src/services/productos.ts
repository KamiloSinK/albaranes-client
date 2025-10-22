/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveProductsQueryParams} from "@coa/api-types";

export async function retrieveProductos(filter: RetrieveProductsQueryParams) {
	let query = new URLSearchParams(<Record<string, string>>filter).toString();
	return await fetch(`${import.meta.env.VITE_API_HOST}/productos?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export async function retrieveProducto(id: string | number) {
	if (typeof id === "number") id = id.toString();

	return await fetch(`${import.meta.env.VITE_API_HOST}/producto/${id}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
