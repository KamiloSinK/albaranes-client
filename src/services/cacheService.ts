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
  private readonly CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 horas en milisegundos
  private readonly REFRESH_CHECK_INTERVAL = 15 * 60 * 1000 // Verificar cada 15 minutos
  private readonly VERSION = '1.0.0'
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null

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
              // Carga desde IndexedDB: datos grandes permanecen fuera de localStorage
              this.mem[type] = entry.data
              this.setMeta(type, entry)
              // Limpieza defensiva de claves antiguas pesadas en localStorage
              try { localStorage.removeItem(this.OLD_KEYS[type]) } catch {}
            } else {
              // Migración desde claves antiguas en localStorage si existen
              const rawLegacy = localStorage.getItem(this.OLD_KEYS[type])
              if (rawLegacy) {
                try {
                  const parsed = JSON.parse(rawLegacy)
                  const legacyData = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : [])
                  if (legacyData && legacyData.length > 0) {
                    const newEntry: CacheEntry<any[]> = {
                      data: legacyData,
                      timestamp: Date.now(),
                      version: this.VERSION
                    }
                    await idb.set(this.STORES[type], 'all', newEntry)
                    this.mem[type] = legacyData
                    this.setMeta(type, newEntry)
                  }
                } catch (mErr) {
                  console.warn(`No se pudo migrar cache legacy de ${String(type)}`, mErr)
                } finally {
                  // Retirar siempre la clave antigua para evitar payloads grandes en localStorage
                  try { localStorage.removeItem(this.OLD_KEYS[type]) } catch {}
                }
              }
            }
          } catch (e) {
            console.error(`Error cargando cache para ${String(type)}:`, e)
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
    // Si no está inicializado, devolver array vacío pero advertir
    if (!this.initialized) {
      console.warn(`cacheService.getFromCache(${String(type)}) llamado antes de inicializar - retornando []`)
      return []
    }

    const meta = this.getMeta(type)
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false

    // Si no hay metadatos
    if (!meta) {
      // En modo offline, devolver lo que haya en memoria aunque no haya meta
      if (offline) {
        const memData = this.mem[type] as T[]
        if (Array.isArray(memData) && memData.length > 0) {
          console.log(`Cache (sin meta) servido en modo offline para ${String(type)}: ${memData.length} elementos`)
          return memData
        }
      }
      return null
    }

    const now = Date.now()
    const isExpired = (now - meta.timestamp) > this.CACHE_DURATION
    const isVersionValid = meta.version === this.VERSION

    // En modo offline, servir siempre lo que esté en memoria, incluso si expirado o versión distinta
    if (offline) {
      const memData = this.mem[type] as T[]
      if (Array.isArray(memData) && memData.length > 0) {
        console.log(`Cache servido en modo offline para ${String(type)} (expirado=${isExpired}, versionValida=${isVersionValid}): ${memData.length} elementos`)
        return memData
      }
    }

    // Modo online: validar expiración y versión
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
    idb.set(this.STORES[type], 'all', entry).catch((error) => {
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
    // Eliminar también claves legacy en localStorage por seguridad
    try {
      (Object.keys(this.OLD_KEYS) as (keyof typeof this.OLD_KEYS)[]).forEach((type) => {
        localStorage.removeItem(this.OLD_KEYS[type])
      })
    } catch {}
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

  // Refrescar todos los caches expirados desde la API (llamar al inicio de la app)
  async refreshExpiredCaches(): Promise<void> {
    // Solo refrescar si estamos online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return
    }

    const types = ['socios', 'fincas', 'tecnicos', 'productos', 'abonos'] as const
    
    for (const type of types) {
      if (this.needsUpdate(type)) {
        try {
          await this.refreshCacheFromApi(type)
        } catch (err) {
          console.error(`Error refrescando cache de ${type}:`, err)
        }
      }
    }
  }

  // Refrescar un cache específico desde la API
  private async refreshCacheFromApi(type: 'socios' | 'fincas' | 'tecnicos' | 'productos' | 'abonos'): Promise<void> {
    const apiHost = import.meta.env.VITE_API_HOST || ''
    const endpoints: Record<string, string> = {
      socios: '/socios',
      fincas: '/fincas',
      tecnicos: '/tecnicos',
      productos: '/productos',
      abonos: '/abonos'
    }

    const url = `${apiHost}${endpoints[type]}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        
        if (Array.isArray(data)) {
          this.saveToCache(type, data)
        }
      }
    } catch (error) {
      console.error(`Error refrescando cache de ${type}:`, error)
    }
  }

  // Iniciar verificación periódica de cache (cada 15 minutos)
  startPeriodicRefresh(): void {
    if (this.refreshIntervalId) return // Ya está corriendo
    
    console.log('Iniciando verificación periódica de cache (cada 15 min)')
    this.refreshIntervalId = setInterval(() => {
      console.log('Verificación periódica de cache...')
      this.refreshExpiredCaches()
    }, this.REFRESH_CHECK_INTERVAL)

    // También escuchar cuando el usuario vuelve a estar online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
    }
  }

  // Detener verificación periódica
  stopPeriodicRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId)
      this.refreshIntervalId = null
      console.log('Verificación periódica de cache detenida')
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
    }
  }

  // Handler para cuando el usuario vuelve a estar online
  private handleOnline = (): void => {
    console.log('Conexión restaurada - verificando caches...')
    this.refreshExpiredCaches()
  }
}

// Exportar instancia singleton
export const cacheService = new CacheService()
export { CacheService }