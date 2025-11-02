import { ref, onMounted, onUnmounted } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)
  const isOffline = ref(!navigator.onLine)

  // Función para verificar conexión real a internet
  const checkInternetConnection = async (): Promise<boolean> => {
    try {
      // Intentar conectar con múltiples servicios confiables
      const testUrls = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
        'https://httpbin.org/status/200'
      ];

      console.log('aqui')

      // Probar con el primer URL disponible
      for (const url of testUrls) {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000)
          });
          return true; // Si cualquier petición es exitosa, hay internet
        } catch {
          continue; // Probar con el siguiente URL
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // Función simple usando navigator.onLine
  const checkConnectionWithNavigator = async (): Promise<boolean> => {
    // Usar principalmente navigator.onLine que es confiable para detectar conexión de red
    return navigator.onLine;
  };

  // Función avanzada para verificar conexión real a internet (opcional)
  const checkRealInternetAccess = async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Usar una imagen pequeña con no-cors para evitar problemas de CORS
      const img = new Image();
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        // Usar un timestamp para evitar cache
        img.src = `https://www.google.com/favicon.ico?t=${Date.now()}`;
      });
    } catch {
      return navigator.onLine;
    }
  };

  // Función principal para verificar conexión a internet
  const checkConnection = async (): Promise<boolean> => {
    return await checkConnectionWithNavigator();
  };

  // Función para actualizar el estado
  const updateOnlineStatus = async () => {
    try {
      const connected = await checkConnection();
      isOnline.value = connected;
      isOffline.value = !connected;
    } catch (error) {
      // En caso de error, asumir que estamos offline
      console.warn('Error checking connection status:', error);
      isOnline.value = false;
      isOffline.value = true;
    }
  };

  // Event listeners para cambios de conexión
  const handleOnline = () => {
    updateOnlineStatus()
  }

  const handleOffline = () => {
    isOnline.value = false
    isOffline.value = true
  }

  onMounted(() => {
    // Verificar estado inicial
    updateOnlineStatus()

    // Agregar event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    // Limpiar event listeners
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    isOnline,
    isOffline,
    checkConnection,
    checkInternetConnection,
    checkRealInternetAccess
  }
}