<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {Form, type FormResolverOptions, type FormSubmitEvent} from "@primevue/forms";
const visible = defineModel("visible", {type: Boolean, required: true, default: false});

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	return {
		values,
		errors
	};
}

function onSubmitForm(e: FormSubmitEvent) {

}

function onHideDialog() {}
</script>

<template>
	<Dialog
		header="Listado de Albaranes"
		modal
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '1000px': '95vw' }"
		@hide="onHideDialog">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off">

		</Form>
	</Dialog>
</template>

<style scoped>

</style>
