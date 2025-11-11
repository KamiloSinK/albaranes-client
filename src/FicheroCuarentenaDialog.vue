<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {Form, type FormResolverOptions, type FormSubmitEvent} from "@primevue/forms";
const visible = defineModel("visible", {type: Boolean, required: true, default: false});

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (!values.fechaDesde)
		errors.fechaDesde = [{message: "Campo obligatorio"}];

	if (!values.fechaHasta)
		errors.fechaHasta = [{message: "Campo obligatorio"}];

	if (values.fechaHasta && values.fechaDesde && values.fechaHasta < values.fechaDesde)
		errors.fechaHasta = [{message: "No puede ser menor que el campo \"desde\""}]

	return {
		values,
		errors
	};
}

function onSubmitForm(e: FormSubmitEvent) {
	if (!e.valid)
		return;

	const fromDate = new Date(e.values.fechaDesde).toISOString().split("T")[0];
	const toDate = new Date(e.values.fechaHasta).toISOString().split("T")[0];
	location.href = `${import.meta.env.VITE_API_HOST}/albaranes/cuarentena?desde=${fromDate}&hasta=${toDate}`;
}

function onHideDialog() {}
</script>

<template>
	<Dialog
		header="Generar fichero de cuarentenas"
		modal
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '1000px': '95vw' }"
		@hide="onHideDialog">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off">
			<Fieldset legend="Fecha">
				<div class="w-full flex flex-row gap-2">
					<div class="flex-1 flex flex-col gap-1">
						<label for="listado-albaranes-fecha-desde">Desde:</label>
						<DatePicker
							name="fechaDesde"
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
			<div class="p-2">
				<Button
					label="Generar fichero de cuarentena"
					variant="outlined"
					type="submit"/>
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>

</style>
