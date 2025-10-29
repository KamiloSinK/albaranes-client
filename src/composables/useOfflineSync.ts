import { ref, watch, onMounted } from 'vue'
import { useNetworkStatus } from './useNetworkStatus'
import { offlineStorage, type OfflineAlbaran } from '@/services/offlineStorage'
import * as albaranes from '@/services/albaranes'

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus()
  const isSyncing = ref(false)
  const syncProgress = ref({ current: 0, total: 0 })
  const lastSyncAttempt = ref<Date | null>(null)
  const syncErrors = ref<string[]>([])

  // Función para sincronizar un albarán específico
  const syncSingleAlbaran = async (offlineAlbaran: OfflineAlbaran): Promise<boolean> => {
    try {
      if (offlineAlbaran.type === 'create') {
        // Crear nuevo albarán
        const response = await albaranes.newAlbaran(offlineAlbaran.data)
        
        if (response.ok) {
          offlineStorage.markAsSynced(offlineAlbaran.id)
          console.log(`Albarán creado exitosamente: ${offlineAlbaran.id}`)
          return true
        } else {
          throw new Error(`Error HTTP ${response.status}`)
        }
      } else if (offlineAlbaran.type === 'update' && offlineAlbaran.originalAlbaranId) {
        // Actualizar albarán existente
        const updatable = albaranes.buildPartialUpdates(
          { /* datos originales simulados */ } as any, 
          offlineAlbaran.data
        )
        
        const response = await albaranes.updateAlbaran(offlineAlbaran.originalAlbaranId, updatable)
        
        if (response.ok) {
          offlineStorage.markAsSynced(offlineAlbaran.id)
          console.log(`Albarán actualizado exitosamente: ${offlineAlbaran.id}`)
          return true
        } else {
          throw new Error(`Error HTTP ${response.status}`)
        }
      }
      
      return false
    } catch (error) {
      console.error(`Error sincronizando albarán ${offlineAlbaran.id}:`, error)
      offlineStorage.incrementAttempts(offlineAlbaran.id)
      
      const errorMsg = `${offlineStorage.getAlbaranInfo(offlineAlbaran)}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      syncErrors.value.push(errorMsg)
      
      return false
    }
  }

  // Función principal de sincronización
  const syncOfflineAlbaranes = async (): Promise<void> => {
    if (isSyncing.value || !isOnline.value) {
      return
    }

    const pendingAlbaranes = offlineStorage.getPendingSync()
    
    if (pendingAlbaranes.length === 0) {
      return
    }

    isSyncing.value = true
    syncProgress.value = { current: 0, total: pendingAlbaranes.length }
    syncErrors.value = []
    lastSyncAttempt.value = new Date()

    console.log(`Iniciando sincronización de ${pendingAlbaranes.length} albaranes offline`)

    let successCount = 0
    let errorCount = 0

    for (const offlineAlbaran of pendingAlbaranes) {
      syncProgress.value.current++
      
      const success = await syncSingleAlbaran(offlineAlbaran)
      
      if (success) {
        successCount++
      } else {
        errorCount++
      }

      // Pequeña pausa entre sincronizaciones para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    isSyncing.value = false
    
    console.log(`Sincronización completada: ${successCount} exitosos, ${errorCount} errores`)

    // Mostrar notificación al usuario si hay resultados
    if (successCount > 0 || errorCount > 0) {
      const message = successCount > 0 
        ? `✅ ${successCount} albarán(es) sincronizado(s) exitosamente` 
        : ''
      const errorMessage = errorCount > 0 
        ? `❌ ${errorCount} albarán(es) con errores de sincronización` 
        : ''
      
      const fullMessage = [message, errorMessage].filter(Boolean).join('\n')
      
      if (fullMessage) {
        // Usar una notificación menos intrusiva que alert
        console.log('Resultado de sincronización:', fullMessage)
        
        // Opcional: mostrar toast notification si está disponible
        if (window.showToast) {
          window.showToast(fullMessage)
        }
      }
    }
  }

  // Función para forzar sincronización manual
  const forcSync = async (): Promise<void> => {
    if (!isOnline.value) {
      alert('No hay conexión a internet disponible')
      return
    }

    await syncOfflineAlbaranes()
  }

  // Función para obtener estadísticas de sincronización
  const getSyncStats = () => {
    const stats = offlineStorage.getStats()
    return {
      ...stats,
      isSyncing: isSyncing.value,
      syncProgress: syncProgress.value,
      lastSyncAttempt: lastSyncAttempt.value,
      hasErrors: syncErrors.value.length > 0,
      errors: syncErrors.value
    }
  }

  // Función para limpiar errores de sincronización
  const clearSyncErrors = () => {
    syncErrors.value = []
  }

  // Observar cambios en el estado de conexión
  watch(isOnline, async (newValue, oldValue) => {
    // Si acabamos de conectarnos (de offline a online)
    if (newValue && !oldValue) {
      console.log('Conexión recuperada, iniciando sincronización automática...')
      
      // Esperar un poco antes de sincronizar para asegurar que la conexión es estable
      setTimeout(async () => {
        await syncOfflineAlbaranes()
      }, 2000)
    }
  })

  // Sincronización periódica cuando hay conexión
  let syncInterval: NodeJS.Timeout | null = null

  onMounted(() => {
    // Intentar sincronizar al montar el componente si hay conexión
    if (isOnline.value) {
      setTimeout(async () => {
        await syncOfflineAlbaranes()
      }, 5000) // Esperar 5 segundos después del montaje
    }

    // Configurar sincronización periódica cada 5 minutos
    syncInterval = setInterval(async () => {
      if (isOnline.value && !isSyncing.value) {
        await syncOfflineAlbaranes()
      }
    }, 5 * 60 * 1000) // 5 minutos
  })

  // Limpiar interval al desmontar
  const cleanup = () => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
  }

  return {
    isSyncing,
    syncProgress,
    lastSyncAttempt,
    syncErrors,
    syncOfflineAlbaranes,
    forcSync,
    getSyncStats,
    clearSyncErrors,
    cleanup
  }
}

// Declaración global para TypeScript (opcional)
declare global {
  interface Window {
    showToast?: (message: string) => void
  }
}