<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import * as albaranes from "@/services/albaranes";
import {Form, type FormResolverOptions, type FormSubmitEvent} from "@primevue/forms";
import {ref, onMounted, watch} from "vue";
import type {RetrieveAlbaranResponse, RetrieveFincaResponse, RetrieveSocioResponse} from "@coa/api-types";
import {Button, type VirtualScrollerLazyEvent} from "primevue";
import * as socios from "@/services/socios.ts";
import * as fincas from "@/services/fincas.ts";
import { useMasterDataCache } from "@/composables/useMasterDataCache";
import { useNetworkStatus } from "@/composables/useNetworkStatus";
import { useSession } from "@/composables/useSession";
import { cacheService } from "@/services/cacheService";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});

// Cache y network status
const { isOnline } = useNetworkStatus();
const { hasSession } = useSession();
const { getSocios, getFincas } = useMasterDataCache();

const sociosList = ref<RetrieveSocioResponse[]>([]);
const fincasList = ref<RetrieveFincaResponse[]>([]);
const loadingSocio = ref<boolean>(false);
const loadingFinca = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const mode = ref<"preview" | "print">("preview");
// v-model locales para mantener el comportamiento coherente con otros Select
const selectedSocioId = ref<number | null>(null);
const selectedFincaId = ref<number | null>(null);

// Inicializar listas con datos del cache al montar el componente
onMounted(() => {
  const cachedSocios = getSocios();
  if (cachedSocios.length > 0) {
    sociosList.value = cachedSocios;
    console.log(`Cargados ${cachedSocios.length} socios desde cache (Listado)`);
  }

  const cachedFincas = getFincas();
  if (cachedFincas.length > 0) {
    fincasList.value = cachedFincas;
    console.log(`Cargadas ${cachedFincas.length} fincas desde cache (Listado)`);
  }

  // Si no hay datos aún, cargar un lote inicial para habilitar filtro inmediato
  if (sociosList.value.length === 0) {
    loadInitialSocios().then().catch();
  }
  if (fincasList.value.length === 0) {
    loadInitialFincas().then().catch();
  }
});

// Repoblar al abrir el diálogo y re-evaluar según conectividad
watch(visible, (isOpen) => {
  if (isOpen) {
    // Pintar rápido desde cache
    const cachedSocios = getSocios();
    if (cachedSocios.length > 0) sociosList.value = cachedSocios;
    const cachedFincas = getFincas();
    if (cachedFincas.length > 0) fincasList.value = cachedFincas;

    // Si hay conexión y sesión, refrescar en background
    if (isOnline.value && hasSession()) {
      void loadInitialSocios();
      void loadInitialFincas();
    }
  }
});

// Responder dinámicamente a cambios de conectividad
watch(isOnline, (online) => {
  if (!visible.value) return;
  if (online && hasSession()) {
    // Con conexión: refrescar desde API en background
    void loadInitialSocios();
    void loadInitialFincas();
  } else {
    // Sin conexión: asegurar que los Selects muestren cache
    const cachedSocios = getSocios();
    if (cachedSocios.length > 0) sociosList.value = cachedSocios;
    const cachedFincas = getFincas();
    if (cachedFincas.length > 0) fincasList.value = cachedFincas;
  }
});

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (values.albaranDesde === null)
		errors.albaranDesde = [{message: "Campo obligatorio"}];

	if (values.albaranHasta === null)
		errors.albaranHasta = [{message: "Campo obligatorio"}];

	if (values.albaranHasta !== null && values.albaranHasta < values.albaranDesde)
		errors.albaranHasta = [{message: "No puede ser menor que \"desde\""}];

	if (!values.fechaDesde)
		errors.fechaDesde = [{message: "Campo obligatorio"}];

	if (!values.fechaHasta)
		errors.fechaHasta = [{message: "Campo obligatorio"}];

	if (values.fechaHasta && values.fechaDesde && values.fechaHasta < values.fechaDesde)
		errors.fechaHasta = [{message: "No puede ser menor que el campo \"desde\""}]

	if (!values.socio)
		errors.socio = [{message: "Campo obligatorio"}];

	if (!values.finca)
		errors.finca = [{message: "Campo obligatorio"}];

	return {
		values,
		errors
	};
}

function printReport(data: RetrieveAlbaranResponse[], mode: "preview" | "print") {
	let printableWindow = window.open("", "", "width=816,height=900");
	if (!printableWindow) {
		alert("No se puede abrir la ventana\nAsegúrate de habilitar las ventanas emergentes en el navegador.");
		return;
	}

	printableWindow.document.head.innerHTML = albaranes.printableHTMLHead;
	printableWindow.document.body.innerHTML = albaranes.generatePrintableHTMLBody(data);

	if (mode === "print") {
		printableWindow.document.close();
		printableWindow.focus();
		printableWindow.print();
		printableWindow.close();
	}
}

