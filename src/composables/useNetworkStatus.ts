import { ref, onMounted, onUnmounted } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)
  const isOffline = ref(!navigator.onLine)
  let pollingInterval: number | null = null

  // Función para verificar conexión real a internet usando múltiples métodos
  const checkInternetConnection = async (): Promise<boolean> => {
    // Primero verificar navigator.onLine
    if (!navigator.onLine) {
      console.log('Navigator indica offline')
      return false;
    }

    try {
      // Verificar conexión real usando una imagen pequeña
      const img = new Image();
      const imageTest = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('Timeout en verificación de imagen')
          resolve(false);
        }, 3000);
        
        img.onload = () => {
          console.log('Imagen cargada - hay internet')
          clearTimeout(timeout);
          resolve(true);
        };
        
        img.onerror = () => {
          console.log('Error cargando imagen - sin internet')
          clearTimeout(timeout);
          resolve(false);
        };
        
        // Usar un timestamp para evitar cache
        img.src = `https://www.google.com/favicon.ico?t=${Date.now()}`;
      });

      const result = await imageTest;
      return result;
    } catch (error) {
      console.log('Error en verificación de internet:', error)
      return false;
    }
  };

  // Función simple usando navigator.onLine
  const checkConnectionWithNavigator = async (): Promise<boolean> => {
    return navigator.onLine;
  };

  // Función avanzada para verificar conexión real a internet (opcional)
  const checkRealInternetAccess = async (): Promise<boolean> => {
    return await checkInternetConnection();
  };

  // Función principal para verificar conexión a internet
  const checkConnection = async (): Promise<boolean> => {
    return await checkInternetConnection();
  };

  // Función para actualizar el estado
  const updateOnlineStatus = async () => {
    try {
      const connected = await checkConnection();
      const wasOnline = isOnline.value;
      
      isOnline.value = connected;
      isOffline.value = !connected;
      
      // Log para debugging
      if (wasOnline !== connected) {
        console.log(`Estado de conexión cambió: ${connected ? 'ONLINE' : 'OFFLINE'}`);
      }
    } catch (error) {
      // En caso de error, asumir que estamos offline
      console.warn('Error checking connection status:', error);
      isOnline.value = false;
      isOffline.value = true;
    }
  };

  // Función para iniciar polling periódico
  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Verificar conexión cada 5 segundos
    pollingInterval = setInterval(async () => {
      await updateOnlineStatus();
    }, 5000);
  };

  // Función para detener polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // Event listeners para cambios de conexión
  const handleOnline = () => {
    console.log('Evento online detectado');
    updateOnlineStatus();
  }

  const handleOffline = () => {
    console.log('Evento offline detectado');
    isOnline.value = false;
    isOffline.value = true;
  }

  onMounted(() => {
    // Verificar estado inicial
    updateOnlineStatus();

    // Iniciar polling periódico
    startPolling();

    // Agregar event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  })

  onUnmounted(() => {
    // Detener polling
    stopPolling();
    
    // Limpiar event listeners
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  })

  return {
    isOnline,
    isOffline,
    checkConnection,
    checkInternetConnection,
    checkRealInternetAccess
  }
}