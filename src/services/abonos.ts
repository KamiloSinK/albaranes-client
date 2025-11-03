/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveAbonosQueryParams} from "@coa/api-types";
import { cacheService } from './cacheService';

function filterCachedAbonos(abonos: any[], filter: RetrieveAbonosQueryParams): any[] {
  let filtered = [...abonos];
  if (filter.limit && filter.limit > 0) {
    filtered = filtered.slice(0, filter.limit);
  }
  return filtered;
}

export async function retrieveAbonos(filter: RetrieveAbonosQueryParams) {
  const query = new URLSearchParams(<Record<string, string>>filter).toString();
  try {
    const response = await fetch(`${import.meta.env.VITE_API_HOST}/abonos?${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      mode: 'cors',
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    if (response.ok) {
      return response;
    }
    console.warn(`Fallo HTTP abonos (${response.status}). Usando cache si disponible.`);
  } catch (err) {
    console.warn('Error de red abonos. Usando cache si disponible.', err);
  }

  const cached = cacheService.getAbonos();
  const filtered = cached ? filterCachedAbonos(cached, filter) : [];
  return new Response(JSON.stringify(filtered), {
    status: 200,
    statusText: cached ? 'OK (Cache Fallback)' : 'OK (Cache Empty)',
    headers: { 'Content-Type': 'application/json' }
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
