import type { NewAlbaranRequest } from '../../api-types/src/index'
import * as idb from './indexedDb'

export interface OfflineAlbaran {
  id: string // UUID temporal
  data: NewAlbaranRequest
  timestamp: number
  type: 'create' | 'update'
  originalAlbaranId?: string // Para updates
  attempts: number
  lastAttempt?: number
}

export interface OfflineStorageStats {
  totalPending: number
  oldestTimestamp: number
  newestTimestamp: number
}

class OfflineStorageService {
  private readonly STORAGE_KEY = 'coagrisan_offline_albaranes'
  private readonly MAX_ATTEMPTS = 3
  private readonly RETRY_DELAY = 5 * 60 * 1000 // 5 minutos

  // Memoria en proceso para mantener API síncrona
  private mem: OfflineAlbaran[] = []
  private initialized = false
  private initPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.initialized && !this.initPromise) return
    if (this.initPromise) return this.initPromise
    
    this.initPromise = (async () => {
      try {
        // Leer único registro 'all' desde IndexedDB
        const entry = await idb.get('offline_albaranes', 'all')
        
        if (entry && Array.isArray(entry.data)) {
          this.mem = entry.data as OfflineAlbaran[]
        } else if (Array.isArray(entry)) {
          // Compatibilidad por si se guardó como array plano
          this.mem = entry as OfflineAlbaran[]
        } else {
          // Migración inicial desde localStorage si existiera
          try {
            const stored = localStorage.getItem(this.STORAGE_KEY)
            const parsed = stored ? JSON.parse(stored) : []
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.mem = parsed as OfflineAlbaran[]
              await idb.set('offline_albaranes', 'all', { data: this.mem, timestamp: Date.now(), version: '1.0.0' })
              localStorage.removeItem(this.STORAGE_KEY)
            }
          } catch (err) {
            console.error('Error en migración offlineStorage:', err)
          }
        }
      } catch (err) {
        console.error('Error inicializando offlineStorage:', err)
      } finally {
        this.initialized = true
        this.initPromise = null
      }
    })()
    return this.initPromise
  }

  // Obtener todos los albaranes offline
  getOfflineAlbaranes(): OfflineAlbaran[] {
    if (!this.initialized) {
      console.warn('offlineStorage no está inicializado, retornando array vacío')
      return []
    }
    return this.mem
  }

  // Guardar albaranes offline
  private async saveOfflineAlbaranes(albaranes: OfflineAlbaran[]): Promise<void> {
    this.mem = albaranes
    
    try {
      // Persistir en IndexedDB
      await idb.set('offline_albaranes', 'all', { data: this.mem, timestamp: Date.now(), version: '1.0.0' })
    } catch (error) {
      console.error('Error al guardar albaranes en IndexedDB:', error)
      throw error
    }
  }

  // Agregar un nuevo albarán offline
  async addOfflineAlbaran(data: NewAlbaranRequest, type: 'create' | 'update' = 'create', originalAlbaranId?: string): Promise<string> {
    // Asegurar que está inicializado antes de guardar
    await this.initialize()
    
    const albaranes = this.getOfflineAlbaranes()
    
    const offlineAlbaran: OfflineAlbaran = {
      id: this.generateUUID(),
      data,
      timestamp: Date.now(),
      type,
      originalAlbaranId,
      attempts: 0
    }

    albaranes.push(offlineAlbaran)
    await this.saveOfflineAlbaranes(albaranes)
    
    console.log(`Albarán guardado offline: ${offlineAlbaran.id}`)
    return offlineAlbaran.id
  }

  // Marcar un albarán como sincronizado (eliminarlo de la lista)
  async markAsSynced(id: string): Promise<void> {
    const albaranes = this.getOfflineAlbaranes()
    const filtered = albaranes.filter(albaran => albaran.id !== id)
    await this.saveOfflineAlbaranes(filtered)
    console.log(`Albarán sincronizado y eliminado: ${id}`)
  }

  // Incrementar intentos de sincronización
  async incrementAttempts(id: string): Promise<void> {
    const albaranes = this.getOfflineAlbaranes()
    const albaran = albaranes.find(a => a.id === id)
    
    if (albaran) {
      albaran.attempts++
      albaran.lastAttempt = Date.now()
      await this.saveOfflineAlbaranes(albaranes)
    }
  }

  // Obtener albaranes pendientes de sincronización
  getPendingSync(): OfflineAlbaran[] {
    const albaranes = this.getOfflineAlbaranes()
    const now = Date.now()
    
    return albaranes.filter(albaran => {
      // No sincronizar si ya se intentó muchas veces
      if (albaran.attempts >= this.MAX_ATTEMPTS) {
        return false
      }
      
      // Si nunca se ha intentado, incluir
      if (!albaran.lastAttempt) {
        return true
      }
      
      // Si ha pasado suficiente tiempo desde el último intento, incluir
      return (now - albaran.lastAttempt) >= this.RETRY_DELAY
    })
  }

  // Obtener estadísticas de almacenamiento offline
  getStats(): OfflineStorageStats {
    const albaranes = this.getOfflineAlbaranes()
    
    if (albaranes.length === 0) {
      return {
        totalPending: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0
      }
    }

    const timestamps = albaranes.map(a => a.timestamp)
    
    return {
      totalPending: albaranes.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps)
    }
  }

  // Limpiar entradas antiguas (más de 30 días)
  async cleanupOldEntries(): Promise<void> {
    const albaranes = this.getOfflineAlbaranes()
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    
    const filtered = albaranes.filter(albaran => albaran.timestamp > thirtyDaysAgo)
    
    if (filtered.length !== albaranes.length) {
      await this.saveOfflineAlbaranes(filtered)
      console.log(`Limpiados ${albaranes.length - filtered.length} albaranes antiguos`)
    }
  }

  // Eliminar un albarán específico (para casos de error irrecuperable)
  async removeOfflineAlbaran(id: string): Promise<void> {
    const albaranes = this.getOfflineAlbaranes()
    const filtered = albaranes.filter(albaran => albaran.id !== id)
    await this.saveOfflineAlbaranes(filtered)
    console.log(`Albarán eliminado: ${id}`)
  }

  // Limpiar todo el almacenamiento offline
  async clearAll(): Promise<void> {
    this.mem = []
    try {
      await idb.clear('offline_albaranes')
      console.log('Almacenamiento offline limpiado')
    } catch (err) {
      console.error('Error al limpiar IndexedDB:', err)
    }
  }

  // Generar UUID simple
  private generateUUID(): string {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // Obtener información legible de un albarán offline
  getAlbaranInfo(albaran: OfflineAlbaran): string {
    const date = new Date(albaran.timestamp).toLocaleString()
    const socioId = albaran.data.general.socioId
    const fincaId = albaran.data.general.fincaId
    const type = albaran.type === 'create' ? 'Nuevo' : 'Actualización'
    
    return `${type} - Socio: ${socioId}, Finca: ${fincaId} (${date})`
  }
}

// Exportar instancia singleton
export const offlineStorage = new OfflineStorageService()

// Exportar también la clase para testing
export { OfflineStorageService }