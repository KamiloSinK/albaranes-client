<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import type {FormResolverOptions, FormSubmitEvent} from "@primevue/forms";
import {ref, watch} from "vue";
import type {AlbaranMaquinaria, AlbaranNivel, RetrieveProductResponse} from "@coa/api-types";
import type {SelectChangeEvent, SelectFilterEvent, VirtualScrollerLazyEvent} from "primevue";
import * as productos from "@/services/productos";
import {useMasterDataCache} from "@/composables/useMasterDataCache";
import {useLazySelect} from "@/composables/useLazySelect";
import {useNetworkStatus} from "@/composables/useNetworkStatus";
import {cacheService} from "@/services/cacheService";
import {useSession} from "@/composables/useSession";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const emit = defineEmits(["addProduct"]);

// Cache y estado de red
const {isOnline} = useNetworkStatus();
const {getProductos, getProductosLite} = useMasterDataCache();
const {hasSession} = useSession();

// Debounce para búsqueda
let filterTimeout: ReturnType<typeof setTimeout> | null = null;

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
const productosLazy = useLazySelect<ProductoLite>();
const productList = productosLazy.items;
const loadingProduct = productosLazy.loading;
const mapProductoLite = (p: any): ProductoLite => ({ id: p.id, nombre: p.nombre, bc_id: p.bc_id });

const previewMateriaActiva = ref<string>("");
const previewPlazoSeguimiento = ref<string>("");
const previewDosis = ref<string>("");
const previewPlaga = ref<string>("");

// Carga inicial de productos (50 items para el Select)
async function loadInitialProducts() {
    // Cache completo de productos (materiaActiva, dosis, plaga...) desactualizado o vacío
    // (p. ej. tras borrar datos del navegador): refrescarlo en segundo plano si hay conexión.
    if (isOnline.value && cacheService.needsUpdate('productos')) {
        cacheService.refreshExpiredCaches().catch((err) => console.error('Error refrescando cache de productos:', err));
    }

    if (productList.value.length > 0) return; // Ya están cargados
    await productosLazy.loadInitial(
        (p) => productos.retrieveProductos(p),
        { cacheFn: getProductosLite, mapFn: mapProductoLite, isOnline: isOnline.value, hasSession: hasSession() }
    );
}

// Lazy load para virtual scroller - carga datos cuando el usuario scrollea
async function onLazyLoadProducts(e: VirtualScrollerLazyEvent) {
    await productosLazy.onLazyLoad(e,
        (p) => productos.retrieveProductos(p),
        { mapFn: mapProductoLite, isOnline: isOnline.value, hasSession: hasSession() }
    );
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

// Buscar productos en API cuando el usuario filtra por nombre
async function onFilterProduct(e: SelectFilterEvent) {
    const searchTerm = e.value?.trim() ?? '';
    
    // Si el término es muy corto, no buscar en API
    if (searchTerm.length < 2) return;
    
    // Debounce: esperar 300ms antes de buscar
    if (filterTimeout) clearTimeout(filterTimeout);
    
    filterTimeout = setTimeout(async () => {
        // Solo buscar en API si estamos online y hay sesión
        if (!isOnline.value || !hasSession()) return;
        
        try {
            const response = await productos.retrieveProductos({ contains: searchTerm, limit: 50 });
            if (response.ok) {
                const data: RetrieveProductResponse[] = await response.json();
                
                productosLazy.addItems(data.map(mapProductoLite));
            }
        } catch (err) {
            console.error('Error buscando productos en API:', err);
        }
    }, 750);
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
                            @filter="onFilterProduct"
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
