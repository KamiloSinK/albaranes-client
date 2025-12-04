/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveSociosQueryParams} from "@coa/api-types";
import { cacheService } from './cacheService';

// Tipo extendido para incluir filtros adicionales del lado del cliente
interface ExtendedRetrieveSociosQueryParams extends RetrieveSociosQueryParams {
	search?: string;
	activo?: boolean;
}

// Función para verificar si hay conexión a internet
function isOnline(): boolean {
	return navigator.onLine;
}

// Función para filtrar socios en cache según los parámetros
function filterCachedSocios(socios: any[], filter: ExtendedRetrieveSociosQueryParams): any[] {
  let filtered = [...socios];

  // Aplicar filtros si están presentes
  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    filtered = filtered.filter(socio => 
      socio.nombre?.toLowerCase().includes(searchTerm) ||
      socio.codigo?.toLowerCase().includes(searchTerm) ||
      socio.dni?.toLowerCase().includes(searchTerm) ||
      socio.bc_id?.toLowerCase().includes(searchTerm)
    );
  }

	if (filter.activo !== undefined) {
		filtered = filtered.filter(socio => socio.activo === filter.activo);
	}

	// Aplicar límite si está especificado
	if (filter.limit && filter.limit > 0) {
		filtered = filtered.slice(0, filter.limit);
	}

	return filtered;
}

export async function retrieveSocios(filter: ExtendedRetrieveSociosQueryParams) {
	// Si no hay conexión, usar cache
	if (!isOnline()) {
		console.log('Sin conexión, usando socios desde cache');
		const cachedSocios = cacheService.getSocios();
		
		if (cachedSocios) {
			const filtered = filterCachedSocios(cachedSocios, filter);
			
			// Simular respuesta de fetch
			return new Response(JSON.stringify(filtered), {
				status: 200,
				statusText: 'OK',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} else {
			console.warn('No hay socios en cache y sin conexión');
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

// Buscar socio por bc_id (código de barras)
export async function retrieveSocioByBcId(bcId: string) {
	return await fetch(`${import.meta.env.VITE_API_HOST}/socios/bc/${encodeURIComponent(bcId)}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
