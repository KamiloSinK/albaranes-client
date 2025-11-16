<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {FormResolverOptions, FormSubmitEvent} from "@primevue/forms";
import {ref, watch} from "vue";
import type {AlbaranMaquinaria, AlbaranNivel, RetrieveProductResponse} from "@coa/api-types";
import type {SelectChangeEvent, VirtualScrollerLazyEvent} from "primevue";
import * as productos from "@/services/productos";
import {useMasterDataCache} from "@/composables/useMasterDataCache";
import {useNetworkStatus} from "@/composables/useNetworkStatus";
import {cacheService} from "@/services/cacheService";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["addProduct"]);

// Cache y estado de red
const {isOnline} = useNetworkStatus();
const {getProductos, getProductosLite} = useMasterDataCache();

interface SelectOptions<V> {
	label: string;
	value: V;
}

const maquinariaOptions = ref<SelectOptions<AlbaranMaquinaria>[]>([
	{label: "Pulverizador", value: "pulverizador"},
	{label: "Espolvoreador", value: "espolvoreador"},
	{label: "Riego", value: "riego"},
	{label: "Mochila", value: "mochila"},
	{label: "Siembra manual", value: "siembra-manual"}
]);

const nivelOptions = ref<SelectOptions<AlbaranNivel>[]>([
	{label: "Alta", value: "alta"},
	{label: "Media", value: "media"},
	{label: "Baja", value: "baja"}
]);

type ProductoLite = { id: number; nombre: string; bc_id?: string }
const productList = ref<ProductoLite[]>([]);
const loadingProduct = ref<boolean>(false);

const previewMateriaActiva = ref<string>("");
const previewPlazoSeguimiento = ref<string>("");
const previewDosis = ref<string>("");
const previewPlaga = ref<string>("");

// Carga inicial rápida desde cache y refresco en segundo plano si aplica
async function loadInitialProducts() {
    if (productList.value.length > 0) return; // Ya están cargados

    loadingProduct.value = true;
    try {
        // Siempre pintar primero desde cache para abrir el Select rápido
        const cachedLite = getProductosLite();
        if (cachedLite.length > 0) {
            productList.value = cachedLite;
        }

        // Si hay conexión, refrescar siempre en background
        if (isOnline.value) {
            void refreshProductos();
        }
    } catch (err: unknown) {
        console.error('Error al cargar productos iniciales:', err);
    } finally {
        loadingProduct.value = false;
    }
}

async function refreshProductos() {
    try {
        const response = await productos.retrieveProductos({
            limit: 1000, // lote razonable para refresco sin bloquear UI
            offset: 0
        });
        if (response.ok) {
            const data: RetrieveProductResponse[] = await response.json();
            productList.value = data.map((p) => ({ id: p.id, nombre: p.nombre, bc_id: (p as any)?.bc_id ?? (p as any)?.bcId ?? (p as any)?.bcID ?? (p as any)?.codigoBc ?? (p as any)?.codigo_bc }));
        }
    } catch (err: unknown) {
        console.error('Error al refrescar productos desde API:', err);
    }
}

async function onLazyLoadProducts(e: VirtualScrollerLazyEvent) {
	if (loadingProduct.value)
		return;

	loadingProduct.value = true;

	try {
    // Si no hay internet, usar cache
        if (!isOnline.value) {
            console.log('Sin conexión, cargando productos desde cache para lazy load...');
            const cachedProducts = getProductosLite();
            
            // Simular paginación con los datos del cache
            const startIndex = e.first;
            const endIndex = e.last;
            const paginatedData = cachedProducts.slice(startIndex, endIndex);
            
            const items = [...productList.value];
            for (let i = 0; i < paginatedData.length; i++) {
                items[startIndex + i] = paginatedData[i];
            }
            
            productList.value = items;
            return;
        }

        // Con conexión, consultar siempre a la API
    let limit = e.last - e.first;
    // En primera carga algunos navegadores reportan 0; usar un lote pequeño
    if (limit <= 0)
        limit = 200;

		const response = await productos.retrieveProductos({
			limit: limit,
			offset: e.first
		});

        const data: RetrieveProductResponse[] = await response.json();
        const items = [...productList.value];
        for (let i = 0; i < data.length; i++)
            items[e.first + i] = { id: data[i].id, nombre: data[i].nombre, bc_id: (data[i] as any)?.bc_id ?? (data[i] as any)?.bcId ?? (data[i] as any)?.bcID ?? (data[i] as any)?.codigoBc ?? (data[i] as any)?.codigo_bc } as ProductoLite;

		productList.value = items;
	} catch (err: unknown) {
		console.error("Error al cargar productos:", err);
		// En caso de error, intentar cargar desde cache
        console.log('Error en API, intentando cargar productos desde cache...');
        const cachedProducts = getProductosLite();
		if (cachedProducts.length > 0) {
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedProducts.slice(startIndex, endIndex);
			
			const items = [...productList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			productList.value = items;
		}
	} finally {
		loadingProduct.value = false;
	}
}

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (!values.maquinaria)
		errors.maquinaria = [{message: "Campo obligatorio"}];

	if (!values.nivel)
		errors.nivel = [{message: "Campo obligatorio"}];

	if (!values.product)
		errors.product = [{message: "Campo obligatorio"}];

	if ((values.gastosL ?? "").length <= 0)
		errors.gastosL = [{message: "Campo obligatorio"}];

	if (isNaN(values.gastosL))
		errors.gastosL = [{message: "Debe ser un número"}];

	return {
		values,
		errors
	};
}

