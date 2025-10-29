/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import { ref, onMounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  const showInstallPrompt = ref(false);
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);

  // Verificar si la app ya está instalada
  const checkIfInstalled = () => {
    // Verificar si está ejecutándose como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isInWebAppChrome = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    isInstalled.value = isStandalone || isInWebAppiOS || isInWebAppChrome;
    
    // También verificar localStorage para recordar instalaciones previas
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    if (wasInstalled) {
      isInstalled.value = true;
    }
  };

  // Manejar el evento beforeinstallprompt
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt.value = e as BeforeInstallPromptEvent;
    isInstallable.value = true;
    
    // Mostrar el prompt después de un pequeño delay si no está instalado
    if (!isInstalled.value) {
      setTimeout(() => {
        const promptDismissed = localStorage.getItem('pwa-prompt-dismissed');
        const lastPromptTime = localStorage.getItem('pwa-last-prompt-time');
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        // Mostrar prompt si nunca se ha mostrado o ha pasado más de un día
        if (!promptDismissed || (lastPromptTime && (now - parseInt(lastPromptTime)) > dayInMs)) {
          showInstallPrompt.value = true;
        }
      }, 3000); // Esperar 3 segundos después de cargar la página
    }
  };

  // Instalar la PWA
  const installPWA = async () => {
    if (!deferredPrompt.value) return;

    try {
      await deferredPrompt.value.prompt();
      const choiceResult = await deferredPrompt.value.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario aceptó la instalación');
        localStorage.setItem('pwa-installed', 'true');
        isInstalled.value = true;
      } else {
        console.log('Usuario rechazó la instalación');
        localStorage.setItem('pwa-prompt-dismissed', 'true');
        localStorage.setItem('pwa-last-prompt-time', Date.now().toString());
      }
      
      showInstallPrompt.value = false;
      deferredPrompt.value = null;
      isInstallable.value = false;
    } catch (error) {
      console.error('Error durante la instalación:', error);
    }
  };

  // Cerrar el prompt de instalación
  const dismissInstallPrompt = () => {
    showInstallPrompt.value = false;
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    localStorage.setItem('pwa-last-prompt-time', Date.now().toString());
  };

  // Mostrar manualmente el prompt de instalación
  const showInstallDialog = () => {
    if (isInstallable.value && !isInstalled.value) {
      showInstallPrompt.value = true;
    }
  };

  // Verificar actualizaciones del service worker
  const checkForUpdates = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
        }
      });
    }
  };

  onMounted(() => {
    checkIfInstalled();
    
    // Escuchar el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Escuchar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada exitosamente');
      localStorage.setItem('pwa-installed', 'true');
      isInstalled.value = true;
      showInstallPrompt.value = false;
    });

    // Verificar actualizaciones periódicamente
    setInterval(checkForUpdates, 60000); // Cada minuto
  });

  return {
    isInstallable,
    isInstalled,
    showInstallPrompt,
    installPWA,
    dismissInstallPrompt,
    showInstallDialog,
    checkForUpdates
  };
}