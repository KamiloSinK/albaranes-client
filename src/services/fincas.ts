/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveFincasQueryParams} from "@coa/api-types";
import { cacheService } from './cacheService';

// Tipo extendido para incluir filtros adicionales del lado del cliente
interface ExtendedRetrieveFincasQueryParams extends RetrieveFincasQueryParams {
	search?: string;
	activo?: boolean;
}

// Función para verificar si hay conexión a internet
function isOnline(): boolean {
	return navigator.onLine;
}

// Función para filtrar fincas en cache según los parámetros
function filterCachedFincas(fincas: any[], filter: ExtendedRetrieveFincasQueryParams): any[] {
    let filtered = [...fincas];

    // Aplicar filtros si están presentes
    if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        filtered = filtered.filter(finca => 
            finca.nombre?.toLowerCase().includes(searchTerm) ||
            finca.codigo?.toLowerCase().includes(searchTerm) ||
            finca.bc_id?.toLowerCase?.().includes(searchTerm)
        );
    }

	if (filter.socioId !== undefined && filter.socioId !== null) {
		// Relación muchos-a-muchos: una finca puede estar asociada a varios socios
		// (dueño + vecinos que comparten cabeza de riego)
		filtered = filtered.filter(finca => (finca.socioIds ?? []).includes(filter.socioId));
	}

	if (filter.activo !== undefined) {
		filtered = filtered.filter(finca => finca.activo === filter.activo);
	}

	// Aplicar límite si está especificado
	if (filter.limit && filter.limit > 0) {
		filtered = filtered.slice(0, filter.limit);
	}

	return filtered;
}

// Función para obtener sectores de una finca específica desde cache
export function getSectoresFromCache(fincaId: number): any[] {
	const cachedFincas = cacheService.getFincas();
	if (!cachedFincas) return [];

	const finca = cachedFincas.find(f => f.id === fincaId);
	return finca?.sectores || [];
}

// Función para parsear sectores (mantiene la lógica existente)
export function parseSectores(sectores: any[]): string[] {
	return sectores.map(sector => {
		if (sector.bc_id) {
			// Extraer el número del bc_id (ej: "SEC0001_1" -> "1")
			const match = sector.bc_id.match(/_(\d+)$/);
			return match ? match[1] : sector.bc_id;
		}
		return sector.id?.toString() || '';
	}).filter(Boolean);
}

export async function retrieveFincas(filter: ExtendedRetrieveFincasQueryParams) {
	// Si no hay conexión, usar cache
	if (!isOnline()) {
		console.log('Sin conexión, usando fincas desde cache');
		const cachedFincas = cacheService.getFincas();
		
		if (cachedFincas) {
			const filtered = filterCachedFincas(cachedFincas, filter);
			
			// Simular respuesta de fetch
			return new Response(JSON.stringify(filtered), {
				status: 200,
				statusText: 'OK',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} else {
			console.warn('No hay fincas en cache y sin conexión');
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

	// Si no hay conexión, buscar en cache
	if (!isOnline()) {
		console.log('Sin conexión, buscando finca desde cache');
		const cachedFincas = cacheService.getFincas();
		
		if (cachedFincas) {
			const finca = cachedFincas.find(f => f.id.toString() === id);
			
			if (finca) {
				// Simular respuesta de fetch
				return new Response(JSON.stringify(finca), {
					status: 200,
					statusText: 'OK',
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} else {
				console.warn(`Finca con ID ${id} no encontrada en cache`);
				return new Response(JSON.stringify(null), {
					status: 404,
					statusText: 'Not Found',
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}
		} else {
			console.warn('No hay fincas en cache y sin conexión');
			return new Response(JSON.stringify(null), {
				status: 404,
				statusText: 'Cache Empty',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	}

	// Si hay conexión, hacer petición normal
	return fetch(`${import.meta.env.VITE_API_HOST}/fincas/${id}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

// Buscar finca por bc_id (código de barras)
export async function retrieveFincaByBcId(bcId: string) {
	return await fetch(`${import.meta.env.VITE_API_HOST}/fincas/bc/${encodeURIComponent(bcId)}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}
