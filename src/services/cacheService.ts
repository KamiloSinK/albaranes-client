/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  version: string
}

export interface CacheStats {
  productos: { count: number; lastUpdate: Date | null }
  socios: { count: number; lastUpdate: Date | null }
  fincas: { count: number; lastUpdate: Date | null }
  tecnicos: { count: number; lastUpdate: Date | null }
  abonos: { count: number; lastUpdate: Date | null }
}

import * as idb from './indexedDb'

class CacheService {
  private readonly CACHE_DURATION = 1 * 60 * 60 * 1000 // 1 hora en milisegundos
  private readonly VERSION = '1.0.0'

  // Nombres de stores en IndexedDB
  private readonly STORES = {
    productos: 'productos',
    socios: 'socios',
    fincas: 'fincas',
    tecnicos: 'tecnicos',
    abonos: 'abonos'
  }

  // Claves de metadatos en localStorage (timestamp, version, count)
  private readonly META_KEYS = {
    productos: 'coagrisan_cache_meta_productos',
    socios: 'coagrisan_cache_meta_socios',
    fincas: 'coagrisan_cache_meta_fincas',
    tecnicos: 'coagrisan_cache_meta_tecnicos',
    abonos: 'coagrisan_cache_meta_abonos'
  }

  // Claves antiguas (localStorage con payload completo) para limpieza
  private readonly OLD_KEYS = {
    productos: 'coagrisan_cache_productos',
    socios: 'coagrisan_cache_socios',
    fincas: 'coagrisan_cache_fincas',
    tecnicos: 'coagrisan_cache_tecnicos',
    abonos: 'coagrisan_cache_abonos'
  }

  // Cache en memoria para acceso síncrono
  private mem: Record<string, any[]> = {
    productos: [],
    socios: [],
    fincas: [],
    tecnicos: [],
    abonos: []
  }

  private initialized = false
  private initPromise: Promise<void> | null = null

  // Verificar si el cache es válido (no ha expirado)
  private isCacheValid(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    const isExpired = (now - entry.timestamp) > this.CACHE_DURATION
    const isVersionValid = entry.version === this.VERSION
    
    return !isExpired && isVersionValid
  }

