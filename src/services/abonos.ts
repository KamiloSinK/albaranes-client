/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {RetrieveAbonosQueryParams} from "@coa/api-types";
import { cacheService } from './cacheService';

function isOnline(): boolean {
  return navigator.onLine;
}

function filterCachedAbonos(abonos: any[], filter: RetrieveAbonosQueryParams): any[] {
  let filtered = [...abonos];
  if (filter.limit && filter.limit > 0) {
    filtered = filtered.slice(0, filter.limit);
  }
  return filtered;
}

export async function retrieveAbonos(filter: RetrieveAbonosQueryParams) {
  // Si está offline, abortar consulta y usar cache
  if (!isOnline()) {
    const cached = cacheService.getAbonos();
    const filtered = cached ? filterCachedAbonos(cached, filter) : [];
    return new Response(JSON.stringify(filtered), {
      status: 200,
      statusText: cached ? 'OK (Cache)' : 'OK (Cache Empty)',
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
  // Si está offline, buscar en cache y abortar consulta
  if (!isOnline()) {
    const cached = cacheService.getAbonos() || [];
    const found = cached.find((a: any) => String(a?.id ?? a?.bc_id) === id);
    if (found) {
      return new Response(JSON.stringify(found), {
        status: 200,
        statusText: 'OK (Cache)',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ message: 'Abono no encontrado en cache' }), {
      status: 404,
      statusText: 'Not Found (Cache)',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return await fetch(`${import.meta.env.VITE_API_HOST}/abono/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    mode: "cors",
    credentials: "include"
  });
}