async function onSubmitForm(e: FormSubmitEvent) {
	if (isLoading.value)
		return;

	isLoading.value = true;

	try {
		const response = await albaranes.retrieveAlbaranes({
			finca_id: e.values.finca,
			from_fecha: e.values.fechaDesde.toISOString().split("T")[0],
			from_id: e.values.albaranDesde,
			socio_id: e.values.socio,
			to_fecha: e.values.fechaHasta.toISOString().split("T")[0],
			to_id: e.values.albaranHasta
		});

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra las fincas");
					break;
				case 401:
					alert("No has iniciado sesión");
					break;
				default:
					alert("Error al obtener lista de albaranes");
			}
		}

		printReport(await response.json(), mode.value);
	} catch (err: unknown) {
		console.error(err);
	} finally {
		isLoading.value = false;
	}
}

function onHideDialog() {}

// Cargar inicialmente un lote de opciones para que el Select funcione sin esperar scroll
async function loadInitialSocios() {
  loadingSocio.value = true;
  try {
    // Pintar rápido desde caché si existe
    const cached = getSocios();
    if (cached.length > 0) sociosList.value = cached;

    // Con conexión y sesión, consultar API
    if (isOnline.value && hasSession()) {
      const response = await socios.retrieveSocios({ limit: 999999, offset: 0 });
      if (response.ok) sociosList.value = await response.json();
    }
  } catch (err) {
    console.error('Error al cargar socios iniciales:', err);
    const cached = getSocios();
    if (cached.length > 0) sociosList.value = cached;
  } finally {
    loadingSocio.value = false;
  }
}

async function loadInitialFincas() {
  loadingFinca.value = true;
  try {
    // Pintar rápido desde caché si existe
    const cached = getFincas();
    if (cached.length > 0) fincasList.value = cached;

    // Con conexión y sesión, consultar API
    if (isOnline.value && hasSession()) {
      const response = await fincas.retrieveFincas({ limit: 999999, offset: 0 });
      if (response.ok) fincasList.value = await response.json();
    }
  } catch (err) {
    console.error('Error al cargar fincas iniciales:', err);
    const cached = getFincas();
    if (cached.length > 0) fincasList.value = cached;
  } finally {
    loadingFinca.value = false;
  }
}

