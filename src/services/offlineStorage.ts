import type { NewAlbaranRequest } from '../../../api-types/src/index'

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

  // Obtener todos los albaranes offline
  getOfflineAlbaranes(): OfflineAlbaran[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error al leer albaranes offline:', error)
      return []
    }
  }

  // Guardar albaranes offline
  private saveOfflineAlbaranes(albaranes: OfflineAlbaran[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(albaranes))
    } catch (error) {
      console.error('Error al guardar albaranes offline:', error)
      // Si hay error de espacio, intentar limpiar albaranes antiguos
      this.cleanupOldEntries()
    }
  }

  // Agregar un nuevo albarán offline
  addOfflineAlbaran(data: NewAlbaranRequest, type: 'create' | 'update' = 'create', originalAlbaranId?: string): string {
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
    this.saveOfflineAlbaranes(albaranes)
    
    console.log(`Albarán guardado offline: ${offlineAlbaran.id}`)
    return offlineAlbaran.id
  }

  // Marcar un albarán como sincronizado (eliminarlo de la lista)
  markAsSynced(id: string): void {
    const albaranes = this.getOfflineAlbaranes()
    const filtered = albaranes.filter(albaran => albaran.id !== id)
    this.saveOfflineAlbaranes(filtered)
    console.log(`Albarán sincronizado y eliminado: ${id}`)
  }

  // Incrementar intentos de sincronización
  incrementAttempts(id: string): void {
    const albaranes = this.getOfflineAlbaranes()
    const albaran = albaranes.find(a => a.id === id)
    
    if (albaran) {
      albaran.attempts++
      albaran.lastAttempt = Date.now()
      this.saveOfflineAlbaranes(albaranes)
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
  cleanupOldEntries(): void {
    const albaranes = this.getOfflineAlbaranes()
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    
    const filtered = albaranes.filter(albaran => albaran.timestamp > thirtyDaysAgo)
    
    if (filtered.length !== albaranes.length) {
      this.saveOfflineAlbaranes(filtered)
      console.log(`Limpiados ${albaranes.length - filtered.length} albaranes antiguos`)
    }
  }

  // Eliminar un albarán específico (para casos de error irrecuperable)
  removeOfflineAlbaran(id: string): void {
    const albaranes = this.getOfflineAlbaranes()
    const filtered = albaranes.filter(albaran => albaran.id !== id)
    this.saveOfflineAlbaranes(filtered)
    console.log(`Albarán eliminado: ${id}`)
  }

  // Limpiar todo el almacenamiento offline
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('Almacenamiento offline limpiado')
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