async function onSelectProduct(e: SelectChangeEvent) {
    try {
        const selectedProductId: number = e.value as number;

        // Usar únicamente el cache para la vista previa; no hacer consultas a la API
        const fullCached = getProductos();
        const cachedDetail = Array.isArray(fullCached)
            ? (fullCached as any[]).find((p: any) => p.id === selectedProductId)
            : undefined;

        previewMateriaActiva.value = cachedDetail?.materiaActiva ?? "";
        previewPlazoSeguimiento.value = cachedDetail?.plazoSeguimiento?.toString() ?? "";
        previewDosis.value = cachedDetail?.dosis ?? "";
        previewPlaga.value = cachedDetail?.plaga ?? "";
    } catch (err: unknown) {
        console.error('Error al seleccionar producto:', err);
        previewMateriaActiva.value = "";
        previewPlazoSeguimiento.value = "";
        previewDosis.value = "";
        previewPlaga.value = "";
    }
}

function onSubmitForm(e: FormSubmitEvent) {
    if (!e.valid)
        return;

    // Transformar el valor del producto (id) en objeto ligero con nombre
    const selectedId: number = e.values.product as number;
    const selectedLite = productList.value.find(p => p.id === selectedId);
    const productObj: any = {
        id: selectedId,
        nombre: selectedLite?.nombre ?? '',
        bc_id: selectedLite?.bc_id
    };

    const payload = {
        valid: true,
        values: {
            maquinaria: e.values.maquinaria,
            nivel: e.values.nivel,
            gastosL: e.values.gastosL,
            product: productObj
        }
    } as any;

    emit("addProduct", payload);
    onResetForm();
    visible.value = false;
}

function onResetForm() {
	previewMateriaActiva.value = "";
	previewPlazoSeguimiento.value = "";
	previewDosis.value = "";
	previewPlaga.value = "";
}

// Cargar productos cuando se abra el diálogo
watch(visible, (newValue) => {
	if (newValue) {
		loadInitialProducts();
	}
});
</script>

<template>
	<Dialog
		modal
		header="Productos - Nuevo"
		v-model:visible="visible"
		:style="{ width: '40rem' }"
		:breakpoints="{ '512px': '95vw' }">
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" @reset="onResetForm">
			<div class="space-y-4 m-0 p-4">
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Maquinaria:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							:options="maquinariaOptions"
							name="maquinaria"
							optionLabel="label"
							optionValue="value"
							placeholder="Seleccione"/>
						<Message
							v-if="$form.maquinaria?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.maquinaria.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Nivel:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							:options="nivelOptions"
							name="nivel"
							optionLabel="label"
							optionValue="value"
							placeholder="Seleccione"/>
						<Message
							v-if="$form.nivel?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.nivel.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Producto:</label>
					<div class="flex-1 flex flex-col gap-1">
						<Select
							:options="productList"
							:virtualScrollerOptions="{
								lazy: true,
								onLazyLoad: onLazyLoadProducts,
								itemSize: 36,
								showLoader: true,
								loading: loadingProduct
							}"
                            @change="onSelectProduct"
                            name="product"
                            optionLabel="nombre"
                            optionValue="id"
                            :filterFields="['nombre','bc_id']"
                            placeholder="Seleccione"
                            filter
                            class="w-full"/>
						<Message
							v-if="$form.product?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.product.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2" for="albaran-new-product-gastos">Gastos
						(K/L):</label>
					<div class="flex-1 flex flex-col gap-1">
						<InputNumber
							:useGrouping="false"
							inputId="albaran-new-product-gastos"
							name="gastosL"
							class="w-full"/>
						<Message
							v-if="$form.gastosL?.invalid ?? false"
							severity="error"
							size="small"
							variant="simple"
							v-text="$form.gastosL.error.message">
						</Message>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Mat. Activa:</label>
					<InputText
						disabled
						v-model="previewMateriaActiva"
						name="previewMateriaActiva"
						class="flex-1"/>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Plazo Seg.:</label>
					<div class="flex-1 flex flex-row gap-1 items-center">
						<InputText
							disabled
							v-model="previewPlazoSeguimiento"
							name="previewPlazoSeguimiento"
							class="flex-1 w-full"
						/>
						<label class="w-18 text-end font-semibold pr-2">Dosis:</label>
						<InputText
							disabled
							v-model="previewDosis"
							name="previewDosis"
							class="flex-1 w-full"
						/>
					</div>
				</div>
				<div class="flex items-center">
					<label class="w-28 text-end font-semibold pr-2">Plaga:</label>
					<InputText
						disabled
						v-model="previewPlaga"
						name="previewPlaga"
						class="flex-1"/>
				</div>
			</div>
			<hr>
			<div class="flex space-x-2 p-4 w-full">
				<Button
					icon="pi pi-clipboard"
					label="Limpiar datos"
					iconPos="top"
					type="reset"
					class="large-icon-button"
					variant="outlined"/>
				<Button
					icon="pi pi-save"
					label="Grabar"
					iconPos="top"
					type="submit"
					class="large-icon-button"
					:disabled="!$form.valid"
					variant="outlined"/>
			</div>
		</Form>
	</Dialog>
</template>

<style scoped>
/*noinspection CssUnusedSymbol*/
.large-icon-button :deep(.pi) {
	font-size: 1.36rem;
}
</style>
