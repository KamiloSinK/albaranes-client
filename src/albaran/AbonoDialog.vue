<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import type {RetrieveAbonoResponse} from "@coa/api-types";
import type {DialogProps, VirtualScrollerLazyEvent} from "primevue";
import * as abonos from "@/services/abonos";
import type {FormResolverOptions, FormSubmitEvent} from "@primevue/forms";
import { useMasterDataCache } from '@/composables/useMasterDataCache'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { cacheService } from '@/services/cacheService'

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["addAbono"]);

const dialog = ref<any>()
const form = ref<any>()

const abonoList = ref<RetrieveAbonoResponse[]>([]);
const loadingAbono = ref<boolean>(false);

// Cache y estado de red
const { isOnline } = useNetworkStatus()
const { getAbonos } = useMasterDataCache()

// Estado para los campos del formulario
const selectedAbono = ref<RetrieveAbonoResponse | null>(null);
const kilosValue = ref<number | null>(null);

// Variable para almacenar la referencia del event listener
let keydownListener: ((event: KeyboardEvent) => void) | null = null;

// Controlar el ciclo de vida del evento Enter basado en la visibilidad del diálogo
watch(visible, (newValue) => {
	if (newValue) {
		// Diálogo se abre - agregar event listener
		if (keydownListener) {
			document.removeEventListener('keydown', keydownListener);
		}
		
		keydownListener = (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				// Validar que ambos campos tengan datos válidos
				if (isFormValid.value) {
					event.preventDefault();
					// Proceder con el guardado normal
					submitForm();
				}
			}
		};
		
		document.addEventListener('keydown', keydownListener);
	} else {
		// Diálogo se cierra - remover event listener y limpiar formulario
		if (keydownListener) {
			document.removeEventListener('keydown', keydownListener);
			keydownListener = null;
		}
		clearForm();
	}
});

async function onLazyLoadAbonos(e: VirtualScrollerLazyEvent) {
	if (loadingAbono.value)
		return;

	loadingAbono.value = true;

	try {
    // No esperamos inicialización: usamos cache si está disponible
		
		let limit = e.last - e.first;

		if (limit <= 0)
			limit = 10000;

		// Primero verificar si hay datos válidos en cache (respeta las 6 horas)
		if (!cacheService.needsUpdate('abonos')) {
			console.log('Cache de abonos válido, usando datos en cache para lazy load...');
			const cachedAbonos = getAbonos()
			
			// Simular paginación con datos del cache
			const startIndex = e.first
			const endIndex = Math.min(e.first + limit, cachedAbonos.length)
			const paginatedData = cachedAbonos.slice(startIndex, endIndex)
			
			const items = [...abonoList.value]
			for (let i = 0; i < paginatedData.length; i++) {
				items[e.first + i] = paginatedData[i]
			}
			
			abonoList.value = items
			return
		}

		// Si estamos offline, usar datos del cache aunque esté expirado
		if (!isOnline.value) {
			console.log('Offline: Cargando abonos desde cache')
			const cachedAbonos = getAbonos()
			
			// Simular paginación con datos del cache
			const startIndex = e.first
			const endIndex = Math.min(e.first + limit, cachedAbonos.length)
			const paginatedData = cachedAbonos.slice(startIndex, endIndex)
			
			const items = [...abonoList.value]
			for (let i = 0; i < paginatedData.length; i++) {
				items[e.first + i] = paginatedData[i]
			}
			
			abonoList.value = items
			return
		}

		// Solo hacer llamada a API si cache está expirado y hay conexión
		const response = await abonos.retrieveAbonos({
			limit: limit,
			offset: e.first
		});

		const data: RetrieveAbonoResponse[] = await response.json();

		const items = [...abonoList.value];
		for (let i = 0; i < data.length; i++)
			items[e.first + i] = data[i];

		abonoList.value = items;
	} catch (err: unknown) {
		console.error('Error cargando abonos:', err)
		
		// Fallback: usar cache si la llamada a la API falla
		console.log('Fallback: Usando abonos desde cache debido a error')
		const cachedAbonos = getAbonos()
		
		if (cachedAbonos.length > 0) {
			let limit = e.last - e.first;
			if (limit <= 0) limit = 10000;
			
			const startIndex = e.first
			const endIndex = Math.min(e.first + limit, cachedAbonos.length)
			const paginatedData = cachedAbonos.slice(startIndex, endIndex)
			
			const items = [...abonoList.value]
			for (let i = 0; i < paginatedData.length; i++) {
				items[e.first + i] = paginatedData[i]
			}
			
			abonoList.value = items
		}
	} finally {
		loadingAbono.value = false;
	}
}

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (!values.abono)
		errors.abono = [{message: "Campo obligatorio"}];

	if ((values.kilos ?? "").length <= 0)
		errors.kilos = [{message: "Campo obligatorio"}];

	if (isNaN(values.kilos))
		errors.kilos = [{message: "Debe ser un número"}];

	return {
		values,
		errors
	};
}

