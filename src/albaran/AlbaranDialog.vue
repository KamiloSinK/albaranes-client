<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import * as albaranes from "@/services/albaranes";
import {Form, type FormResolverOptions, type FormSubmitEvent} from "@primevue/forms";
import Menu from "primevue/menu";
import {reactive, ref} from "vue";
import type {MenuItem} from "primevue/menuitem";
import { useNetworkStatus } from "@/composables/useNetworkStatus";
import { offlineStorage } from "@/services/offlineStorage";
import GeneralTab from "@/albaran/tabs/GeneralTab.vue";
import ProductosTab from "@/albaran/tabs/ProductosTab.vue";
import ProductDialog from "@/albaran/ProductDialog.vue";
import type {
	AlbaranAbonoType,
	AlbaranProductType,
	NewAlbaranRequest,
	RetrieveAbonoResponse,
	RetrieveAlbaranResponse,
	RetrieveProductResponse
} from "@coa/api-types";
import AbonoDialog from "@/albaran/AbonoDialog.vue";
import AbonoTab from "@/albaran/tabs/AbonoTab.vue";
import RiegoTab from "@/albaran/tabs/RiegoTab.vue";
import LaboresCulturalesTab from "@/albaran/tabs/LaboresCulturalesTab.vue";
import ObservacionesTab from "@/albaran/tabs/ObservacionesTab.vue";
import FirmaTab from "@/albaran/tabs/FirmaTab.vue";
import {Button, useConfirm} from "primevue";
import DuplicateDialog from "@/albaran/DuplicateDialog.vue";

const visible = defineModel("visible", {type: Boolean, required: true, default: false});
const isLoading = ref<boolean>(false);
const isDuplicating = ref<boolean>(false);
const isCopying = ref<boolean>(false);
const isDeleting = ref<boolean>(false);
const workaroundGeneralTab = ref<InstanceType<typeof GeneralTab>>();
const workaroundNewButton = ref();
const workaroundSaveButton = ref();

function getConfirm() {
    try {
        return useConfirm();
    } catch (e) {
        console.warn("PrimeVue Confirmation no disponible, usando confirm() nativo");
        return {
            require: ({ message, accept, reject }: any) => {
                if (window.confirm(message)) {
                    accept && accept();
                } else {
                    reject && reject();
                }
            }
        } as any;
    }
}

// Composable para detectar estado de conexión
const { isOnline, checkConnection } = useNetworkStatus();

export interface ProductData extends RetrieveProductResponse, Omit<AlbaranProductType, "productoId"> {
}

export interface AbonoData extends RetrieveAbonoResponse, Omit<AlbaranAbonoType, "abonoId"> {
}

const dialogVisible = ref({
	"ProductDialog": false,
	"AbonoDialog": false,
	"DuplicateDialog": false
});

function openDialog(dialogName: keyof (typeof dialogVisible.value)): void {
	dialogVisible.value[dialogName] = true;
}

export interface AlbaranDialogState {
	originalValues: RetrieveAlbaranResponse | null;
	products: ProductData[];
	abonosTanqueA: AbonoData[];
	abonosTanqueB: AbonoData[];
	currentEditAbonoTanque?: "A" | "B";
	selectedFincaSectorIds: number[];
}

const dialogState = reactive<AlbaranDialogState>({
	originalValues: null,
	products: [],
	abonosTanqueA: [],
	abonosTanqueB: [],
	selectedFincaSectorIds: []
});

const datosMenu = ref<InstanceType<typeof Menu>>();

function onHideDialog() {
    // Limpiar tablas de productos y abonos al cerrar el modal
    dialogState.products = [];
    dialogState.abonosTanqueA = [];
    dialogState.abonosTanqueB = [];
    dialogState.currentEditAbonoTanque = undefined;
}

function onClickDatosMenu(e: Event) {
	datosMenu.value?.toggle(e);
}

