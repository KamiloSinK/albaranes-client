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
	<div class="max-w-lg flex items-center gap-2">
		<CheckboxGroup class="w-full" name="laboresCulturales">
			<div class="flex-1 flex flex-col gap-1">
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-eliminar-malas-hierbas" value="eliminar-malas-hierbas" />
					<label for="albaran-labores-culturales-eliminar-malas-hierbas">Eliminar malas hierbas</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-colocar-placas" value="colocar-placas" />
					<label for="albaran-labores-culturales-colocar-placas">Colocar placas</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-despuntar" value="despuntar" />
					<label for="albaran-labores-culturales-despuntar">Despuntar</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-deshijar" value="deshijar" />
					<label for="albaran-labores-culturales-deshijar">Deshijar</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-deshojar" value="deshojar" />
					<label for="albaran-labores-culturales-deshojar">Deshojar</label>
				</div>
			</div>
			<div class="flex-1 flex flex-col gap-1">
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-eliminar-plantas-viroticas" value="eliminar-plantas-viroticas" />
					<label for="albaran-labores-culturales-eliminar-plantas-viroticas">Eliminar plantas viróticas</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-reponer-abejorros" value="reponer-abejorros" />
					<label for="albaran-labores-culturales-reponer-abejorros">Reponer abejorros</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-entuturar" value="entuturar" />
					<label for="albaran-labores-culturales-entuturar">Entuturar</label>
				</div>
				<div class="w-full flex items-center gap-2">
					<Checkbox inputId="albaran-labores-culturales-descolgar" value="descolgar" />
					<label for="albaran-labores-culturales-descolgar">Descolgar</label>
				</div>
			</div>
		</CheckboxGroup>
	</div>
</template>

<style scoped>

</style>