async function onLazyLoadSocios(e: VirtualScrollerLazyEvent) {
	loadingSocio.value = true;

	try {
    // API-first: consultar siempre la API si hay conexión; fallback a caché
		let limit = e.last - e.first;
		if (limit <= 0) limit = 200;

    if (!isOnline.value || !hasSession()) {
      const cachedSocios = getSocios();
      const startIndex = e.first;
      const endIndex = e.last;
      const paginatedData = cachedSocios.slice(startIndex, endIndex);
      const items = [...sociosList.value];
			for (let i = 0; i < paginatedData.length; i++) items[startIndex + i] = paginatedData[i];
			sociosList.value = items;
			return;
		}

		const response = await socios.retrieveSocios({ limit, offset: e.first });
		if (response.ok) {
			const data: RetrieveSocioResponse[] = await response.json();
			const items = [...sociosList.value];
			for (let i = 0; i < data.length; i++) items[e.first + i] = data[i];
			sociosList.value = items;
		} else {
			const cachedSocios = getSocios();
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedSocios.slice(startIndex, endIndex);
			const items = [...sociosList.value];
			for (let i = 0; i < paginatedData.length; i++) items[startIndex + i] = paginatedData[i];
			sociosList.value = items;
		}
	} catch (err: unknown) {
		console.error("Error al cargar socios:", err);
		// En caso de error, intentar cargar desde cache
		console.log('Error en API, intentando cargar socios desde cache...');
		const cachedSocios = getSocios();
		if (cachedSocios.length > 0) {
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedSocios.slice(startIndex, endIndex);
			
			const items = [...sociosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			sociosList.value = items;
		}
	} finally {
		loadingSocio.value = false;
	}
}

async function onLazyLoadFincas(e: VirtualScrollerLazyEvent) {
	loadingFinca.value = true;

	try {
    // API-first: consultar siempre la API si hay conexión; fallback a caché
		let limit = e.last - e.first;
		if (limit <= 0) limit = 200;

    if (!isOnline.value || !hasSession()) {
      const cachedFincas = getFincas();
      const startIndex = e.first;
      const endIndex = e.last;
      const paginatedData = cachedFincas.slice(startIndex, endIndex);
      const items = [...fincasList.value];
			for (let i = 0; i < paginatedData.length; i++) items[startIndex + i] = paginatedData[i];
			fincasList.value = items;
			return;
		}

		const response = await fincas.retrieveFincas({ limit, offset: e.first });
		if (response.ok) {
			const data: RetrieveFincaResponse[] = await response.json();
			const items = [...fincasList.value];
			for (let i = 0; i < data.length; i++) items[e.first + i] = data[i];
			fincasList.value = items;
		} else {
			const cachedFincas = getFincas();
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedFincas.slice(startIndex, endIndex);
			const items = [...fincasList.value];
			for (let i = 0; i < paginatedData.length; i++) items[startIndex + i] = paginatedData[i];
			fincasList.value = items;
		}
	} catch (err: unknown) {
		console.error("Error al cargar fincas:", err);
		// En caso de error, intentar cargar desde cache
		console.log('Error en API, intentando cargar fincas desde cache...');
		const cachedFincas = getFincas();
		if (cachedFincas.length > 0) {
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedFincas.slice(startIndex, endIndex);
			
			const items = [...fincasList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			fincasList.value = items;
		}
	} finally {
		loadingFinca.value = false;
	}
}
</script>

<template>
	<Dialog
		header="Listado de Albaranes"
		modal
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '1000px': '95vw' }"
		@hide="onHideDialog">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off" class="p-2">
			<Fieldset legend="Albarán">
				<div class="w-full flex flex-row gap-2">
					<div class="flex-1 flex flex-col gap-1">
						<label for="listado-albaranes-desde">Desde:</label>
						<InputNumber inputId="listado-albaranes-desde" fluid name="albaranDesde"/>
						<Message
							v-if="$form.albaranDesde?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.albaranDesde.error.message">
						</Message>
					</div>
					<div class="flex-1 flex flex-col gap-1">
						<label for="listado-albaranes-hasta">Hasta:</label>
						<InputNumber inputId="listado-albaranes-hasta" fluid name="albaranHasta"/>
						<Message
							v-if="$form.albaranHasta?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.albaranHasta.error.message">
						</Message>
					</div>
				</div>
			</Fieldset>
			<Fieldset legend="Fecha">
				<div class="w-full flex flex-row gap-2">
					<div class="flex-1 flex flex-col gap-1">
						<label for="listado-albaranes-fecha-desde">Desde:</label>
						<DatePicker
							name="fechaDesde"
							dateFormat="yy-mm-dd"
							inputId="listado-albaranes-fecha-desde"
							fluid/>
						<Message
							v-if="$form.fechaDesde?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.fechaDesde.error.message">
						</Message>
					</div>
					<div class="flex-1 flex flex-col gap-1">
						<label for="listado-albaranes-fecha-hasta">Hasta:</label>
						<DatePicker
							name="fechaHasta"
							dateFormat="yy-mm-dd"
							inputId="listado-albaranes-fecha-hasta"
							fluid/>
						<Message
							v-if="$form.fechaHasta?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.fechaHasta.error.message">
						</Message>
					</div>
				</div>
			</Fieldset>
      <div class="flex-1 flex flex-col gap-1">
        <label>Socio:</label>
        <Select
          v-model="selectedSocioId"
          :options="sociosList"
          :virtualScrollerOptions="{
            lazy: true,
            onLazyLoad: onLazyLoadSocios,
            itemSize: 36,
            showLoader: true,
            loading: loadingSocio
          }"
          optionLabel="nombre"
          optionValue="id"
          :filterFields="['nombre','bc_id']"
          placeholder="Seleccione"
          name="socio"
          filter
          class="w-full">
        </Select>
				<Message
					v-if="$form.socio?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="$form.socio.error.message">
				</Message>
			</div>
      <div class="flex-1 flex flex-col gap-1">
        <label>Finca:</label>
        <Select
          v-model="selectedFincaId"
          :options="fincasList"
          :virtualScrollerOptions="{
            lazy: true,
            onLazyLoad: onLazyLoadFincas,
            itemSize: 36,
            showLoader: true,
            loading: loadingFinca
          }"
          optionLabel="nombre"
          optionValue="id"
          :filterFields="['nombre','bc_id']"
          placeholder="Seleccione"
          name="finca"
          filter
          class="w-full">
        </Select>
				<Message
					v-if="$form.finca?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="$form.finca.error.message">
				</Message>
			</div>
			<div class="flex space-x-2 p-4 w-full">
				<Button
					@click="mode = 'preview'"
					:loading="isLoading"
					label="Vista previa"
					type="submit"
					variant="outlined"/>
				<Button
					@click="mode = 'print'"
					:loading="isLoading"
					label="Imprimir"
					type="submit"
					variant="outlined"/>
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>

</style>