const datosMenuItems = ref<MenuItem[]>([
	{
		label: "Nuevo albarán",
		icon: "pi pi-clipboard",
		command: () => workaroundNewButton.value.$el.click()
	},
	{
		label: "Grabar albarán",
		icon: "pi pi-save",
		command: () => workaroundSaveButton.value.$el.click()
	},
	{
		label: "Imprimir albarán",
		icon: "pi pi-print",
		command: () => onClickPrint()
	},
	{
		label: "Borrar albarán",
		icon: "pi pi-trash",
		class: "menu-danger",
		command: () => onClickDelete()
	}
]);

function compareArrays<T>(oldArray: T[], newArray: T[]): { newElements: T[]; deletedElements: T[] } {
	// Convert arrays to sets for faster lookup
	const oldSet = new Set(oldArray);
	const newSet = new Set(newArray);

	// Elements in newArray but not in oldArray are new
	const newElements = newArray.filter(item => !oldSet.has(item));

	// Elements in oldArray but not in newArray were deleted
	const deletedElements = oldArray.filter(item => !newSet.has(item));

	return {newElements, deletedElements};
}

function formResolver(e: FormResolverOptions): Record<string, any> {
	const {values} = e;
	const errors: Record<string, any> = {};

	if (isNaN(values.albaranId))
		errors.albaranId = [{message: "Sólo se acepta números"}];

	if ((values.socioId ?? "").length <= 0)
		errors.socioId = [{message: "Campo obligatorio"}];

	if ((values.fincaId ?? "").length <= 0)
		errors.fincaId = [{message: "Campo obligatorio"}];

	if ((values.tecnico ?? "").length <= 0)
		errors.tecnico = [{message: "Campo obligatorio"}];

	if (!values.fechaInstrucciones)
		errors.fechaInstrucciones = [{message: "Campo obligatorio"}];

	if (!values.fechaEjecucion)
		errors.fechaEjecucion = [{message: "Campo obligatorio"}];

	if (!values.plazoEjecucion)
		errors.plazoEjecucion = [{message: "Campo obligatorio"}];

	if (values.sinInventario && (!values.motivoSinInventario || values.motivoSinInventario.trim().length <= 0))
		errors.motivoSinInventario = [{message: "El motivo es obligatorio cuando no se ha realizado inventario"}];

	if ((values.riegoCE ?? "").length <= 0)
		errors.riegoCE = [{message: "Campo obligatorio"}];

	if ((values.riegoLm2 ?? "").length <= 0)
		errors.riegoLm2 = [{message: "Campo obligatorio"}];

	if ((values.riegoTiempoMin ?? "").length <= 0)
		errors.riegoTiempoMin = [{message: "Campo obligatorio"}];

	if ((values.riegoEquilibrio ?? "").length <= 0)
		errors.riegoEquilibrio = [{message: "Campo obligatorio"}];

	if ((values.riegoDuracionPlanAbono ?? "").length <= 0)
		errors.riegoDuracionPlanAbono = [{message: "Campo obligatorio"}];

	if (!values.firma)
		errors.firma = [{message: "Campo obligatorio"}];

	return {
		values,
		errors
	};
}

async function onClickDelete() {
	if (!dialogState.originalValues) {
		alert("Sólo se puede borrar un albarán existente");
		return;
	}

    getConfirm().require({
		message: "Está a punto de borrar un albarán\nEsta acción es irreversible.",
		header: "Nuevo albarán",
		icon: "pi pi-info-circle",
		rejectLabel: "Cancelar",
		rejectProps: {
			label: "Cancelar",
			severity: "secondary",
			outlined: true
		},
		acceptProps: {
			label: "Borrar",
			severity: "danger"
		},
		accept: async () => {
			try {
				const response = await albaranes.deleteAlbaran(dialogState.originalValues!.albaranFullId);

				if (!response.ok) {
					switch (response.status) {
						case 403:
							alert("No tienes permiso para quitar el albarán");
							break;
						case 401:
							alert("No has iniciado sesión");
							break;
						default:
							alert("Error desconocido");
							console.error("HTTP error 500");
							console.error(await response.json());
							break;
					}
					return;
				}

				alert("Albarán borrado exitosamente");
				visible.value = false;
			} catch (err: unknown) {
				console.error(err);
			} finally {

			}
		}
	});
}

