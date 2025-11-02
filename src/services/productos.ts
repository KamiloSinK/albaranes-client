/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveProductsQueryParams} from "@coa/api-types";
import { cacheService } from './cacheService';

// Tipo extendido para incluir filtros adicionales del lado del cliente
interface ExtendedRetrieveProductsQueryParams extends RetrieveProductsQueryParams {
	search?: string;
	activo?: boolean;
}

// Función para verificar si hay conexión a internet
function isOnline(): boolean {
	return navigator.onLine;
}

// Función para filtrar productos en cache según los parámetros
function filterCachedProductos(productos: any[], filter: ExtendedRetrieveProductsQueryParams): any[] {
	let filtered = [...productos];

	// Aplicar filtros si están presentes
	if (filter.search) {
		const searchTerm = filter.search.toLowerCase();
		filtered = filtered.filter(producto => 
			producto.nombre?.toLowerCase().includes(searchTerm) ||
			producto.codigo?.toLowerCase().includes(searchTerm)
		);
	}

	if (filter.activo !== undefined) {
		filtered = filtered.filter(producto => producto.activo === filter.activo);
	}

	// Aplicar límite si está especificado
	if (filter.limit && filter.limit > 0) {
		filtered = filtered.slice(0, filter.limit);
	}

	return filtered;
}

export async function retrieveProductos(filter: ExtendedRetrieveProductsQueryParams) {
	// Si no hay conexión, usar cache
	if (!isOnline()) {
		console.log('Sin conexión, usando productos desde cache');
		const cachedProductos = cacheService.getProductos();
		
		if (cachedProductos) {
			const filtered = filterCachedProductos(cachedProductos, filter);
			
			// Simular respuesta de fetch
			return new Response(JSON.stringify(filtered), {
				status: 200,
				statusText: 'OK',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} else {
			console.warn('No hay productos en cache y sin conexión');
			return new Response(JSON.stringify([]), {
				status: 200,
				statusText: 'OK (Cache Empty)',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	}

	// Si hay conexión, hacer petición normal
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

	return await fetch(`${import.meta.env.VITE_API_HOST}/productos/${id}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
