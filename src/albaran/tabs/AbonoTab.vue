<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {AbonoData, AlbaranDialogState} from "@/albaran/AlbaranDialog.vue";
import {ref} from "vue";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

const emit = defineEmits(["requestNewAbono", "requestDeleteAbono"]);
const selectedAbonoTanqueA = ref<AbonoData>();
const selectedAbonoTanqueB = ref<AbonoData>();

const dialogState = defineModel<AlbaranDialogState>("dialogState", {type: Object, required: true});
</script>

<template>
	<div class="card mb-2">
		<DataTable
			:value="dialogState.abonosTanqueA"
			v-model:selection="selectedAbonoTanqueA"
			scrollable
			scrollHeight="300px"
			selectionMode="single"
			tableStyle="min-width: 50rem">
			<!-- <Column field="id" header="Código"></Column> -->
			<Column field="nombre" header="Producto Tanque A"></Column>
		</DataTable>
	</div>
	<div class="flex flex-row gap-2 mb-2">
		<Button
			type="button"
			label="Nuevo producto para tanque A"
			icon="pi pi-plus"
			variant="outlined"
			@click="emit('requestNewAbono', 'A')"/>
		<Button
			:disabled="!selectedAbonoTanqueA"
			type="button"
			label="Borrar producto"
			icon="pi pi-trash"
			variant="outlined"
			severity="danger"
			@click="emit('requestDeleteAbono', 'A', selectedAbonoTanqueA)"/>
	</div>
	<hr>
	<div class="card mb-2">
		<DataTable
			:value="dialogState.abonosTanqueB"
			v-model:selection="selectedAbonoTanqueB"
			scrollable
			scrollHeight="300px"
			selectionMode="single"
			tableStyle="min-width: 50rem">
			<!-- <Column field="id" header="Código"></Column> -->
			<Column field="nombre" header="Producto Tanque B"></Column>
		</DataTable>
	</div>
	<div class="flex flex-row gap-2">
		<Button
			type="button"
			label="Nuevo producto para tanque B"
			icon="pi pi-plus"
			variant="outlined"
			@click="emit('requestNewAbono', 'B')"/>
		<Button
			:disabled="!selectedAbonoTanqueA"
			type="button"
			label="Borrar producto"
			icon="pi pi-trash"
			variant="outlined"
			severity="danger"
			@click="emit('requestDeleteAbono', 'B', selectedAbonoTanqueB)"/>
	</div>
</template>

<style scoped>

</style>