function onClickNew(formSlot: any) {
    getConfirm().require({
		message: "Advertencia: se perderán los cambios no guardados",
		header: "Nuevo albarán",
		icon: "pi pi-info-circle",
		rejectProps: {
			label: "Seguir editando",
			severity: "secondary",
			outlined: true
		},
		acceptProps: {
			label: "Nuevo"
		},
		accept: () => {
			dialogState.originalValues = null;
			dialogState.products = [];
			dialogState.abonosTanqueA = [];
			dialogState.abonosTanqueB = [];
			dialogState.selectedFincaSectorIds = [];
			formSlot.reset();
		}
	});
}

async function onClickDuplicate() {
	openDialog("DuplicateDialog");
}

async function onClickCopy() {
	if (isCopying.value)
		return;

	isCopying.value = true;

	try {
		if (!dialogState.originalValues) {
			alert("Carga un albarán para poder copiar el anterior");
			return;
		}

		await workaroundGeneralTab.value?.copyAnterior();
	} catch (err: unknown) {
		console.error(err);
	} finally {
		isCopying.value = false;
	}
}

function onClickPrint() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para imprimir un albarán, primero tiene que cargarlo.\n" +
			"Si estás creado uno nuevo, guárdarlo primero, y luego lo cargas usando el ID del nuevo albarán.");
		return;
	}

	let printableWindow = window.open("", "", "width=816,height=900");
	if (!printableWindow) {
		alert("No se puede abrir la ventana\nAsegúrate de habilitar las ventanas emergentes en el navegador.");
		return;
	}

	printableWindow.document.head.innerHTML = albaranes.printableHTMLHead;
	printableWindow.document.body.innerHTML = albaranes.generatePrintableHTMLBody([dialogState.originalValues]);

	printableWindow.document.close();
	printableWindow.focus();
	printableWindow.print();
	printableWindow.close();
}

async function onClickPrimerListado() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para cargar el albarán anterior, primero tiene que cargar un albarán");
		return;
	}

	await workaroundGeneralTab.value?.loadPrimerListado();
}

async function onClickListadoAnterior() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para cargar el albarán anterior, primero tiene que cargar un albarán");
		return;
	}

	await workaroundGeneralTab.value?.loadListadoAnterior();
}

async function onClickListadoSiguiente() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para cargar el albarán anterior, primero tiene que cargar un albarán");
		return;
	}

	await workaroundGeneralTab.value?.loadListadoSiguiente();
}

async function onClickUltimoListado() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para cargar el albarán anterior, primero tiene que cargar un albarán");
		return;
	}

	await workaroundGeneralTab.value?.loadUltimoListado();
}

async function onClickSocioAnterior() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para cargar el albarán anterior, primero tiene que cargar un albarán");
		return;
	}

	await workaroundGeneralTab.value?.loadSocioAnterior();
}

async function onClickSocioSiguiente() {
	if (!dialogState.originalValues?.albaranFullId) {
		alert("Para cargar el albarán siguiente, primero tiene que cargar un albarán");
		return;
	}

	await workaroundGeneralTab.value?.loadSocioSiguiente();
}

