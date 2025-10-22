<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {AlbaranDialogState} from "@/albaran/AlbaranDialog.vue";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

const dialogState = defineModel<AlbaranDialogState>("dialogState", {type: Object, required: true});
</script>

<template>
	<div class="max-w-lg space-y-4">
		<label for="albaran-firma">Firma:</label>
		<InputText name="firma" fluid placeholder="Nombre completo"/>
		<Message
			v-if="props.formSlot.firma?.invalid ?? false"
			severity="error"
			size="small"
			variant="simple"
			v-text="props.formSlot.firma.error.message">
		</Message>
	</div>
</template>

<style scoped>

</style>
