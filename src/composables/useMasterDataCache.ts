/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import { ref, computed } from 'vue'
import { useNetworkStatus } from './useNetworkStatus'
import { cacheService, type CacheStats } from '@/services/cacheService'
import * as productos from '@/services/productos'
import * as socios from '@/services/socios'
import * as fincas from '@/services/fincas'
import * as tecnicos from '@/services/tecnicos'
import * as abonos from '@/services/abonos'

export function useMasterDataCache() {
  const { isOnline } = useNetworkStatus()
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const loadingProgress = ref({ current: 0, total: 5 })
  const lastSyncAttempt = ref<Date | null>(null)
  const syncErrors = ref<string[]>([])

  // Estadísticas del cache
  const cacheStats = ref<CacheStats>(cacheService.getStats())

  // Computed para verificar si hay datos en cache
  const hasCachedData = computed(() => {
    const stats = cacheStats.value
    return stats.productos.count > 0 && 
           stats.socios.count > 0 && 
           stats.fincas.count > 0 && 
           stats.tecnicos.count > 0 &&
           stats.abonos.count > 0
  })

  // Verificar si necesita actualización
  const needsUpdate = computed(() => {
    return cacheService.needsUpdate('productos') ||
           cacheService.needsUpdate('socios') ||
           cacheService.needsUpdate('fincas') ||
           cacheService.needsUpdate('tecnicos') ||
           cacheService.needsUpdate('abonos')
  })

  // Cargar productos
  const loadProductos = async (): Promise<boolean> => {
    try {
      console.log('Cargando productos...')
      const response = await productos.retrieveProductos({ limit: 999999 })
      
      if (response.ok) {
        const data = await response.json()
        cacheService.setProductos(data)
        return true
      } else {
        throw new Error(`Error HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
      syncErrors.value.push(`Productos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return false
    }
  }

  // Cargar socios
  const loadSocios = async (): Promise<boolean> => {
    try {
      console.log('Cargando socios...')
      const response = await socios.retrieveSocios({ limit: 999999 })
      
      if (response.ok) {
        const data = await response.json()
        cacheService.setSocios(data)
        return true
      } else {
        throw new Error(`Error HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error cargando socios:', error)
      syncErrors.value.push(`Socios: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return false
    }
  }

  // Cargar fincas
  const loadFincas = async (): Promise<boolean> => {
    try {
      console.log('Cargando fincas...')
      const response = await fincas.retrieveFincas({ limit: 999999 })
      
      if (response.ok) {
        const data = await response.json()
        cacheService.setFincas(data)
        return true
      } else {
        throw new Error(`Error HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error cargando fincas:', error)
      syncErrors.value.push(`Fincas: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return false
    }
  }

  // Cargar técnicos
  const loadTecnicos = async (): Promise<boolean> => {
    try {
      console.log('Cargando técnicos...')
      const response = await tecnicos.retrieveTecnicos({ limit: 999999 })
      
      if (response.ok) {
        const data = await response.json()
        cacheService.setTecnicos(data)
        return true
      } else {
        throw new Error(`Error HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error cargando técnicos:', error)
      syncErrors.value.push(`Técnicos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return false
    }
  }

  // Cargar abonos
  const loadAbonos = async (): Promise<boolean> => {
    try {
      console.log('Cargando abonos...')
      const response = await abonos.retrieveAbonos({ limit: 999999 })
      
      if (response.ok) {
        const data = await response.json()
        cacheService.setAbonos(data)
        return true
      } else {
        throw new Error(`Error HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error cargando abonos:', error)
      syncErrors.value.push(`Abonos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return false
    }
  }

  // Función principal para cargar todos los datos maestros
  const loadMasterData = async (force: boolean = false): Promise<void> => {
    if (isLoading.value) {
      console.log('Ya hay una carga en progreso')
      return
    }

    // Actualizar estadísticas del cache al inicio
    cacheStats.value = cacheService.getStats()
    
    // Verificar si realmente necesita actualización
    const needsUpdateCheck = needsUpdate.value
    const hasCachedDataCheck = hasCachedData.value
    
    console.log('📊 Estado del cache:', {
      needsUpdate: needsUpdateCheck,
      hasCachedData: hasCachedDataCheck,
      isOnline: isOnline.value,
      force: force
    })

    // Si no hay conexión, usar datos del cache
    if (!isOnline.value) {
      if (hasCachedDataCheck) {
        console.log('💾 Sin conexión - usando datos del cache existente')
      } else {
        console.warn('⚠️ Sin conexión y sin datos en cache')
      }
      isInitialized.value = true
      return
    }

    // Si hay conexión, verificar si necesita actualización
    if (!force && !needsUpdateCheck && hasCachedDataCheck) {
      console.log('✅ Cache válido y con datos - no es necesario actualizar')
      
      // Mostrar tiempo restante de vigencia
      const expirationInfo = getExpirationInfo()
      const minTimeLeft = Math.min(
        expirationInfo.productos || 0,
        expirationInfo.socios || 0,
        expirationInfo.fincas || 0,
        expirationInfo.tecnicos || 0,
        expirationInfo.abonos || 0
      )
      
      if (minTimeLeft > 0) {
        console.log(`⏰ Cache válido por ${minTimeLeft} minutos más`)
      }
      
      isInitialized.value = true
      return
    }

    isLoading.value = true
    loadingProgress.value = { current: 0, total: 5 }
    syncErrors.value = []
    lastSyncAttempt.value = new Date()

    // Explicar por qué se está actualizando
    if (force) {
      console.log('🔄 Forzando actualización de datos maestros...')
    } else if (!hasCachedDataCheck) {
      console.log('📥 Cargando datos maestros por primera vez...')
    } else if (needsUpdateCheck) {
      console.log('🔄 Actualizando datos maestros (cache expirado)...')
    }

    const loadTasks = [
      { name: 'Productos', task: loadProductos },
      { name: 'Socios', task: loadSocios },
      { name: 'Fincas', task: loadFincas },
      { name: 'Técnicos', task: loadTecnicos },
      { name: 'Abonos', task: loadAbonos }
    ]

    let successCount = 0
    let errorCount = 0

    for (const { name, task } of loadTasks) {
      loadingProgress.value.current++
      console.log(`Cargando ${name}... (${loadingProgress.value.current}/${loadingProgress.value.total})`)
      
      const success = await task()
      
      if (success) {
        successCount++
      } else {
        errorCount++
      }

      // Pequeña pausa entre cargas para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    isLoading.value = false
    isInitialized.value = true
    
    // Actualizar estadísticas
    cacheStats.value = cacheService.getStats()
    
    // Mostrar resultado detallado
    if (errorCount === 0) {
      console.log(`✅ Carga completada exitosamente: ${successCount}/${loadTasks.length} servicios`)
      console.log('📊 Datos cargados:', {
        productos: cacheStats.value.productos.count,
        socios: cacheStats.value.socios.count,
        fincas: cacheStats.value.fincas.count,
        tecnicos: cacheStats.value.tecnicos.count,
        abonos: cacheStats.value.abonos.count
      })
    } else {
      console.warn(`⚠️ Carga completada con errores: ${successCount}/${loadTasks.length} exitosos, ${errorCount} errores`)
      if (syncErrors.value.length > 0) {
        console.error('Errores encontrados:', syncErrors.value)
      }
    }

    // Limpiar caches expirados después de la carga
    cacheService.clearExpiredCaches()
  }

  // Obtener datos desde cache o API
  const getProductos = (): any[] => {
    const cached = cacheService.getProductos()
    if (cached) return cached
    
    console.warn('No hay productos en cache')
    return []
  }

  const getSocios = (): any[] => {
    const cached = cacheService.getSocios()
    if (cached) return cached
    
    console.warn('No hay socios en cache')
    return []
  }

  const getFincas = (): any[] => {
    const cached = cacheService.getFincas()
    if (cached) return cached
    
    console.warn('No hay fincas en cache')
    return []
  }

  const getTecnicos = (): any[] => {
    const cached = cacheService.getTecnicos()
    if (cached) return cached
    
    console.warn('No hay técnicos en cache')
    return []
  }

  const getAbonos = (): any[] => {
    const cached = cacheService.getAbonos()
    if (cached) return cached
    
    console.warn('No hay abonos en cache')
    return []
  }

  // Limpiar todo el cache
  const clearCache = (): void => {
    cacheService.clearAll()
    cacheStats.value = cacheService.getStats()
    console.log('Cache limpiado')
  }

  // Obtener información de expiración
  const getExpirationInfo = () => {
    return {
      productos: cacheService.getTimeToExpiration('productos'),
      socios: cacheService.getTimeToExpiration('socios'),
      fincas: cacheService.getTimeToExpiration('fincas'),
      tecnicos: cacheService.getTimeToExpiration('tecnicos'),
      abonos: cacheService.getTimeToExpiration('abonos')
    }
  }

  return {
    // Estado
    isLoading,
    isInitialized,
    loadingProgress,
    lastSyncAttempt,
    syncErrors,
    cacheStats,
    hasCachedData,
    needsUpdate,

    // Métodos
    loadMasterData,
    getProductos,
    getSocios,
    getFincas,
    getTecnicos,
    getAbonos,
    clearCache,
    getExpirationInfo
  }
}