<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {ref} from "vue";
import type {RetrieveAbonoResponse} from "@coa/api-types";
import type {VirtualScrollerLazyEvent} from "primevue";
import * as abonos from "@/services/abonos";
import type {FormResolverOptions, FormSubmitEvent} from "@primevue/forms";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["addAbono"]);

const abonoList = ref<RetrieveAbonoResponse[]>([]);
const loadingAbono = ref<boolean>(false);

async function onLazyLoadAbonos(e: VirtualScrollerLazyEvent) {
	if (loadingAbono.value)
		return;

	loadingAbono.value = true;

	try {
		let limit = e.last - e.first;

		if (limit <= 0)
			limit = 10000;

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

function onSubmitForm(e: FormSubmitEvent) {
	if (!e.valid)
		return;

	emit("addAbono", e);
	visible.value = false;
}

</script>

<template>
	<Dialog
		modal
		header="Abono - Nuevo"
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '512px': '95vw' }">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm">
			<div class="space-y-4 m-0 p-4">
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Producto:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
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
							v-if="$form.abono?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.abono.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2" for="albaran-new-product-gastos">Kilos:</label>
					<div class="flex-1 flex flex-col gap-1">
						<InputNumber
							:useGrouping="false"
							inputId="albaran-new-product-gastos"
							name="kilos"
							class="w-full"/>
						<Message
							v-if="$form.kilos?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.kilos.error.message">
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
					type="reset"
					class="large-icon-button"
					variant="outlined"/>
				<Button
					icon="pi pi-save"
					label="Grabar"
					iconPos="top"
					type="submit"
					class="large-icon-button"
					:disabled="!$form.valid"
					variant="outlined"/>
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>

</style>
