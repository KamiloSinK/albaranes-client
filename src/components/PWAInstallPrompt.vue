<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<template>
  <Dialog
    v-model:visible="showPrompt"
    :modal="true"
    :closable="false"
    :draggable="false"
    class="pwa-install-dialog"
    header="Instalar Aplicación"
    style="width: 90vw; max-width: 400px;"
  >
    <div class="pwa-install-content">
      <div class="pwa-icon">
        <i class="pi pi-mobile" style="font-size: 3rem; color: #4f46e5;"></i>
      </div>
      
      <h3 class="pwa-title">¡Instala Coagrisan!</h3>
      
      <p class="pwa-description">
        Instala nuestra aplicación en tu dispositivo para:
      </p>
      
      <ul class="pwa-benefits">
        <li>
          <i class="pi pi-check-circle"></i>
          Acceso rápido desde tu pantalla de inicio
        </li>
        <li>
          <i class="pi pi-check-circle"></i>
          Funciona sin conexión a internet
        </li>
        <li>
          <i class="pi pi-check-circle"></i>
          Experiencia como aplicación nativa
        </li>
        <li>
          <i class="pi pi-check-circle"></i>
          Notificaciones y sincronización automática
        </li>
      </ul>
    </div>

    <template #footer>
      <div class="pwa-install-actions">
        <Button
          label="Ahora no"
          severity="secondary"
          variant="outlined"
          @click="dismiss"
          class="pwa-dismiss-btn"
        />
        <Button
          label="Instalar"
          severity="primary"
          @click="install"
          class="pwa-install-btn"
        >
          <template #icon>
            <i class="pi pi-download"></i>
          </template>
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'install'): void;
  (e: 'dismiss'): void;
  (e: 'update:visible', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showPrompt = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
});

const install = () => {
  emit('install');
};

const dismiss = () => {
  emit('dismiss');
};
</script>

<style scoped>
.pwa-install-content {
  text-align: center;
  padding: 1rem 0;
}

.pwa-icon {
  margin-bottom: 1rem;
}

.pwa-title {
  color: #1f2937;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.pwa-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.pwa-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  text-align: left;
  padding: 0 2rem;
}

.pwa-benefits li {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  color: #374151;
  font-size: 0.9rem;
}

.pwa-benefits li i {
  color: #10b981;
  margin-right: 0.75rem;
  font-size: 1rem;
}

.pwa-install-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  width: 100%;
}

.pwa-dismiss-btn,
.pwa-install-btn {
  flex: 1;
  max-width: 120px;
}

.pwa-install-btn {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border: none;
}

.pwa-install-btn:hover {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
}

/* Responsive */
@media (max-width: 480px) {
  .pwa-install-actions {
    flex-direction: column;
  }
  
  .pwa-dismiss-btn,
  .pwa-install-btn {
    max-width: none;
  }
}

/* Animaciones */
.pwa-install-dialog :deep(.p-dialog) {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>