// Función auxiliar para construir el objeto NewAlbaranRequest
function buildAlbaranData(e: FormSubmitEvent): NewAlbaranRequest {
    return {
        general: {
            anio: new Date().getFullYear(),
            fincaId: workaroundGeneralTab.value!.selectedFincaId as number,
            socioId: workaroundGeneralTab.value!.selectedSocioId as number,
            tecnicoId: e.values.tecnico,
            fechaEjecucion: e.values.fechaEjecucion.toISOString().split("T")[0],
            fechaInstrucciones: e.values.fechaInstrucciones.toISOString().split("T")[0],
            pendiente: e.values.pendiente ?? false,
            plazoEjecucionDias: e.values.plazoEjecucion,
            sectoresActivados: e.values.sectorIds ?? [],
            sinInventario: e.values.sinInventario ?? false,
            motivoSinInventario: e.values.motivoSinInventario ?? undefined
        },
		productos: dialogState.products.map<AlbaranProductType>(product => ({
			productoId: product.id,
			maquinaria: product.maquinaria,
			nivel: product.nivel,
			gastosL: product.gastosL
		})),
		abono: {
			tanqueA: dialogState.abonosTanqueA.map<AlbaranAbonoType>(abono => ({
				abonoId: abono.id,
				kilos: abono.kilos
			})),
			tanqueB: dialogState.abonosTanqueB.map<AlbaranAbonoType>(abono => ({
				abonoId: abono.id,
				kilos: abono.kilos
			}))
		},
		riego: {
			ce: e.values.riegoCE,
			lm2: e.values.riegoLm2,
			tiempoRiegoMin: e.values.riegoTiempoMin,
			equilibrio: e.values.riegoEquilibrio,
			duracionPlanAbono: e.values.riegoDuracionPlanAbono,
			tanqueDiasSemana: e.values.riegoTanqueDias ?? []
		},
		laboresCulturales: e.values.laboresCulturales ?? [],
		observaciones: e.values.observaciones,
		firma: e.values.firma
	};
}