  // Inicializar caches desde IndexedDB (carga en memoria y metadatos)
  async initialize(): Promise<void> {
    if (this.initialized && !this.initPromise) return
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      try {
        for (const type of Object.keys(this.STORES) as (keyof typeof this.STORES)[]) {
          try {
            const entry: CacheEntry<any[]> | undefined = await idb.get(this.STORES[type], 'all')
            if (entry && Array.isArray(entry.data)) {
              this.mem[type] = entry.data
              this.setMeta(type, entry)
              // Limpiar claves antiguas pesadas en localStorage
              try { localStorage.removeItem(this.OLD_KEYS[type]) } catch {}
            }
          } catch (e) {
            console.warn(`No se pudo cargar cache IndexedDB para ${type}`, e)
          }
        }
      } finally {
        this.initialized = true
        this.initPromise = null
      }
    })()
    return this.initPromise
  }

  // Obtener metadatos
  private getMeta(type: keyof typeof this.STORES): { timestamp: number; version: string; count: number } | null {
    try {
      const raw = localStorage.getItem(this.META_KEYS[type])
      if (!raw) return null
      const meta = JSON.parse(raw)
      return meta && typeof meta.timestamp === 'number' && typeof meta.version === 'string' && typeof meta.count === 'number'
        ? meta
        : null
    } catch {
      return null
    }
  }

  private setMeta(type: keyof typeof this.STORES, entry: CacheEntry<any[]>): void {
    const meta = {
      timestamp: entry.timestamp,
      version: entry.version,
      count: Array.isArray(entry.data) ? entry.data.length : 0
    }
    try {
      localStorage.setItem(this.META_KEYS[type], JSON.stringify(meta))
    } catch (e) {
      console.warn(`No se pudieron guardar metadatos ${String(type)} en localStorage`, e)
    }
  }

  // Obtener datos del cache (desde memoria si no expirado)
  private getFromCache<T>(type: keyof typeof this.STORES): T[] | null {
    const meta = this.getMeta(type)
    if (!meta) return null
    const now = Date.now()
    const isExpired = (now - meta.timestamp) > this.CACHE_DURATION
    const isVersionValid = meta.version === this.VERSION
    if (isExpired || !isVersionValid) return null
    const data = this.mem[type] as T[]
    if (Array.isArray(data) && data.length === meta.count) {
      console.log(`Cache hit para ${String(type)}: ${data.length} elementos`)
      return data
    }
    return null
  }

  // Guardar datos en el cache: memoria + IndexedDB + metadatos
  private saveToCache<T>(type: keyof typeof this.STORES, data: T[]): void {
    const entry: CacheEntry<T[]> = {
      data,
      timestamp: Date.now(),
      version: this.VERSION
    }
    // Actualizar memoria
    this.mem[type] = data as any[]
    this.setMeta(type, entry as CacheEntry<any[]>)
    // Persistir en IndexedDB (async, sin bloquear)
    idb.set(this.STORES[type], 'all', entry).then(() => {
      console.log(`Cache IndexedDB actualizado para ${String(type)}: ${data.length} elementos`)
    }).catch((error) => {
      console.error(`Error al guardar cache ${String(type)} en IndexedDB:`, error)
    })
  }

  // Métodos públicos para cada tipo de dato
  getProductos(): any[] | null {
    return this.getFromCache('productos')
  }

  setProductos(productos: any[]): void {
    this.saveToCache('productos', productos)
  }

  getSocios(): any[] | null {
    return this.getFromCache('socios')
  }

  setSocios(socios: any[]): void {
    this.saveToCache('socios', socios)
  }

  getFincas(): any[] | null {
    return this.getFromCache('fincas')
  }

  setFincas(fincas: any[]): void {
    this.saveToCache('fincas', fincas)
  }

  getTecnicos(): any[] | null {
    return this.getFromCache('tecnicos')
  }

  setTecnicos(tecnicos: any[]): void {
    this.saveToCache('tecnicos', tecnicos)
  }

  getAbonos(): any[] | null {
    return this.getFromCache('abonos')
  }

  setAbonos(abonos: any[]): void {
    this.saveToCache('abonos', abonos)
  }

  // Verificar si necesita actualización (cache expirado o no existe)
  needsUpdate(type: 'productos' | 'socios' | 'fincas' | 'tecnicos' | 'abonos'): boolean {
    const meta = this.getMeta(type)
    if (!meta) return true
    const now = Date.now()
    const isExpired = (now - meta.timestamp) > this.CACHE_DURATION
    const isVersionValid = meta.version === this.VERSION
    return isExpired || !isVersionValid
  }

  // Obtener estadísticas del cache
  getStats(): CacheStats {
    const stats: CacheStats = {
      productos: { count: 0, lastUpdate: null },
      socios: { count: 0, lastUpdate: null },
      fincas: { count: 0, lastUpdate: null },
      tecnicos: { count: 0, lastUpdate: null },
      abonos: { count: 0, lastUpdate: null }
    }
    ;(Object.keys(this.STORES) as (keyof typeof this.STORES)[]).forEach((type: keyof typeof this.STORES) => {
      const meta = this.getMeta(type)
      if (meta) {
        const isExpired = (Date.now() - meta.timestamp) > this.CACHE_DURATION
        const isVersionValid = meta.version === this.VERSION
        if (!isExpired && isVersionValid) {
          stats[type as keyof CacheStats] = {
            count: meta.count,
            lastUpdate: new Date(meta.timestamp)
          }
        }
      }
    })

    return stats
  }

  // Limpiar caches expirados
  clearExpiredCaches(): void {
    (Object.keys(this.STORES) as (keyof typeof this.STORES)[]).forEach(async (type: keyof typeof this.STORES) => {
      const meta = this.getMeta(type)
      const key = this.META_KEYS[type]
      if (!meta) return
      const now = Date.now()
      const isExpired = (now - meta.timestamp) > this.CACHE_DURATION
      const isVersionValid = meta.version === this.VERSION
      if (isExpired || !isVersionValid) {
        try {
          await idb.clear(this.STORES[type])
        } catch {}
        localStorage.removeItem(key)
        this.mem[type] = []
        console.log(`Cache expirado eliminado: ${String(type)}`)
      }
    })
  }

  // Limpiar todo el cache
  clearAll(): void {
    (Object.keys(this.STORES) as (keyof typeof this.STORES)[]).forEach(async (type: keyof typeof this.STORES) => {
      try { await idb.clear(this.STORES[type]) } catch {}
      localStorage.removeItem(this.META_KEYS[type])
      this.mem[type] = []
    })
    console.log('Todo el cache ha sido eliminado')
  }

  // Obtener el tiempo restante hasta la expiración (en minutos)
  getTimeToExpiration(type: 'productos' | 'socios' | 'fincas' | 'tecnicos' | 'abonos'): number | null {
    const meta = this.getMeta(type)
    if (!meta) return null
    const now = Date.now()
    const expirationTime = meta.timestamp + this.CACHE_DURATION
    const timeLeft = expirationTime - now
    return timeLeft > 0 ? Math.floor(timeLeft / (60 * 1000)) : 0
  }
}

// Exportar instancia singleton
export const cacheService = new CacheService()
export { CacheService }