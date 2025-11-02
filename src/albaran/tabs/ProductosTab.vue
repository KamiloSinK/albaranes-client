<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {AlbaranDialogState, ProductData} from "@/albaran/AlbaranDialog.vue";
import {ref} from "vue";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

const emit = defineEmits(["requestNewProduct", "requestDeleteProduct"]);

const selectedProduct = ref<ProductData>();

const dialogState = defineModel<AlbaranDialogState>("dialogState", {type: Object, required: true});
</script>

<template>
	<div class="card mb-2">
		<DataTable
			:value="dialogState.products"
			v-model:selection="selectedProduct"
			scrollable
			scrollHeight="300px"
			selectionMode="single"
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
			@click="emit('requestNewProduct')"/>
		<Button
			:disabled="!selectedProduct"
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
