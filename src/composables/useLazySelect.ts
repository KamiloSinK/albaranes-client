/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import { ref, type Ref } from 'vue'
import type { VirtualScrollerLazyEvent } from 'primevue'

const PAGE_SIZE = 50

/**
 * Composable reutilizable para Select con lazy loading paginado.
 *
 * Comportamiento:
 * - Carga inicial de PAGE_SIZE (50) elementos.
 * - Al hacer scroll cerca del final de la lista, consulta la siguiente página.
 * - Deja de consultar cuando una respuesta devuelve menos de PAGE_SIZE elementos.
 * - Fallback a cache cuando no hay conexión/sesión.
 */
export function useLazySelect<T = any>() {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const hasMore = ref(true)

  /**
   * Carga inicial (primera página).
   * @param fetchFn  Función que realiza la petición con { limit, offset }.
   * @param opts.cacheFn  Función que devuelve los datos desde cache (fallback offline).
   * @param opts.mapFn    Transformación opcional sobre cada elemento recibido.
   * @param opts.isOnline Si hay conexión a internet.
   * @param opts.hasSession Si hay sesión activa.
   */
  async function loadInitial(
    fetchFn: (params: { limit: number; offset: number }) => Promise<Response>,
    opts?: {
      cacheFn?: () => T[]
      mapFn?: (item: any) => T
      isOnline?: boolean
      hasSession?: boolean
    }
  ) {
    const online = opts?.isOnline ?? true
    const session = opts?.hasSession ?? true

    loading.value = true
    hasMore.value = true

    try {
      // Offline / sin sesión → cache completo
      if (!online || !session) {
        if (opts?.cacheFn) {
          items.value = opts.cacheFn()
        }
        hasMore.value = false
        return
      }

      const response = await fetchFn({ limit: PAGE_SIZE, offset: 0 })
      if (response.ok) {
        const data: any[] = await response.json()
        items.value = opts?.mapFn ? data.map(opts.mapFn) : data
        hasMore.value = data.length >= PAGE_SIZE
      } else if (opts?.cacheFn) {
        items.value = opts.cacheFn()
        hasMore.value = false
      }
    } catch (err) {
      console.error('Error en carga inicial:', err)
      if (opts?.cacheFn) {
        items.value = opts.cacheFn()
      }
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  /**
   * Handler para el evento onLazyLoad del VirtualScroller de PrimeVue.
   * Carga la siguiente página cuando el usuario hace scroll cerca del final.
   */
  async function onLazyLoad(
    e: VirtualScrollerLazyEvent,
    fetchFn: (params: { limit: number; offset: number }) => Promise<Response>,
    opts?: {
      mapFn?: (item: any) => T
      isOnline?: boolean
      hasSession?: boolean
    }
  ) {
    if (loading.value || !hasMore.value) return

    // Solo cargar más cuando el viewport se acerca al final de los datos cargados
    const loadedCount = items.value.length
    if (e.last < loadedCount - 5) return

    const online = opts?.isOnline ?? true
    const session = opts?.hasSession ?? true
    if (!online || !session) return

    loading.value = true
    try {
      const response = await fetchFn({ limit: PAGE_SIZE, offset: loadedCount })
      if (response.ok) {
        const data: any[] = await response.json()
        if (data.length === 0) {
          hasMore.value = false
          return
        }
        const mapped = opts?.mapFn ? data.map(opts.mapFn) : data
        items.value = [...items.value, ...mapped]
        hasMore.value = data.length >= PAGE_SIZE
      }
    } catch (err) {
      console.error('Error en lazy load:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Añade elementos sin duplicados (útil para resultados de búsqueda/filtro).
   * @param newItems Elementos a añadir.
   * @param keyFn    Función para obtener la clave única (por defecto: item.id).
   */
  function addItems(newItems: T[], keyFn: (item: T) => any = (item: any) => item.id) {
    const existingKeys = new Set(items.value.map(keyFn))
    const unique = newItems.filter(item => !existingKeys.has(keyFn(item)))
    if (unique.length > 0) {
      items.value = [...items.value, ...unique]
    }
  }

  /** Reinicia el estado para una nueva carga. */
  function reset() {
    items.value = []
    hasMore.value = true
    loading.value = false
  }

  return { items, loading, hasMore, loadInitial, onLazyLoad, addItems, reset, PAGE_SIZE }
}
