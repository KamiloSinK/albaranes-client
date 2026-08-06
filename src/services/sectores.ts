/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import { cacheService } from './cacheService'

// Utilidad: detectar conexión
function isOnline(): boolean {
  return navigator.onLine
}

// Intentar obtener sectores de cache vía fincas
function getSectoresFromCache(fincaId: number): any[] {
  const fincas = cacheService.getFincas()
  if (!fincas || !Array.isArray(fincas)) return []
  const finca = fincas.find((f: any) => f.id === fincaId)
  if (!finca) return []
  // Variaciones posibles del payload en cache
  if (Array.isArray(finca.sectores)) return finca.sectores
  if (Array.isArray(finca.sectorIds)) return finca.sectorIds.map((id: number) => ({ id }))
  return []
}

// Parseo opcional para obtener número legible (p.e. SEC0001_5 -> 5)
// "sector" = finca hermana del mismo socio: bc_id ya es un identificador real y
// legible (el bc_id de esa finca), no hace falta parsear ningún sufijo.
export function parseSectorNumero(sector: any): string {
  if (sector?.bc_id && typeof sector.bc_id === 'string') {
    return sector.bc_id
  }
  return sector?.id != null ? String(sector.id) : ''
}

// Obtener sectores por finca (online/offline)
export async function retrieveSectoresByFinca(fincaId: number) {
  // Offline: responder desde cache
  if (!isOnline()) {
    const sectores = getSectoresFromCache(fincaId)
    return new Response(JSON.stringify(sectores), {
      status: 200,
      statusText: 'OK (Cache)',
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Online: consultar API
  return fetch(`${import.meta.env.VITE_API_HOST}/sectores/${fincaId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    mode: 'cors',
    credentials: 'include'
  })
}

// Actualización en lote de sinInventario por sector
export async function bulkUpdateSectores(
  fincaId: number,
  updates: Array<{ id: number; sinInventario: boolean }>
) {
  return fetch(`${import.meta.env.VITE_API_HOST}/sectores/${fincaId}/bulk`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    credentials: 'include',
    body: JSON.stringify({ updates })
  })
}