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

class CacheService {
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 horas en milisegundos
  private readonly VERSION = '1.0.0'

  // Claves para localStorage
  private readonly KEYS = {
    productos: 'coagrisan_cache_productos',
    socios: 'coagrisan_cache_socios',
    fincas: 'coagrisan_cache_fincas',
    tecnicos: 'coagrisan_cache_tecnicos',
    abonos: 'coagrisan_cache_abonos'
  }

  // Verificar si el cache es válido (no ha expirado)
  private isCacheValid(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    const isExpired = (now - entry.timestamp) > this.CACHE_DURATION
    const isVersionValid = entry.version === this.VERSION
    
    return !isExpired && isVersionValid
  }

  // Obtener datos del cache
  private getFromCache<T>(key: string): T[] | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      const entry: CacheEntry<T[]> = JSON.parse(stored)
      
      if (this.isCacheValid(entry)) {
        console.log(`Cache hit para ${key}: ${entry.data.length} elementos`)
        return entry.data
      } else {
        console.log(`Cache expirado para ${key}, eliminando...`)
        localStorage.removeItem(key)
        return null
      }
    } catch (error) {
      console.error(`Error al leer cache ${key}:`, error)
      localStorage.removeItem(key)
      return null
    }
  }

  // Guardar datos en el cache
  private saveToCache<T>(key: string, data: T[]): void {
    try {
      const entry: CacheEntry<T[]> = {
        data,
        timestamp: Date.now(),
        version: this.VERSION
      }
      
      localStorage.setItem(key, JSON.stringify(entry))
      console.log(`Cache actualizado para ${key}: ${data.length} elementos`)
    } catch (error) {
      console.error(`Error al guardar cache ${key}:`, error)
      // Si hay error de espacio, intentar limpiar caches antiguos
      this.clearExpiredCaches()
    }
  }

  // Métodos públicos para cada tipo de dato
  getProductos(): any[] | null {
    return this.getFromCache(this.KEYS.productos)
  }

  setProductos(productos: any[]): void {
    this.saveToCache(this.KEYS.productos, productos)
  }

  getSocios(): any[] | null {
    return this.getFromCache(this.KEYS.socios)
  }

  setSocios(socios: any[]): void {
    this.saveToCache(this.KEYS.socios, socios)
  }

  getFincas(): any[] | null {
    return this.getFromCache(this.KEYS.fincas)
  }

  setFincas(fincas: any[]): void {
    this.saveToCache(this.KEYS.fincas, fincas)
  }

  getTecnicos(): any[] | null {
    return this.getFromCache(this.KEYS.tecnicos)
  }

  setTecnicos(tecnicos: any[]): void {
    this.saveToCache(this.KEYS.tecnicos, tecnicos)
  }

  getAbonos(): any[] | null {
    return this.getFromCache(this.KEYS.abonos)
  }

  setAbonos(abonos: any[]): void {
    this.saveToCache(this.KEYS.abonos, abonos)
  }

  // Verificar si necesita actualización (cache expirado o no existe)
  needsUpdate(type: 'productos' | 'socios' | 'fincas' | 'tecnicos' | 'abonos'): boolean {
    const key = this.KEYS[type]
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return true

      const entry: CacheEntry<any[]> = JSON.parse(stored)
      return !this.isCacheValid(entry)
    } catch {
      return true
    }
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

    Object.entries(this.KEYS).forEach(([type, key]) => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const entry: CacheEntry<any[]> = JSON.parse(stored)
          // Solo contar si el cache es válido (no expirado)
          if (this.isCacheValid(entry)) {
            stats[type as keyof CacheStats] = {
              count: entry.data.length,
              lastUpdate: new Date(entry.timestamp)
            }
          }
        }
      } catch (error) {
        console.error(`Error al obtener stats para ${type}:`, error)
      }
    })

    return stats
  }

  // Limpiar caches expirados
  clearExpiredCaches(): void {
    Object.values(this.KEYS).forEach(key => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const entry: CacheEntry<any[]> = JSON.parse(stored)
          if (!this.isCacheValid(entry)) {
            localStorage.removeItem(key)
            console.log(`Cache expirado eliminado: ${key}`)
          }
        }
      } catch (error) {
        localStorage.removeItem(key)
        console.log(`Cache corrupto eliminado: ${key}`)
      }
    })
  }

  // Limpiar todo el cache
  clearAll(): void {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('Todo el cache ha sido eliminado')
  }

  // Obtener el tiempo restante hasta la expiración (en minutos)
  getTimeToExpiration(type: 'productos' | 'socios' | 'fincas' | 'tecnicos' | 'abonos'): number | null {
    const key = this.KEYS[type]
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      const entry: CacheEntry<any[]> = JSON.parse(stored)
      const now = Date.now()
      const expirationTime = entry.timestamp + this.CACHE_DURATION
      const timeLeft = expirationTime - now

      return timeLeft > 0 ? Math.floor(timeLeft / (60 * 1000)) : 0
    } catch {
      return null
    }
  }
}

// Exportar instancia singleton
export const cacheService = new CacheService()
export { CacheService }