<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script lang="ts" setup>
import {ref} from "vue";
import type {MenuItem} from "primevue/menuitem";
import AlbaranDialog from "@/albaran/AlbaranDialog.vue";
import ListadoAlbaranesDialog from "@/ListadoAlbaranesDialog.vue";
import ListadoProductosPorSocioDialog from "@/ListadoProductosPorSocioDialog.vue";
import FicheroCuarentenaDialog from "@/FicheroCuarentenaDialog.vue";
import LoginDialog from "@/LoginDialog.vue";
import PWAInstallPrompt from "@/components/PWAInstallPrompt.vue";
import { usePWA } from "@/composables/usePWA";

// PWA functionality
const { 
	isInstallable, 
	isInstalled, 
	showInstallPrompt, 
	installPWA, 
	dismissInstallPrompt, 
	showInstallDialog 
} = usePWA();

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

</script>

<template>
	<ConfirmDialog></ConfirmDialog>
	<Menubar :model="items" class="main-menu w-full"/>
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
	height: calc(100vh - 50px);
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
</style>
