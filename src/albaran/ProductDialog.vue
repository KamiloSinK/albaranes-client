<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {FormResolverOptions, FormSubmitEvent} from "@primevue/forms";
import {ref} from "vue";
import type {AlbaranMaquinaria, AlbaranNivel, RetrieveProductResponse} from "@coa/api-types";
import type {SelectChangeEvent, VirtualScrollerLazyEvent} from "primevue";
import * as productos from "@/services/productos";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["addProduct"]);

interface SelectOptions<V> {
	label: string;
	value: V;
}

const maquinariaOptions = ref<SelectOptions<AlbaranMaquinaria>[]>([
	{label: "Pulverizador", value: "pulverizador"},
	{label: "Espolvoreador", value: "espolvoreador"},
	{label: "Riego", value: "riego"},
	{label: "Mochila", value: "mochila"},
	{label: "Siembra manual", value: "siembra-manual"}
]);

const nivelOptions = ref<SelectOptions<AlbaranNivel>[]>([
	{label: "Alta", value: "alta"},
	{label: "Media", value: "media"},
	{label: "Baja", value: "baja"}
]);

const productList = ref<RetrieveProductResponse[]>([]);
const loadingProduct = ref<boolean>(false);

const previewMateriaActiva = ref<string>("");
const previewPlazoSeguimiento = ref<string>("");
const previewDosis = ref<string>("");
const previewPlaga = ref<string>("");

async function onLazyLoadProducts(e: VirtualScrollerLazyEvent) {
	if (loadingProduct.value)
		return;

	loadingProduct.value = true;

	try {
		let limit = e.last - e.first;

		if (limit <= 0)
			limit = 10000;

		const response = await productos.retrieveProductos({
			limit: limit,
			offset: e.first
		});

		const data: RetrieveProductResponse[] = await response.json();
		const items = [...productList.value];
		for (let i = 0; i < data.length; i++)
			items[e.first + i] = data[i];

		productList.value = items;
	} catch (err: unknown) {

	} finally {
		loadingProduct.value = false;
	}
}

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (!values.maquinaria)
		errors.maquinaria = [{message: "Campo obligatorio"}];

	if (!values.nivel)
		errors.nivel = [{message: "Campo obligatorio"}];

	if (!values.product)
		errors.product = [{message: "Campo obligatorio"}];

	if ((values.gastosL ?? "").length <= 0)
		errors.gastosL = [{message: "Campo obligatorio"}];

	if (isNaN(values.gastosL))
		errors.gastosL = [{message: "Debe ser un número"}];

	return {
		values,
		errors
	};
}

async function onSelectProduct(e: SelectChangeEvent) {
	try {
		const selectedProduct: RetrieveProductResponse = e.value;
		const response = await productos.retrieveProducto(selectedProduct.id);

		if (!response.ok) {
			alert(`HTTP status: ${response.status}`);
			return;
		}

		const data: RetrieveProductResponse = await response.json();
		previewMateriaActiva.value = data.materiaActiva;
		previewPlazoSeguimiento.value = data.plazoSeguimiento?.toString() ?? "";
		previewDosis.value = data.dosis;
		previewPlaga.value = data.plaga ?? "";
	} catch (err: unknown) {

	} finally {

	}
}

function onSubmitForm(e: FormSubmitEvent) {
	if (!e.valid)
		return;

	emit("addProduct", e);
	onResetForm();
	visible.value = false;
}

function onResetForm() {
	previewMateriaActiva.value = "";
	previewPlazoSeguimiento.value = "";
	previewDosis.value = "";
	previewPlaga.value = "";
}
</script>

<template>
	<Dialog
		modal
		header="Productos - Nuevo"
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '512px': '95vw' }">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" @reset="onResetForm">
			<div class="space-y-4 m-0 p-4">
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Maquinaria:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							:options="maquinariaOptions"
							name="maquinaria"
							optionLabel="label"
							optionValue="value"
							placeholder="Seleccione"/>
						<Message
							v-if="$form.maquinaria?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.maquinaria.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Nivel:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							:options="nivelOptions"
							name="nivel"
							optionLabel="label"
							optionValue="value"
							placeholder="Seleccione"/>
						<Message
							v-if="$form.nivel?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.nivel.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Producto:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							:options="productList"
							:virtualScrollerOptions="{
								lazy: true,
								onLazyLoad: onLazyLoadProducts,
								itemSize: 36,
								showLoader: true,
								loading: loadingProduct
							}"
							@change="onSelectProduct"
							name="product"
							optionLabel="nombre"
							placeholder="Seleccione"
							filter
							class="w-full"/>
						<Message
							v-if="$form.product?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.product.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2" for="albaran-new-product-gastos">Gastos
						(K/L):</label>
					<div class="flex-1 flex flex-col gap-1">
						<InputNumber
							:useGrouping="false"
							inputId="albaran-new-product-gastos"
							name="gastosL"
							class="w-full"/>
						<Message
							v-if="$form.gastosL?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.gastosL.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Mat. Activa:</label>
					<InputText
						disabled
						v-model="previewMateriaActiva"
						name="previewMateriaActiva"
						class="flex-1"/>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Plazo Seg.:</label>
					<div class="flex-1 flex flex-row gap-1 items-center">
						<InputText
							disabled
							v-model="previewPlazoSeguimiento"
							name="previewPlazoSeguimiento"
							class="flex-1 w-full"
						/>
						<label class="w-18 text-end font-semibold pr-2">Dosis:</label>
						<InputText
							disabled
							v-model="previewDosis"
							name="previewDosis"
							class="flex-1 w-full"
						/>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Plaga:</label>
					<InputText
						disabled
						v-model="previewPlaga"
						name="previewPlaga"
						class="flex-1"/>
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
/*noinspection CssUnusedSymbol*/
.large-icon-button :deep(.pi) {
	font-size: 1.36rem;
}
</style>
