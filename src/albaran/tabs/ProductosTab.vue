<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {AlbaranDialogState, ProductData} from "@/albaran/AlbaranDialog.vue";
import {ref, computed} from "vue";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

const emit = defineEmits(["requestNewProduct", "requestDeleteProduct"]);

const selectedProduct = ref<ProductData>();

const dialogState = defineModel<AlbaranDialogState>("dialogState", {type: Object, required: true});

const sinInventarioChecked = computed({
	get: () => props.formSlot.sinInventario?.value ?? false,
	set: (value: boolean) => {
		if (props.formSlot.sinInventario) {
			props.formSlot.sinInventario.value = value;
		}
	}
});
</script>

<template>
	<div class="mb-4 p-4 border rounded-lg bg-yellow-50">
		<div class="flex items-center gap-2 mb-3">
			<Checkbox 
				inputId="sin-inventario" 
				v-model="sinInventarioChecked"
				binary 
				name="sinInventario"/>
			<label for="sin-inventario" class="font-semibold">No ha realizado inventario</label>
		</div>
		<div v-if="sinInventarioChecked" class="flex flex-col gap-1">
			<label for="motivo-sin-inventario" class="font-semibold">Motivo:</label>
			<Textarea 
				id="motivo-sin-inventario"
				name="motivoSinInventario"
				rows="3"
				class="w-full"
				placeholder="Indique el motivo por el cual no se ha realizado el inventario"/>
			<Message
				v-if="props.formSlot.motivoSinInventario?.invalid ?? false"
				severity="error"
				size="small"
				variant="simple"
				v-text="props.formSlot.motivoSinInventario.error.message">
			</Message>
			<Message severity="warn" size="small">
				Al marcar esta opción, la finca quedará en cuarentena hasta que se entregue el inventario.
			</Message>
		</div>
	</div>
	
	<div class="card mb-2">
		<DataTable
			:value="dialogState.products"
			v-model:selection="selectedProduct"
			scrollable
			scrollHeight="300px"
			selectionMode="single"
			:disabled="sinInventarioChecked"
			tableStyle="min-width: 50rem">
			<Column field="nombre" header="Descripción"></Column>
			<Column field="materiaActiva" header="Materia Activa"></Column>
			<Column field="plaga" header="Plaga"></Column>
			<Column field="plazoSeguimiento" header="Plazo seguimiento"></Column>
			<Column field="dosis" header="Dosis"></Column>
		</DataTable>
	</div>
	<div class="flex flex-row gap-2">
		<Button
			type="button"
			label="Nuevo producto"
			icon="pi pi-plus"
			variant="outlined"
			:disabled="sinInventarioChecked"
			@click="emit('requestNewProduct')"/>
		<Button
			:disabled="!selectedProduct || sinInventarioChecked"
			type="button"
			label="Borrar producto"
			icon="pi pi-trash"
			variant="outlined"
			severity="danger"
			@click="emit('requestDeleteProduct', selectedProduct)"/>
	</div>
</template>

<style scoped>

</style>
