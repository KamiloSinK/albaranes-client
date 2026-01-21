<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import * as visitas from "@/services/visitas";
import { Form, type FormResolverOptions, type FormSubmitEvent } from "@primevue/forms";
import { ref, watch } from "vue";
import type { RetrieveVisitaResponse } from "@coa/api-types";
import type { DataTableRowClickEvent } from "primevue/datatable";

const visible = defineModel("visible", { type: Boolean, required: true, default: false });
const isLoading = ref<boolean>(false);
const visitasList = ref<RetrieveVisitaResponse[]>([]);
const searchPerformed = ref<boolean>(false);
const fechaInicio = ref<Date | null>(null);
const fechaFin = ref<Date | null>(null);
const hoy = new Date();
hoy.setHours(23, 59, 59, 999);

function formResolver(e: FormResolverOptions): Record<string, any> {
	const { values } = e;
	const errors: Record<string, any> = {};

	if (!values.fechaInicio) {
		errors.fechaInicio = [{ message: "Campo obligatorio" }];
	} else if (values.fechaInicio > hoy) {
		errors.fechaInicio = [{ message: "No se pueden seleccionar fechas futuras" }];
	}

	if (!values.fechaFin) {
		errors.fechaFin = [{ message: "Campo obligatorio" }];
	} else if (values.fechaFin > hoy) {
		errors.fechaFin = [{ message: "No se pueden seleccionar fechas futuras" }];
	} else if (values.fechaFin && values.fechaInicio && values.fechaFin < values.fechaInicio) {
		errors.fechaFin = [{ message: "No puede ser menor que la fecha inicial" }];
	}

	return {
		values,
		errors
	};
}

async function onSubmitForm(e: FormSubmitEvent) {
	if (isLoading.value)
		return;

	isLoading.value = true;

	try {
		const response = await visitas.retrieveVisitas({
			fecha_inicio: e.values.fechaInicio.toISOString().split("T")[0],
			fecha_fin: e.values.fechaFin.toISOString().split("T")[0]
		});

		if (!response.ok) {
			switch (response.status) {
				case 400:
					alert("Parámetros de fecha inválidos");
					break;
				case 401:
					alert("No has iniciado sesión");
					break;
				default:
					alert("Error al obtener lista de visitas");
			}
			return;
		}

		visitasList.value = await response.json();
		searchPerformed.value = true;
	} catch (err: unknown) {
		console.error(err);
		alert("Error de conexión al obtener las visitas");
	} finally {
		isLoading.value = false;
	}
}

function onHideDialog() {
	visitasList.value = [];
	searchPerformed.value = false;
	fechaInicio.value = null;
	fechaFin.value = null;
}

function onRowClick(event: DataTableRowClickEvent) {
	const visita = event.data as RetrieveVisitaResponse;
	console.log("Visita seleccionada:", visita.albaranFullId);
}

watch(fechaInicio, () => {
	fechaFin.value = null;
});
</script>

<template>
	<Dialog
		header="Listado de Visitas"
		maximizable
		modal
		v-model:visible="visible"
		:style="{ width: '70rem', height: '80vh' }"
		:breakpoints="{ '1000px': '95vw' }"
		:contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }"
		@hide="onHideDialog">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off" class="p-2">
			<div class="mb-4">
				<Fieldset legend="Filtros de Búsqueda">
					<div class="w-full flex flex-col md:flex-row gap-4">
						<div class="flex-1 flex flex-col gap-1">
							<label for="visitas-fecha-inicio">Fecha Inicio:</label>
							<DatePicker 
								inputId="visitas-fecha-inicio" 
								fluid 
								name="fechaInicio"
								v-model="fechaInicio"
								dateFormat="yy-mm-dd"
								:maxDate="hoy"
								showIcon
							/>
							<Message
								v-if="$form.fechaInicio?.invalid ?? false"
								severity="error"
								size="small"
								variant="simple"
								v-text="$form.fechaInicio.error.message">
							</Message>
						</div>
						<div class="flex-1 flex flex-col gap-1">
							<label for="visitas-fecha-fin">Fecha Fin:</label>
							<DatePicker 
								inputId="visitas-fecha-fin" 
								fluid 
								name="fechaFin"
								v-model="fechaFin"
								dateFormat="yy-mm-dd"
								:minDate="fechaInicio ?? undefined"
								:maxDate="hoy"
								showIcon
							/>
							<Message
								v-if="$form.fechaFin?.invalid ?? false"
								severity="error"
								size="small"
								variant="simple"
								v-text="$form.fechaFin.error.message">
							</Message>
						</div>
					<div class="mt-3 self-end">
						<Button 
							type="submit" 
							label="Buscar Visitas" 
							icon="pi pi-search"
							:loading="isLoading"
							:disabled="!$form.valid"
						/>
					</div>
					</div>
				</Fieldset>
			</div>
		</Form>

		<div v-if="visitasList.length > 0" class="flex-1 p-2 overflow-auto">
			<DataTable 
				:value="visitasList"
				paginator
				:rows="10"
				:rowsPerPageOptions="[5, 10, 20, 50]"
				stripedRows
				scrollable
				scrollHeight="flex"
				tableStyle="min-width: 50rem"
				@row-click="onRowClick">
				<Column field="tecnicoNombre" header="Técnico" sortable>
					<template #body="{ data }">
						{{ data.tecnicoNombre }}
					</template>
				</Column>
				<Column field="fincaNombre" header="Finca" sortable>
					<template #body="{ data }">
						{{ data.fincaNombre }}
					</template>
				</Column>
				<Column field="hora" header="Hora" sortable>
					<template #body="{ data }">
						{{ data.hora }}
					</template>
				</Column>
				<Column field="fecha" header="Fecha" sortable>
					<template #body="{ data }">
						{{ data.fecha }}
					</template>
				</Column>
				<Column field="diagnosticoCorto" header="Diagnóstico" sortable>
					<template #body="{ data }">
						<div class="max-w-md truncate" :title="data.diagnosticoCorto">
							{{ data.diagnosticoCorto }}
						</div>
					</template>
				</Column>
			</DataTable>
		</div>
		<div v-else-if="!isLoading && searchPerformed" class="text-center py-8">
			<i class="pi pi-info-circle text-4xl text-yellow-500 mb-3"></i>
			<p class="text-lg font-semibold text-gray-700">No se encontraron visitas</p>
			<p class="text-sm text-gray-500 mt-2">No hubo visitas en el rango de fechas seleccionado</p>
		</div>
		<div v-else-if="!isLoading" class="text-center py-8 text-gray-500">
			Seleccione un rango de fechas y haga clic en "Buscar Visitas" para ver los resultados
		</div>
	</Dialog>
</template>

<style scoped>
.max-w-md {
	max-width: 28rem;
}
</style>
