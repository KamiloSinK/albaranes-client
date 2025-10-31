/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveTecnicosQueryParams} from "@coa/api-types";
import { cacheService } from './cacheService';

// Función para verificar si hay conexión a internet
function isOnline(): boolean {
	return navigator.onLine;
}

// Función para filtrar técnicos en cache según los parámetros
function filterCachedTecnicos(tecnicos: any[], filter: RetrieveTecnicosQueryParams): any[] {
	let filtered = [...tecnicos];

	// Aplicar filtros si están presentes
	if (filter.search) {
		const searchTerm = filter.search.toLowerCase();
		filtered = filtered.filter(tecnico => 
			tecnico.nombre?.toLowerCase().includes(searchTerm) ||
			tecnico.codigo?.toLowerCase().includes(searchTerm) ||
			tecnico.email?.toLowerCase().includes(searchTerm)
		);
	}

	if (filter.activo !== undefined) {
		filtered = filtered.filter(tecnico => tecnico.activo === filter.activo);
	}

	// Aplicar límite si está especificado
	if (filter.limit && filter.limit > 0) {
		filtered = filtered.slice(0, filter.limit);
	}

	return filtered;
}

export async function retrieveTecnicos(filter: RetrieveTecnicosQueryParams) {
	// Si no hay conexión, usar cache
	if (!isOnline()) {
		console.log('Sin conexión, usando técnicos desde cache');
		const cachedTecnicos = cacheService.getTecnicos();
		
		if (cachedTecnicos) {
			const filtered = filterCachedTecnicos(cachedTecnicos, filter);
			
			// Simular respuesta de fetch
			return new Response(JSON.stringify(filtered), {
				status: 200,
				statusText: 'OK',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} else {
			console.warn('No hay técnicos en cache y sin conexión');
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
	return fetch(`${import.meta.env.VITE_API_HOST}/tecnicos?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
