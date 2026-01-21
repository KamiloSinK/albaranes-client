<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script lang="ts" setup>
import {ref, onMounted} from "vue";
import type {MenuItem} from "primevue/menuitem";
import AlbaranDialog from "@/albaran/AlbaranDialog.vue";
import ListadoAlbaranesDialog from "@/ListadoAlbaranesDialog.vue";
import ListadoProductosPorSocioDialog from "@/ListadoProductosPorSocioDialog.vue";
import FicheroCuarentenaDialog from "@/FicheroCuarentenaDialog.vue";
import GestionInventarioDialog from "@/GestionInventarioDialog.vue";
import VisitasDialog from "@/VisitasDialog.vue";
import LoginDialog from "@/LoginDialog.vue";
import ConfirmDialog from "primevue/confirmdialog";
import PWAInstallPrompt from "@/components/PWAInstallPrompt.vue";
import { usePWA } from "@/composables/usePWA";
import { useOfflineSync } from "@/composables/useOfflineSync";
import { useNetworkStatus } from "@/composables/useNetworkStatus";
import { useMasterDataCache } from "@/composables/useMasterDataCache";
import { cacheService } from "@/services/cacheService";
import { offlineStorage } from "@/services/offlineStorage";

// PWA functionality
const { 
	isInstallable, 
	isInstalled, 
	showInstallPrompt, 
	installPWA, 
	dismissInstallPrompt, 
	showInstallDialog 
} = usePWA();

// Offline sync functionality
const { 
	isSyncing, 
	syncProgress, 
	getSyncStats, 
	forcSync 
} = useOfflineSync();

// Network status
const { isOnline } = useNetworkStatus();

// Master data cache (solo usamos clearCache para logout)
const { clearCache } = useMasterDataCache();

const dialogVisible = ref({
	"AlbaranDialog": false,
	"ListadoAlbaranesDialog": false,
	"ListadoProductosPorSocioDialog": false,
	"FicheroCuarentenaDialog": false,
	"GestionInventarioDialog": false,
	"VisitasDialog": false,
	"LoginDialog": false
});

function openDialog(dialogName: keyof (typeof dialogVisible.value)): void {
	dialogVisible.value[dialogName] = true;
}

