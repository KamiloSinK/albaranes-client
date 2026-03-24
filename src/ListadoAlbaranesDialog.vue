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
import { useLazySelect } from "@/composables/useLazySelect";
import { useNetworkStatus } from "@/composables/useNetworkStatus";
import { useSession } from "@/composables/useSession";
import { cacheService } from "@/services/cacheService";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});

// Cache y network status
const { isOnline } = useNetworkStatus();
const { hasSession } = useSession();
const { getSocios, getFincas } = useMasterDataCache();

// Lazy loading para Selects paginados
const sociosLazy = useLazySelect<RetrieveSocioResponse>();
const sociosList = sociosLazy.items;
const loadingSocio = sociosLazy.loading;

const fincasLazy = useLazySelect<RetrieveFincaResponse>();
const fincasList = fincasLazy.items;
const loadingFinca = fincasLazy.loading;
const isLoading = ref<boolean>(false);
const mode = ref<"preview" | "print">("preview");
// v-model locales para mantener el comportamiento coherente con otros Select
const selectedSocioId = ref<number | null>(null);
const selectedFincaId = ref<number | null>(null);

// Inicializar listas al montar el componente
onMounted(() => {
  loadInitialSocios();
  loadInitialFincas();
});

// Repoblar al abrir el diálogo y re-evaluar según conectividad
watch(visible, (isOpen) => {
  if (isOpen) {
    loadInitialSocios();
    loadInitialFincas();
  }
});

// Responder dinámicamente a cambios de conectividad
watch(isOnline, (online) => {
  if (!visible.value) return;
  if (online && hasSession()) {
    void loadInitialSocios();
    void loadInitialFincas();
  } else {
    sociosLazy.reset();
    sociosList.value = getSocios();
    sociosLazy.hasMore.value = false;
    fincasLazy.reset();
    fincasList.value = getFincas();
    fincasLazy.hasMore.value = false;
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

// Carga inicial (primera página de 50 elementos)
async function loadInitialSocios() {
  await sociosLazy.loadInitial(
    (p) => socios.retrieveSocios(p),
    { cacheFn: getSocios, isOnline: isOnline.value, hasSession: hasSession() }
  );
}

async function loadInitialFincas() {
  await fincasLazy.loadInitial(
    (p) => fincas.retrieveFincas(p),
    { cacheFn: getFincas, isOnline: isOnline.value, hasSession: hasSession() }
  );
}

// Lazy load handlers para virtual scroller
async function onLazyLoadSocios(e: VirtualScrollerLazyEvent) {
  await sociosLazy.onLazyLoad(e,
    (p) => socios.retrieveSocios(p),
    { isOnline: isOnline.value, hasSession: hasSession() }
  );
}

async function onLazyLoadFincas(e: VirtualScrollerLazyEvent) {
  await fincasLazy.onLazyLoad(e,
    (p) => fincas.retrieveFincas(p),
    { isOnline: isOnline.value, hasSession: hasSession() }
  );
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
