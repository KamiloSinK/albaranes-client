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
import LoginDialog from "@/LoginDialog.vue";
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

// Master data cache
const { 
	isLoading: isCacheLoading, 
	loadMasterData, 
	cacheStats 
} = useMasterDataCache();

const dialogVisible = ref({
	"AlbaranDialog": false,
	"ListadoAlbaranesDialog": false,
	"ListadoProductosPorSocioDialog": false,
	"FicheroCuarentenaDialog": false,
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
				label: "Generar fichero de cuarentena",
				command: () => openDialog("FicheroCuarentenaDialog")
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

			openDialog("LoginDialog");
		}
	}
]);

const cookies = document.cookie.split("; ");
const sessionCookie = cookies.find(cookie => cookie.startsWith("sid="));

if (!sessionCookie) {
	openDialog("LoginDialog");
}

// Inicializar cache de datos maestros al montar la aplicación
onMounted(async () => {
  // Solo proceder si hay una sesión activa
  if (!sessionCookie) {
    console.log('No hay sesión activa - no se cargarán datos maestros');
    return;
  }

  // Inicializar caches desde IndexedDB antes de cargar datos maestros
  try {
    await Promise.all([
      cacheService.initialize(),
      offlineStorage.initialize()
    ])
    console.log('IndexedDB inicializado, caches en memoria disponibles')
  } catch (e) {
    console.warn('No se pudo inicializar IndexedDB, continuando con flujo estándar', e)
  }

  console.log('Inicializando datos maestros...');
  console.log('Estado de conexión:', isOnline.value ? 'Conectado' : 'Sin conexión');
	
	// Obtener estadísticas del cache para logging
	const stats = cacheStats.value;
	console.log('Estadísticas del cache:', stats);
	
	try {
		// loadMasterData() maneja automáticamente:
		// - Si hay internet: verifica si el cache ha expirado y actualiza solo si es necesario
		// - Si no hay internet: usa los datos del cache sin intentar actualizar
		await loadMasterData();
		
		// Mostrar información sobre el resultado
		const updatedStats = cacheStats.value;
		const hasData = updatedStats.productos.count > 0 && 
		               updatedStats.socios.count > 0 && 
		               updatedStats.fincas.count > 0 && 
		               updatedStats.tecnicos.count > 0 &&
		               updatedStats.abonos.count > 0;
		
		if (hasData) {
			console.log('✅ Datos maestros disponibles:', {
				productos: updatedStats.productos.count,
				socios: updatedStats.socios.count,
				fincas: updatedStats.fincas.count,
				tecnicos: updatedStats.tecnicos.count,
				abonos: updatedStats.abonos.count
			});
			
			if (isOnline.value) {
				console.log('📡 Cache verificado y actualizado si era necesario');
			} else {
				console.log('💾 Usando datos del cache (sin conexión)');
			}
		} else {
			if (isOnline.value) {
				console.warn('⚠️ No se pudieron cargar los datos maestros');
			} else {
				console.warn('⚠️ Sin conexión y sin datos en cache');
			}
		}
		
	} catch (error) {
		console.error('❌ Error al inicializar datos maestros:', error);
	}
});

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
		
		<!-- Cache loading status -->
		<div v-if="isCacheLoading" class="status-item loading">
			<i class="pi pi-spin pi-spinner"></i>
			<span>Cargando datos...</span>
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
	</div>
	<AlbaranDialog v-model:visible="dialogVisible['AlbaranDialog']" />
	<ListadoAlbaranesDialog v-model:visible="dialogVisible['ListadoAlbaranesDialog']" />
	<ListadoProductosPorSocioDialog v-model:visible="dialogVisible['ListadoProductosPorSocioDialog']" />
	<FicheroCuarentenaDialog v-model:visible="dialogVisible['FicheroCuarentenaDialog']" />
	<LoginDialog v-model:visible="dialogVisible['LoginDialog']" />
	
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