async function onSubmitForm(e: FormSubmitEvent) {
    if (isLoading.value || !e.valid)
        return;

    const socioIdSel = workaroundGeneralTab.value?.selectedSocioId;
    const fincaIdSel = workaroundGeneralTab.value?.selectedFincaId;
    if (socioIdSel == null || fincaIdSel == null) {
        alert("Debe seleccionar un socio y una finca válidos");
        return;
    }

    isLoading.value = true;

	// Verificar conexión a internet antes de proceder
	const hasConnection = await checkConnection();
	
	if (!hasConnection) {
		// No hay conexión - guardar offline
		try {
			const newData: NewAlbaranRequest = buildAlbaranData(e);
			
			if (dialogState.originalValues) {
				// Es una actualización
				const offlineId = offlineStorage.addOfflineAlbaran(
					newData, 
					'update', 
					dialogState.originalValues.albaranFullId
				);
				alert(`Sin conexión a internet.\n\nEl albarán ha sido guardado localmente y se sincronizará automáticamente cuando se recupere la conexión.\n\nID temporal: ${offlineId}`);
			} else {
				// Es un nuevo albarán
				const offlineId = offlineStorage.addOfflineAlbaran(newData, 'create');
				alert(`Sin conexión a internet.\n\nEl nuevo albarán ha sido guardado localmente y se sincronizará automáticamente cuando se recupere la conexión.\n\nID temporal: ${offlineId}`);
			}
			
			visible.value = false;
			return;
		} catch (error) {
			console.error('Error al guardar offline:', error);
			alert('Error al guardar el albarán offline. Por favor, inténtelo de nuevo.');
			return;
		} finally {
			isLoading.value = false;
		}
	}

	// Hay conexión - proceder normalmente
	try {
		const newData: NewAlbaranRequest = buildAlbaranData(e);

		// Check for update mode
		if (dialogState.originalValues) {
			let updatable = albaranes.buildPartialUpdates(dialogState.originalValues, newData);

		const originalProductIds: number[] = dialogState.originalValues.productos.map<number>((product: any) => product.productoId);
		const newProductIds: number[] = dialogState.products.map<number>((product: any) => product.id);
		const productDiff = compareArrays(originalProductIds, newProductIds);

		const originalAbonoIdsTanqueA: number[] = dialogState.originalValues.abono.tanqueA.map<number>((abono: any) => abono.abonoId);
		const originalAbonoIdsTanqueB: number[] = dialogState.originalValues.abono.tanqueB.map<number>((abono: any) => abono.abonoId);
			const newAbonoIdsTanqueA: number[] = dialogState.abonosTanqueA.map<number>(abono => abono.id);
			const newAbonoIdsTanqueB: number[] = dialogState.abonosTanqueB.map<number>(abono => abono.id);
			const abonoDiffTanqueA = compareArrays(originalAbonoIdsTanqueA, newAbonoIdsTanqueA);
			const abonoDiffTanqueB = compareArrays(originalAbonoIdsTanqueB, newAbonoIdsTanqueB);

			if (Math.max(
				Object.entries(updatable).length,
				productDiff.newElements.length,
				productDiff.deletedElements.length,
				abonoDiffTanqueA.newElements.length,
				abonoDiffTanqueA.deletedElements.length,
				abonoDiffTanqueB.newElements.length,
				abonoDiffTanqueB.deletedElements.length
			) <= 0) {
				alert("No has realizado cambios");
				return;
			}

			const albaranResponse = await albaranes.updateAlbaran(dialogState.originalValues.albaranFullId, updatable);

			if (!albaranResponse.ok) {
				switch (albaranResponse.status) {
					case 403:
						alert("No tienes permiso para modificar el albarán");
						break;
					case 401:
						alert("No has iniciado sesión");
						break;
					default:
						alert("Error desconocido");
						console.error("HTTP error 500");
						console.error(await albaranResponse.json());
						break;
				}
				return;
			}

			if (productDiff.newElements.length > 0) {
				const productResponse = await albaranes.addAlbaranProductos(
					dialogState.originalValues.albaranFullId,
					productDiff.newElements.map<AlbaranProductType>(productId => ({
						productoId: productId,
						maquinaria: dialogState.products.find(product => product.id === productId)!.maquinaria,
						nivel: dialogState.products.find(product => product.id === productId)!.nivel,
						gastosL: dialogState.products.find(product => product.id === productId)!.gastosL
					}))
				);

				if (!productResponse.ok) {
					switch (productResponse.status) {
						case 403:
							alert("No tienes permiso para modificar los productos del albarán");
							break;
						case 401:
							alert("No has iniciado sesión");
							break;
						default:
							alert("Error desconocido");
							console.error("HTTP error 500");
							console.error(await productResponse.json());
							break;
					}
					return;
				}
			}

			if (productDiff.deletedElements.length > 0) {
				const productResponse = await albaranes.deleteAlbaranProductos(
					dialogState.originalValues.albaranFullId,
					productDiff.deletedElements
				);

				if (!productResponse.ok) {
					switch (productResponse.status) {
						case 403:
							alert("No tienes permiso para quitar productos del albarán");
							break;
						case 401:
							alert("No has iniciado sesión");
							break;
						default:
							alert("Error desconocido");
							console.error("HTTP error 500");
							console.error(await productResponse.json());
							break;
					}
					return;
				}
			}

			if (abonoDiffTanqueA.newElements.length > 0 || abonoDiffTanqueB.newElements.length > 0) {
				const abonoResponse = await albaranes.addAlbaranAbonos(
					dialogState.originalValues.albaranFullId,
					{
						tanqueA: dialogState.abonosTanqueA.map<AlbaranAbonoType>(abono => ({
							abonoId: abono.id,
							kilos: abono.kilos
						})),
						tanqueB: dialogState.abonosTanqueB.map<AlbaranAbonoType>(abono => ({
							abonoId: abono.id,
							kilos: abono.kilos
						}))
					}
				);

				if (!abonoResponse.ok) {
					switch (abonoResponse.status) {
						case 403:
							alert("No tienes permiso para añadir abonos al albarán");
							break;
						case 401:
							alert("No has iniciado sesión");
							break;
						default:
							alert("Error desconocido");
							console.error("HTTP error 500");
							console.error(await abonoResponse.json());
							break;
					}
					return;
				}
			}

			if (abonoDiffTanqueA.deletedElements.length > 0 || abonoDiffTanqueB.deletedElements.length > 0) {
				const allAbonoIds: number[] = abonoDiffTanqueA.deletedElements.concat(abonoDiffTanqueB.deletedElements);
				const abonoResponse = await albaranes.deleteAlbaranAbonos(
					dialogState.originalValues.albaranFullId,
					allAbonoIds
				);

				if (!abonoResponse.ok) {
					switch (abonoResponse.status) {
						case 403:
							alert("No tienes permiso para quitar abonos del albarán");
							break;
						case 401:
							alert("No has iniciado sesión");
							break;
						default:
							alert("Error desconocido");
							console.error("HTTP error 500");
							console.error(await abonoResponse.json());
							break;
					}
					return;
				}
			}

			alert("Albarán actualizado exitosamente");
		} else {
			const response = await albaranes.newAlbaran(newData);

			if (!response.ok) {
				alert("Error al crear albaran");
				alert(`HTTP status: ${response.status}`);
				return;
			}

			alert("Albarán creado exitosamente");
			visible.value = false;
		}
	} catch (err: unknown) {
		console.error(err);

		if (err instanceof TypeError) {
			alert("Error de red, no se pudo completar la solicitud\n\nSin embargo: la solicitud fue puesta en cola para ser emitida en cuanto se recupere la conexión a Internet.\nPor favor, evitar hacer el mismo cambio 2 veces seguidas.");
		}
	} finally {
		isLoading.value = false;
	}
}

