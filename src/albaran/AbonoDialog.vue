<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import type {RetrieveAbonoResponse} from "@coa/api-types";
import type {DialogProps, SelectFilterEvent, VirtualScrollerLazyEvent} from "primevue";
import * as abonos from "@/services/abonos";
import type {FormResolverOptions, FormSubmitEvent} from "@primevue/forms";
import { useMasterDataCache } from '@/composables/useMasterDataCache'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { cacheService } from '@/services/cacheService'
import { useSession } from '@/composables/useSession'

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["addAbono"]);

const dialog = ref<any>()
const form = ref<any>()

const abonoList = ref<RetrieveAbonoResponse[]>([]);
const loadingAbono = ref<boolean>(false);

// Cache y estado de red
const { isOnline } = useNetworkStatus()
const { getAbonos } = useMasterDataCache()
const { hasSession } = useSession()

// Debounce para búsqueda
let filterTimeout: ReturnType<typeof setTimeout> | null = null;

// Estado para los campos del formulario
const selectedAbono = ref<RetrieveAbonoResponse | null>(null);
const kilosValue = ref<number | null>(null);

// Variable para almacenar la referencia del event listener
let keydownListener: ((event: KeyboardEvent) => void) | null = null;

// Controlar el ciclo de vida del evento Enter basado en la visibilidad del diálogo
watch(visible, (newValue) => {
	if (newValue) {
		// Cargar abonos al abrir el diálogo (API primero si hay conexión)
		loadInitialAbonos().then().catch(() => {});
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

// Carga inicial de abonos (50 items para el Select)
async function loadInitialAbonos() {
  if (abonoList.value.length > 0) return;
  loadingAbono.value = true;
  try {
    // Offline: solo usar cache
    if (!isOnline.value) {
      const cached = getAbonos();
      abonoList.value = Array.isArray(cached) ? cached : [];
      return;
    }

    // Online: cargar primer lote (50) para el Select
    const response = await abonos.retrieveAbonos({ limit: 50, offset: 0 });
    if (response.ok) {
      const data = await response.json();
      abonoList.value = Array.isArray(data) ? data : [];
    } else {
      const cached = getAbonos();
      abonoList.value = Array.isArray(cached) ? cached : [];
    }
  } catch (err) {
    console.error('Error al cargar abonos iniciales:', err);
    const cached = getAbonos();
    abonoList.value = Array.isArray(cached) ? cached : [];
  } finally {
    loadingAbono.value = false;
  }
}


// Lazy load para virtual scroller - carga datos cuando el usuario scrollea
async function onLazyLoadAbonos(e: VirtualScrollerLazyEvent) {
    // Si estamos cargando, no hacer nada
    if (loadingAbono.value) return;
    
    // Si el rango solicitado ya está cubierto por los datos cargados, no hacer nada
    const loadedCount = abonoList.value.length;
    if (e.last <= loadedCount) {
        return; // Ya tenemos estos datos
    }
    
    // Si no hay conexión, no cargar más
    if (!isOnline.value) {
        return;
    }
    
    loadingAbono.value = true;
    try {
        let limit = e.last - e.first;
        if (limit <= 0) limit = 200;
        
        // Cargar desde donde terminan los datos actuales
        const offset = Math.max(e.first, loadedCount);
        const response = await abonos.retrieveAbonos({ limit, offset });
        if (response.ok) {
            const data: RetrieveAbonoResponse[] = await response.json();
            const items = [...abonoList.value];
            for (let i = 0; i < data.length; i++) {
                items[offset + i] = data[i];
            }
            abonoList.value = items;
        }
    } catch (err) {
        console.error('Error en lazy load abonos:', err);
    } finally {
        loadingAbono.value = false;
    }
}

// Buscar abonos en API cuando el usuario filtra por nombre
async function onFilterAbono(e: SelectFilterEvent) {
    const searchTerm = e.value?.trim() ?? '';
    
    // Si el término es muy corto, no buscar en API
    if (searchTerm.length < 2) return;
    
    // Debounce: esperar 300ms antes de buscar
    if (filterTimeout) clearTimeout(filterTimeout);
    
    filterTimeout = setTimeout(async () => {
        // Solo buscar en API si estamos online y hay sesión
        if (!isOnline.value || !hasSession()) return;
        
        try {
            const response = await abonos.retrieveAbonos({ contains: searchTerm, limit: 50 });
            if (response.ok) {
                const data: RetrieveAbonoResponse[] = await response.json();
                
                // Agregar los resultados a la lista si no existen
                for (const abono of data) {
                    if (!abonoList.value.some(a => a.id === abono.id)) {
                        abonoList.value.push(abono);
                    }
                }
            }
        } catch (err) {
            console.error('Error buscando abonos en API:', err);
        }
    }, 750);
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
							@filter="onFilterAbono"
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
