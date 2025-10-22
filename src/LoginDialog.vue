<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {Form, type FormResolverOptions, type FormSubmitEvent} from "@primevue/forms";
import {ref} from "vue";
import type {LoginResponse} from "@coa/api-types";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const isLoading = ref<boolean>(false);

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (!values.username)
		errors.username = [{message: "Campo obligatorio"}];

	if (!values.password)
		errors.password = [{message: "Campo obligatorio"}];

	return {
		values,
		errors
	}
}

async function onSubmitForm(e: FormSubmitEvent) {
	if (!e.valid || isLoading.value)
		return;

	isLoading.value = true;

	try {
		const formData = new URLSearchParams({
			username: e.values.username,
			password: e.values.password
		}).toString();
		const response = await fetch(`${import.meta.env.VITE_API_HOST}/user/login`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded"
			},
			mode: "cors",
			credentials: "include",
			body: formData
		});

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("El nombre de usuario o contraseña es incorrecta");
					break;
				default:
					alert("Error interno del servidor");
					break;
			}
			return;
		}

		const data: LoginResponse = await response.json();
		visible.value = false;
	} catch (err: unknown) {
		alert("Error al iniciar sesión\nAsegúrate de estar conectado a Internet.")
		console.error(err);
	} finally {
		isLoading.value = false;
	}
}
</script>

<template>
	<Dialog
		header="Iniciar sesión"
		modal
		v-model:visible="visible"
		:style="{ width: '20rem' }"
		:breakpoints="{ '1000px': '95vw' }"
		:closable="false">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" class="p-2">
			<div class="flex-1 flex flex-col gap-1 mb-2">
				<label for="login-username">Nombre de usuario:</label>
				<InputText id="login-username" autocomplete="username" name="username" fluid />
				<Message
					v-if="$form.username?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="$form.username.error.message">
				</Message>
			</div>
			<div class="flex-1 flex flex-col gap-1 mb-2">
				<label for="login-password">Contraseña:</label>
				<Password inputId="login-password" name="password" :inputProps="{autocomplete: 'current-password'}" :feedback="false" fluid toggleMask />
				<Message
					v-if="$form.password?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="$form.password.error.message">
				</Message>
			</div>
			<div class="w-full">
				<Button
					:loading="isLoading"
					label="Iniciar sesión"
					type="submit"
					variant="outlined"
					fluid/>
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>

</style>