function onRequestNewProduct() {
	openDialog("ProductDialog");
}

function onRequestDeleteProduct(product?: ProductData) {
	if (!product) {
		alert("No has seleccionado el producto");
		return;
	}

    getConfirm().require({
		message: "Está a punto de borrar un producto\nUna vez borrado, tendrá que volver a añadirlo",
		header: "Borrar producto",
		icon: "pi pi-info-circle",
		rejectLabel: "Cancelar",
		rejectProps: {
			label: "Cancelar",
			severity: "secondary",
			outlined: true
		},
		acceptProps: {
			label: "Borrar",
			severity: "danger"
		},
		accept: () => {
			dialogState.products.splice(dialogState.products.indexOf(product), 1);
		}
	});
}

function onRequestNewAbono(tank: "A" | "B") {
	dialogState.currentEditAbonoTanque = tank;
	openDialog("AbonoDialog");
}

function onRequestDeleteAbono(tank: "A" | "B", abono?: AbonoData) {
	dialogState.currentEditAbonoTanque = tank;

	if (!abono) {
		alert("No has seleccionado el producto");
		return;
	}

    getConfirm().require({
		message: "Está a punto de borrar un producto\nUna vez borrado, tendrá que volver a añadirlo",
		header: "Borrar producto",
		icon: "pi pi-info-circle",
		rejectLabel: "Cancelar",
		rejectProps: {
			label: "Cancelar",
			severity: "secondary",
			outlined: true
		},
		acceptProps: {
			label: "Borrar",
			severity: "danger"
		},
		accept: () => {
			switch (tank) {
				case "A":
					dialogState.abonosTanqueA.splice(dialogState.abonosTanqueA.indexOf(abono), 1);
					break;
				case "B":
					dialogState.abonosTanqueB.splice(dialogState.abonosTanqueB.indexOf(abono), 1);
					break;
			}
		}
	});
}

function onAddNewProduct(e: FormSubmitEvent) {
	if (dialogState.products.find(product => product.id === e.values.product.id)) {
		alert("Ya has añadido ese producto\nPara añadirlo de nuevo, tienes que borrar el producto existente.");
		return;
	}

	dialogState.products.push({
		...e.values.product,
		maquinaria: e.values.maquinaria,
		nivel: e.values.nivel,
		gastosL: e.values.gastosL
	});
}