// Función para validar los campos usando el estado
const isFormValid = computed(() => {
	return selectedAbono.value !== null && 
	       kilosValue.value !== null && 
	       kilosValue.value > 0 && 
	       !isNaN(kilosValue.value);
});

// Función para hacer el guardado usando el estado
async function submitForm() {
	if (!isFormValid.value) {
		return;
	}

	// Crear el objeto de datos similar al FormSubmitEvent
	const formData = {
		valid: true,
		values: {
			abono: selectedAbono.value,
			kilos: kilosValue.value
		}
	};

	emit("addAbono", formData);
	
	// Limpiar el formulario después de guardar
	await clearForm();
	
	// Cerrar el diálogo
	visible.value = false;
}

function onSubmitForm(e: FormSubmitEvent) {
	if (!e.valid)
		return;

	emit("addAbono", e);
	visible.value = false;
}

// Función para limpiar los datos
async function clearForm() {
	if(form.value) form.value.reset();
	selectedAbono.value = null;
	kilosValue.value = null;
}



</script>

<template>
	<Dialog
		ref="dialog"
		modal
		header="Abono - Nuevo"
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '512px': '95vw' }"
		@hide="clearForm"
		>
		<Form ref="form" v-slot="$form" :resolver="formResolver" @submit="onSubmitForm">
			<div class="space-y-4 m-0 p-4">
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Producto:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							v-model="selectedAbono"
							:options="abonoList"
							:virtualScrollerOptions="{
								lazy: true,
								onLazyLoad: onLazyLoadAbonos,
								itemSize: 36,
								showLoader: true,
								loading: loadingAbono
							}"
							name="abono"
							optionLabel="nombre"
							placeholder="Seleccione"
							filter
							class="w-full"/>
						<Message
							v-if="selectedAbono === null"
							severity="error"
							size="small"
							variant="simple"
							text="Campo obligatorio">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2" for="albaran-new-product-gastos">Kilos:</label>
					<div class="flex-1 flex flex-col gap-1">
						<InputNumber
							v-model="kilosValue"
							:useGrouping="false"
							inputId="albaran-new-product-gastos"
							name="kilos"
							class="w-full"/>
						<Message
							v-if="kilosValue === null || kilosValue <= 0 || isNaN(kilosValue)"
							severity="error"
							size="small"
							variant="simple"
							text="Debe ser un número mayor que 0">
						</Message>
					</div>
				</div>
			</div>
			<hr>
			<div class="flex space-x-2 p-4 w-full">
				<Button
					icon="pi pi-clipboard"
					label="Limpiar datos"
					iconPos="top"
					@click="clearForm"
					class="large-icon-button"
					variant="outlined"/>
				<Button
					icon="pi pi-save"
					label="Grabar"
					iconPos="top"
					@click="submitForm"
					class="large-icon-button"
					:disabled="!isFormValid"
					variant="outlined"/>
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>

</style>
