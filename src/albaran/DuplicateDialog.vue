<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import * as albaranes from "@/services/albaranes";
import {Form, type FormResolverOptions, type FormSubmitEvent} from "@primevue/forms";
import {ref} from "vue";
import type {NewItemResponse} from "@coa/api-types";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["duplicateAlbaran"]);
const isDuplicating = ref<boolean>(false);

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if ((values.socioDesde ?? "").length <= 0)
		errors.socioDesde = [{message: "Campo obligatorio"}];

	if ((values.socioHasta ?? "").length <= 0)
		errors.socioHasta = [{message: "Campo obligatorio"}];

	if ((values.fechaDesde ?? "").length <= 0)
		errors.fechaDesde = [{message: "Campo obligatorio"}];

	if ((values.fechaHasta ?? "").length <= 0)
		errors.fechaHasta = [{message: "Campo obligatorio"}];

	if (values.fechaHasta && values.fechaDesde && values.fechaHasta < values.fechaDesde)
		errors.fechaHasta = [{message: "No puede ser menor que el campo \"desde\""}]

	return {
		values,
		errors
	};
}

async function onSubmitForm(e: FormSubmitEvent) {
	if (!e.valid)
		return;

	if (isDuplicating.value)
		return;

	isDuplicating.value = true;

	try {
		const response = await albaranes.duplicateAlbaran({
			socioDesdeId: e.values.socioDesde,
			socioHastaId: e.values.socioHasta,
			fechaDesde: e.values.fechaDesde.toISOString().split("T")[0],
			fechaHasta: e.values.fechaHasta.toISOString().split("T")[0]
		});

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra albaranes dentro del rango especificado");
					break;
				case 401:
					alert("No has iniciado sesión");
					break;
				default:
					alert("Error al duplicar albaranes");
					alert(`HTTP status: ${response.status}`);
			}
			return;
		}

		const data: NewItemResponse[] = await response.json();

		alert("Albaranes duplicados exitosamente");
		emit("duplicateAlbaran", e);
		visible.value = false;
	} catch (err: unknown) {
		console.error(err);
	} finally {
		isDuplicating.value = false;
	}
}
</script>

<template>
	<Dialog
		header="Duplicación de Albarán"
		modal
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '1000px': '95vw' }">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off">
			<p class="m-0 p-2">Genera un Albarán nuevo, con los mismos datos que el último albarán del socio/finca,
				en los socios/fincas que no tengan movimientos en el rango de fecha.</p>
			<Fieldset legend="Socio">
				<div class="w-full flex flex-row gap-2">
					<div class="flex-1 flex flex-col gap-1">
						<label for="duplicar-albaran-socio-desde">Desde:</label>
						<InputNumber inputId="duplicar-albaran-socio-desde" :useGrouping="false" fluid name="socioDesde"/>
						<Message
							v-if="$form.socioDesde?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.socioDesde.error.message">
						</Message>
					</div>
					<div class="flex-1 flex flex-col gap-1">
						<label for="duplicar-albaran-socio-hasta">Hasta:</label>
						<InputNumber inputId="duplicar-albaran-socio-hasta" :useGrouping="false" fluid name="socioHasta"/>
						<Message
							v-if="$form.socioHasta?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.socioHasta.error.message">
						</Message>
					</div>
				</div>
			</Fieldset>
			<Fieldset legend="Fecha">
				<div class="w-full flex flex-row gap-2">
					<div class="flex-1 flex flex-col gap-1">
						<label for="duplicar-albaran-fecha-desde">Desde:</label>
						<DatePicker inputId="duplicar-albaran-fecha-desde" fluid name="fechaDesde"/>
						<Message
							v-if="$form.fechaDesde?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.fechaDesde.error.message">
						</Message>
					</div>
					<div class="flex-1 flex flex-col gap-1">
						<label for="duplicar-albaran-fecha-hasta">Hasta:</label>
						<DatePicker inputId="duplicar-albaran-fecha-hasta" fluid name="fechaHasta"/>
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
			<div class="p-3">
				<Button type="submit" variant="outlined" label="Duplicar albarán" :loading="isDuplicating" />
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>

</style>