function onAddNewAbono(e: FormSubmitEvent) {
	switch (dialogState.currentEditAbonoTanque) {
		case "A": {
			dialogState.abonosTanqueA.push({
				...e.values.abono,
				kilos: e.values.kilos
			});
			break;
		}
		case "B": {
			dialogState.abonosTanqueB.push({
				...e.values.abono,
				kilos: e.values.kilos
			});
			break;
		}
	}

	dialogState.currentEditAbonoTanque = undefined;
}

function onDuplicateAlbaran(_e: FormSubmitEvent) {

}
</script>

<template>
	<Dialog
		header="Albaranes"
		maximizable
		modal
		v-model:visible="visible"
		:style="{ width: '61rem' }"
		:breakpoints="{ '1000px': '95vw' }"
		@hide="onHideDialog">
		<Toolbar class="compact-toolbar">
			<template #start>
				<Button
					label="Datos"
					icon="pi pi-chevron-down"
					iconPos="right"
					type="button"
					severity="secondary"
					aria-haspopup="true"
					aria-controls="menu-datos"
					@click="onClickDatosMenu"
					text/>
				<Menu ref="datosMenu" id="menu-datos" :model="datosMenuItems" :popup="true"/>
				<div class="toolbar-separator" role="separator"></div>
				<span class="mr-2">Socio actual:</span>
				<Button
					@click="onClickSocioAnterior"
					icon="pi pi-arrow-left"
					rounded
					variant="outlined"
					class="mr-2 smaller-iconbutton"
					aria-label="Socio anterior"/>
				<Button
					@click="onClickSocioSiguiente"
					icon="pi pi-arrow-right"
					rounded
					variant="outlined"
					class="smaller-iconbutton"
					aria-label="Socio siguiente"/>
				<div class="toolbar-separator" role="separator"></div>
				<span class="mr-2">Listado general:</span>
				<Button
					@click="onClickPrimerListado"
					icon="pi pi-step-backward"
					rounded
					variant="outlined"
					class="mr-2 smaller-iconbutton"
					aria-label="Primer listado"/>
				<Button
					@click="onClickListadoAnterior"
					icon="pi pi-arrow-left"
					rounded
					variant="outlined"
					class="mr-2 smaller-iconbutton"
					aria-label="Listado anterior"/>
				<Button
					@click="onClickListadoSiguiente"
					icon="pi pi-arrow-right"
					rounded
					variant="outlined"
					class="mr-2 smaller-iconbutton"
					aria-label="Listado siguiente"/>
				<Button
					@click="onClickUltimoListado"
					icon="pi pi-step-forward"
					rounded
					variant="outlined"
					class="mr-2 smaller-iconbutton"
					aria-label="Último listado"/>
				<div class="toolbar-separator" role="separator"></div>
				<Button
					@click="onClickDuplicate"
					:loading="isDuplicating"
					label="Duplicar"
					class="mr-2 smaller-textbutton"
					variant="outlined"/>
				<Button
					:disabled="dialogState.originalValues === null"
					:loading="isDeleting"
					@click="onClickDelete"
					label="Borrar albarán"
					icon="pi pi-trash"
					class="mr-2 smaller-textbutton"
					severity="danger"
					variant="outlined"/>
			</template>
		</Toolbar>
		<Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off">
			<Tabs value="0">
				<TabList>
					<Tab value="0"
					     :class="{
						'!text-red-600': (
							($form.socioId?.invalid ?? false)
							|| ($form.fincaId?.invalid ?? false)
							|| ($form.tecnico?.invalid ?? false)
							|| ($form.fechaInstrucciones?.invalid ?? false)
							|| ($form.fechaEjecucion?.invalid ?? false)
							|| ($form.plazoEjecucion?.invalid ?? false)
						)
					}">General
					</Tab>
					<Tab value="1">Productos</Tab>
					<Tab value="2">Abono</Tab>
					<Tab value="3"
					     :class="{
						'!text-red-600': (
							($form.riegoCE?.invalid ?? false)
							|| ($form.riegoLm2?.invalid ?? false)
							|| ($form.riegoTiempoMin?.invalid ?? false)
							|| ($form.riegoEquilibrio?.invalid ?? false)
							|| ($form.riegoDuracionPlanAbono?.invalid ?? false)
						)
					}">Riego
					</Tab>
					<Tab value="4">Labores culturales</Tab>
					<Tab value="5">Observaciones</Tab>
					<Tab value="6" :class="{'!text-red-600': $form.firma?.invalid ?? false}">Firma</Tab>
				</TabList>
				<TabPanels>
					<TabPanel value="0">
						<GeneralTab class="m-0" :formSlot="$form" v-model:dialogState="dialogState"
						            ref="workaroundGeneralTab"/>
					</TabPanel>
					<TabPanel value="1">
						<ProductosTab :formSlot="$form" v-model:dialogState="dialogState"
						              @requestNewProduct="onRequestNewProduct"
						              @requestDeleteProduct="onRequestDeleteProduct"/>
					</TabPanel>
					<TabPanel value="2">
						<AbonoTab :formSlot="$form" v-model:dialogState="dialogState"
						          @requestNewAbono="onRequestNewAbono" @requestDeleteAbono="onRequestDeleteAbono"/>
					</TabPanel>
					<TabPanel value="3">
						<RiegoTab :formSlot="$form" v-model:dialogState="dialogState"/>
					</TabPanel>
					<TabPanel value="4">
						<LaboresCulturalesTab :formSlot="$form" v-model:dialogState="dialogState"/>
					</TabPanel>
					<TabPanel value="5">
						<ObservacionesTab :formSlot="$form" v-model:dialogState="dialogState"/>
					</TabPanel>
					<TabPanel value="6">
						<FirmaTab :formSlot="$form" v-model:dialogState="dialogState"/>
					</TabPanel>
					<TabPanel value="7">
						<div class="m-0">
							<h1>DEBUG</h1>
							<pre>
								<code>
									{{ $form }}
								</code>
							</pre>
						</div>
					</TabPanel>
				</TabPanels>
			</Tabs>
			<hr>
			<div class="flex space-x-2 p-4 w-full">
				<Button
					ref="workaroundNewButton"
					icon="pi pi-clipboard"
					label="Nuevo"
					iconPos="top"
					type="button"
					class="large-icon-button"
					variant="outlined"
					:customForm="$form"
					:disabled="isLoading"
					@click="onClickNew($form)"/>
				<Button
					ref="workaroundSaveButton"
					icon="pi pi-save"
					label="Grabar"
					iconPos="top"
					type="submit"
					class="large-icon-button"
					:loading="isLoading"
					:disabled="!$form.valid"
					variant="outlined"/>
				<Button
					icon="pi pi-print"
					label="Imprimir"
					iconPos="top"
					type="button"
					class="large-icon-button"
					variant="outlined"
					:disabled="isLoading || dialogState.originalValues === null"
					@click="onClickPrint"/>
				<Button
					icon="pi pi-clone"
					label="Copiar albarán"
					iconPos="top"
					type="button"
					class="large-icon-button"
					variant="outlined"
					:loading="isCopying"
					:disabled="isLoading || dialogState.originalValues === null"
					@click="onClickCopy"/>
			</div>
		</Form>
	</Dialog>
	<ProductDialog v-model:visible="dialogVisible['ProductDialog']" @addProduct="onAddNewProduct"/>
	<AbonoDialog v-model:visible="dialogVisible['AbonoDialog']" @addAbono="onAddNewAbono"/>
	<DuplicateDialog v-model:visible="dialogVisible['DuplicateDialog']" @duplicateAlbaran="onDuplicateAlbaran"/>
</template>

<style scoped>
.compact-toolbar {
	padding: .5rem;
	border-radius: 0;
}

.smaller-iconbutton {
	width: 2.2rem !important;
	height: 2.2rem !important;
}

.smaller-textbutton {
	padding: .25rem .75rem;
}

/*noinspection CssUnusedSymbol*/
.large-icon-button :deep(.pi) {
	font-size: 1.36rem;
}
</style>
