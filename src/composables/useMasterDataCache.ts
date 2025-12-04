/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import { ref } from 'vue'
import { cacheService } from '@/services/cacheService'

/**
 * Composable para acceder a los datos maestros desde el cache.
 * La carga y refresco del cache se maneja en cacheService (main.ts).
 * Este composable solo proporciona acceso a los datos cacheados.
 */
export function useMasterDataCache() {
  // Versión ligera para selects: id, nombre y bc_id (si disponible)
  type ProductoLite = { id: number; nombre: string; bc_id?: string }
  const productosLiteRef = ref<ProductoLite[]>([])

  // Obtener productos desde cache
  const getProductos = (): any[] => {
    return cacheService.getProductos() ?? []
  }

  // Versión ligera de productos para Selects
  const getProductosLite = (): ProductoLite[] => {
    if (productosLiteRef.value.length > 0) return productosLiteRef.value

    const full = cacheService.getProductos()
    if (full && full.length > 0) {
      productosLiteRef.value = full.map((p: any) => ({ id: p.id, nombre: p.nombre, bc_id: p.bc_id }))
      return productosLiteRef.value
    }
    return []
  }

  // Obtener socios desde cache
  const getSocios = (): any[] => {
    return cacheService.getSocios() ?? []
  }

  // Obtener fincas desde cache
  const getFincas = (): any[] => {
    return cacheService.getFincas() ?? []
  }

  // Obtener técnicos desde cache
  const getTecnicos = (): any[] => {
    return cacheService.getTecnicos() ?? []
  }

  // Obtener abonos desde cache
  const getAbonos = (): any[] => {
    return cacheService.getAbonos() ?? []
  }

  // Limpiar todo el cache (para logout)
  const clearCache = (): void => {
    cacheService.clearAll()
    productosLiteRef.value = []
    console.log('Cache limpiado')
  }

  return {
    getProductos,
    getProductosLite,
    getSocios,
    getFincas,
    getTecnicos,
    getAbonos,
    clearCache
  }
}