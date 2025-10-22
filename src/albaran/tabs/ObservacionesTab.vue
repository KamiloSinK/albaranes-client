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
		<label for="albaran-observaciones">Observaciones:</label>
		<Textarea class="min-h-48 h-48" name="observaciones" fluid/>
	</div>
</template>

<style scoped>

</style>
