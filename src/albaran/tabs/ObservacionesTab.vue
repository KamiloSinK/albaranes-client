<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {AlbaranDialogState} from "@/albaran/AlbaranDialog.vue";
import {computed} from "vue";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

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
	<div class="max-w-lg space-y-4">
		<div class="grid items-start">
			<label class="w-24 text-end font-semibold pr-2 pt-2" for="albaran-observaciones">Observaciones:</label>
			<div class="flex-1 flex flex-col gap-1">
				<Textarea class="min-h-48 h-48" name="observaciones" id="albaran-observaciones" fluid/>
			</div>
		</div>
		
		<!-- Sección de inventario ocultada por solicitud del usuario -->
		<!--
		<div class="flex items-start">
			<label class="w-24 text-end font-semibold pr-2 pt-2">Inventario:</label>
			<div class="flex-1 flex flex-col gap-1">
				<div class="flex items-center gap-2 mt-1">
					<Checkbox 
						inputId="sin-inventario" 
						v-model="sinInventarioChecked"
						binary 
						name="sinInventario"/>
					<label for="sin-inventario" class="font-semibold text-sm">No ha realizado inventario</label>
				</div>
				<div v-if="sinInventarioChecked" class="mt-3 pl-6 border-l-2 border-orange-200 bg-orange-50 p-3 rounded-r">
					<div class="flex flex-col gap-2">
						<label for="motivo-sin-inventario" class="font-semibold text-sm text-orange-800">Motivo:</label>
						<Textarea 
							id="motivo-sin-inventario"
							:value="props.formSlot.motivoSinInventario?.value"
							@input="(event) => { if (props.formSlot.motivoSinInventario) props.formSlot.motivoSinInventario.value = event.target.value }"
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
						<Message severity="warn" size="small" class="mt-1">
							⚠️ Al marcar esta opción, la finca quedará en cuarentena hasta que se entregue el inventario.
						</Message>
					</div>
				</div>
			</div>
		</div>
		-->
	</div>
</template>

<style scoped>

</style>
