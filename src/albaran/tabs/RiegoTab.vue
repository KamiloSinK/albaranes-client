<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {AlbaranDialogState} from "@/albaran/AlbaranDialog.vue";
import type {AlbaranDiasSemana, AlbaranDuracionPlanAbono} from "@coa/api-types";
import {ref} from "vue";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

const dialogState = defineModel<AlbaranDialogState>("dialogState", {type: Object, required: true});

interface SelectOptions<V> {
	label: string;
	value: V;
}

const duracionPlanAbonoOptions = ref<SelectOptions<AlbaranDuracionPlanAbono>[]>([
	{
		label: "Indefinido",
		value: "indefinido"
	},
	{
		label: "15 días",
		value: "15dias"
	},
	{
		label: "1 semana",
		value: "1semana"
	},
	{
		label: "1 mes",
		value: "1mes"
	}
]);

function onClickCheckAll() {
	props.formSlot.riegoTanqueDias.value = <AlbaranDiasSemana[]>[
		"lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"
	];
}
</script>

<template>
	<div class="max-w-xl space-y-4">
		<div class="flex items-center gap-2">
			<div class="flex-1 flex flex-col gap-1">
				<label class="w-full text-start font-semibold pr-2" for="albaran-riego-ce">CE:</label>
				<InputNumber
					inputId="albaran-riego-ce"
					prefix="+"
					:max-fraction-digits="1"
					fluid
					name="riegoCE"/>
				<Message
					v-if="props.formSlot.riegoCE?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.riegoCE.error.message">
				</Message>
			</div>
			<div class="flex-1 flex flex-col gap-1">
				<label class="w-full text-start font-semibold pr-2" for="albaran-riego-lm2">L/m2:</label>
				<InputNumber
					inputId="albaran-riego-lm2"
					:max-fraction-digits="4"
					fluid
					name="riegoLm2"/>
				<Message
					v-if="props.formSlot.riegoLm2?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.riegoLm2.error.message">
				</Message>
			</div>
			<div class="flex-1 flex flex-col gap-1">
				<label class="w-full text-start font-semibold pr-2" for="albaran-riego-tiempo">Tiempo de riego:</label>
				<InputNumber
					inputId="albaran-riego-tiempo"
					suffix="min."
					fluid
					placeholder="En minutos"
					name="riegoTiempoMin"/>
				<Message
					v-if="props.formSlot.riegoTiempoMin?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.riegoTiempoMin.error.message">
				</Message>
			</div>
		</div>
		<div class="w-full flex flex-col gap-1">
			<label class="w-full text-start font-semibold pr-2" for="albaran-riego-equilibrio">Equilibrio:</label>
			<InputText
				id="albaran-riego-equilibrio"
				name="riegoEquilibrio"
				fluid/>
			<Message
				v-if="props.formSlot.riegoEquilibrio?.invalid ?? false"
				severity="error"
				size="small"
				variant="simple"
				v-text="props.formSlot.riegoEquilibrio.error.message">
			</Message>
		</div>
		<div class="w-full flex flex-col gap-1">
			<label class="w-full text-start font-semibold pr-2">Duración plan abono:</label>
			<Select
				:options="duracionPlanAbonoOptions"
				optionLabel="label"
				optionValue="value"
				name="riegoDuracionPlanAbono"
				fluid/>
			<Message
				v-if="props.formSlot.riegoDuracionPlanAbono?.invalid ?? false"
				severity="error"
				size="small"
				variant="simple"
				v-text="props.formSlot.riegoDuracionPlanAbono.error.message">
			</Message>
		</div>
		<div class="w-full flex flex-col gap-1">
			<label class="w-full text-start font-semibold pr-2">Tanque:</label>
			<div class="flex items-center gap-2">
				<Button
					type="button"
					label="Todos"
					variant="outlined"
					@click="onClickCheckAll"/>
				<CheckboxGroup name="riegoTanqueDias" class="flex-1 flex items-center gap-2">
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-l" class="w-full text-center">L</label>
						<Checkbox inputId="albaran-riego-tanque-dia-l" value="lunes"/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-m" class="w-full text-center">M</label>
						<Checkbox inputId="albaran-riego-tanque-dia-m" value="martes"/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-x" class="w-full text-center">X</label>
						<Checkbox inputId="albaran-riego-tanque-dia-x" value="miercoles"/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-j" class="w-full text-center">J</label>
						<Checkbox inputId="albaran-riego-tanque-dia-j" value="jueves"/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-v" class="w-full text-center">V</label>
						<Checkbox inputId="albaran-riego-tanque-dia-v" value="viernes"/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-s" class="w-full text-center">S</label>
						<Checkbox inputId="albaran-riego-tanque-dia-s" value="sabado"/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="albaran-riego-tanque-dia-d" class="w-full text-center">D</label>
						<Checkbox inputId="albaran-riego-tanque-dia-d" value="domingo"/>
					</div>
				</CheckboxGroup>
			</div>
		</div>
	</div>
</template>

<style scoped>

</style>