const items = ref<MenuItem[]>([
	{
		label: "Albaranes",
		items: [
			{
				label: "Albaranes",
				command: () => openDialog("AlbaranDialog")
			},
			{
				label: "Listado de Albaranes",
				command: () => openDialog("ListadoAlbaranesDialog")
			},
			{
				label: "Listado de Visitas",
				command: () => openDialog("VisitasDialog")
			},
			{
				label: "Generar fichero de cuarentena",
				command: () => openDialog("FicheroCuarentenaDialog")
			},
			{
				label: "Gestión de inventario",
				command: () => openDialog("GestionInventarioDialog")
			}
/*			{
				label: "Listado de socios/productos",
				command: () => openDialog("ListadoProductosPorSocioDialog")
			}*/
		]
	},
	{
		label: "Instalar App",
		icon: "pi pi-download",
		command: () => showInstallDialog(),
		visible: isInstallable.value && !isInstalled.value
	},
  {
    label: "Cerrar sesión",
    command: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_HOST}/user/logout`, {
        method: "GET",
        credentials: "include",
        mode: "cors"
      });

      if (!response.ok) {
        alert("Error: no se pudo cerrar sesión");
        return;
      }

      // Limpiar datos de sesión persistidos
      try {
        localStorage.removeItem('userRole');
        localStorage.removeItem('role');
        localStorage.removeItem('auth.user');
        localStorage.removeItem('authUser');
        localStorage.removeItem('currentUser');
        // Limpiar caches de datos maestros y almacenamiento offline
        try {
          clearCache();
          offlineStorage.clearAll();
        } catch {}
      } catch {}

      openDialog("LoginDialog");
    }
  }
]);

const cookies = document.cookie.split("; ");
const sessionCookie = cookies.find(cookie => cookie.startsWith("sid="));

if (!sessionCookie) {
	openDialog("LoginDialog");
}

// Inicializar offlineStorage al montar la aplicación
// (cacheService ya se inicializa en main.ts)
onMounted(async () => {
  try {
    await offlineStorage.initialize()
    console.log('OfflineStorage inicializado')
  } catch (e) {
    console.warn('No se pudo inicializar offlineStorage', e)
  }
})

// Al completar el login, refrescar caches expirados
async function onLoginSuccess() {
  // Verificar que ahora existe cookie de sesión
  const cookies = document.cookie.split("; ");
  const sessionCookie = cookies.find(cookie => cookie.startsWith("sid="));
  if (!sessionCookie) {
    console.warn('Login reportado como exitoso pero no se detecta cookie de sesión; se omite carga de cache')
    return
  }

  try {
    // Refrescar caches expirados después del login
    await cacheService.refreshExpiredCaches()
  } catch (e) {
    console.error('Error refrescando caches tras login:', e)
  }
}

</script>

<template>
	<ConfirmDialog></ConfirmDialog>
	<Menubar :model="items" class="main-menu w-full"/>
	
	<!-- Status indicators -->
	<div class="status-bar">
		<!-- Connection status -->
		<div class="status-item" :class="{ 'offline': !isOnline }">
			<i :class="isOnline ? 'pi pi-wifi' : 'pi pi-wifi-off'"></i>
			<span>{{ isOnline ? 'Conectado' : 'Sin conexión' }}</span>
		</div>
		
		
		<!-- Sync status -->
		<div v-if="isSyncing" class="status-item syncing">
			<i class="pi pi-spin pi-spinner"></i>
			<span>Sincronizando... ({{ syncProgress.current }}/{{ syncProgress.total }})</span>
		</div>
		
		<!-- Offline data indicator -->
		<div v-if="getSyncStats().totalPending > 0" class="status-item pending" @click="forcSync" title="Hacer clic para sincronizar manualmente">
			<i class="pi pi-cloud-upload"></i>
			<span>{{ getSyncStats().totalPending }} pendiente(s)</span>
		</div>
	</div>
	
	<div class="centerdiv">
		<Button
			icon="pi pi-receipt"
			iconPos="top"
			label="Albaranes"
			type="button"
			variant="outlined"
			@click="openDialog('AlbaranDialog')"/>
		<Button
			icon="pi pi-file-export"
			iconPos="top"
			label="Generar fichero de cuarentenas"
			type="button"
			variant="outlined"
			@click="openDialog('FicheroCuarentenaDialog')"/>
		<Button
			icon="pi pi-sliders-h"
			iconPos="top"
			label="Gestión de inventario"
			type="button"
			variant="outlined"
			@click="openDialog('GestionInventarioDialog')"/>
	</div>
	<AlbaranDialog v-model:visible="dialogVisible['AlbaranDialog']" />
	<ListadoAlbaranesDialog v-model:visible="dialogVisible['ListadoAlbaranesDialog']" />
	<ListadoProductosPorSocioDialog v-model:visible="dialogVisible['ListadoProductosPorSocioDialog']" />
	<FicheroCuarentenaDialog v-model:visible="dialogVisible['FicheroCuarentenaDialog']" />
	<GestionInventarioDialog v-model:visible="dialogVisible['GestionInventarioDialog']" />
	<VisitasDialog v-model:visible="dialogVisible['VisitasDialog']" />
    <LoginDialog v-model:visible="dialogVisible['LoginDialog']" @login-success="onLoginSuccess" />
	
	<!-- PWA Install Prompt -->
	<PWAInstallPrompt 
		v-model:visible="showInstallPrompt"
		@install="installPWA"
		@dismiss="dismissInstallPrompt"
	/>
</template>

<style scoped>
.centerdiv {
	width: 100%;
	height: calc(100vh - 90px); /* Ajustado para dar espacio a la barra de estado */
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
}

.centerdiv :deep(button) {
	background-color: white;
	width: 200px;
	height: 200px;
	font-size: 125%;
}

/*noinspection CssUnusedSymbol*/
.centerdiv :deep(.p-button-icon) {
	font-size: 136%;
}

.main-menu {
	border-radius: 0;
}

/* Status bar styles */
.status-bar {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.5rem 1rem;
	background-color: #f8f9fa;
	border-bottom: 1px solid #e9ecef;
	font-size: 0.875rem;
	min-height: 40px;
}

.status-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.25rem 0.75rem;
	border-radius: 0.375rem;
	background-color: #e7f3ff;
	color: #0066cc;
	border: 1px solid #b3d9ff;
	transition: all 0.2s ease;
}

.status-item i {
	font-size: 1rem;
}

.status-item.offline {
	background-color: #ffe7e7;
	color: #cc0000;
	border-color: #ffb3b3;
}

.status-item.syncing {
	background-color: #fff3e0;
	color: #e65100;
	border-color: #ffcc80;
}

.status-item.pending {
	background-color: #f3e5f5;
	color: #7b1fa2;
	border-color: #ce93d8;
	cursor: pointer;
}

.status-item.pending:hover {
	background-color: #e1bee7;
	transform: translateY(-1px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.status-bar {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}
	
	.status-item {
		font-size: 0.8rem;
	}
	
	.centerdiv {
		height: calc(100vh - 120px);
	}
}
</style>
