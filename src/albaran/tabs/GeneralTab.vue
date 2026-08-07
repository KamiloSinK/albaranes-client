<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {ref, computed, onMounted} from "vue";
import type {SelectChangeEvent, SelectFilterEvent, VirtualScrollerLazyEvent} from "primevue";
import * as albaranes from "@/services/albaranes";
import * as socios from "@/services/socios";
import * as fincas from "@/services/fincas";
import * as tecnicos from "@/services/tecnicos";
import { useMasterDataCache } from "@/composables/useMasterDataCache";
import { useLazySelect } from "@/composables/useLazySelect";
import { useNetworkStatus } from "@/composables/useNetworkStatus";
import { useSession } from "@/composables/useSession";
import { cacheService } from "@/services/cacheService";
import { selectScrollHeight } from "@/utils/selectSizing";
import type {
    RetrieveAlbaranResponse,
    RetrieveFincaResponse,
    RetrieveSocioResponse,
    RetrieveTecnicoResponse
} from "@coa/api-types";
import type {AlbaranDialogState, ProductData, AbonoData} from "@/albaran/AlbaranDialog.vue";
import type {RetrieveMode} from "@/services/albaranes";

const props = defineProps({
	formSlot: {
		type: Object,
		required: true
	}
});

const workaroundSelectSocio = ref<string>("Seleccione");
const workaroundSelectFinca = ref<string>("Seleccione");
const workaroundSelectTecnico = ref<string>("Seleccione");

const dialogState = defineModel<AlbaranDialogState>("dialogState", {type: Object, required: true});

interface TecnicoOption extends RetrieveTecnicoResponse {
	fullname: string;
}

const loadingAlbaran = ref<boolean>(false);

// Refs a los componentes Select, para poder limpiar su filtro interno cuando la
// selección se hace desde el input de código (de afuera), evitando que quede texto
// de una búsqueda anterior en el filtro del propio Select.
const socioSelectRef = ref<any>(null);
const fincaSelectRef = ref<any>(null);

// Lazy loading para Selects paginados
const sociosLazy = useLazySelect<RetrieveSocioResponse>();
const sociosList = sociosLazy.items;
const loadingSocio = sociosLazy.loading;

const fincasLazy = useLazySelect<RetrieveFincaResponse>();
const fincasList = fincasLazy.items;
const loadingFinca = fincasLazy.loading;

const tecnicosLazy = useLazySelect<TecnicoOption>();
const tecnicosList = tecnicosLazy.items;
const loadingTecnico = tecnicosLazy.loading;

// Altura del panel de cada Select según la cantidad de opciones cargadas, para que no
// quede un espacio vacío enorme cuando hay pocos resultados.
const socioScrollHeight = computed(() => selectScrollHeight(sociosList.value.length));
const fincaScrollHeight = computed(() => selectScrollHeight(fincasList.value.length));
const tecnicoScrollHeight = computed(() => selectScrollHeight(tecnicosList.value.length));

// Debounce para búsquedas
let socioInputTimeout: ReturnType<typeof setTimeout> | null = null;
let fincaInputTimeout: ReturnType<typeof setTimeout> | null = null;
let socioFilterTimeout: ReturnType<typeof setTimeout> | null = null;
let fincaFilterTimeout: ReturnType<typeof setTimeout> | null = null;

// Variables reactivas para los valores seleccionados de los Select
const selectedSocioId = ref<number | null>(null);
const selectedFincaId = ref<number | null>(null);

// Cache y estado de red
const { isOnline } = useNetworkStatus();
const { getSocios, getFincas, getTecnicos } = useMasterDataCache();
const { hasSession } = useSession();

// Flag para evitar múltiples cargas iniciales
let initialLoadDone = false;

// Mapper para técnicos: añade fullname
const mapTecnico = (t: RetrieveTecnicoResponse): TecnicoOption => ({ ...t, fullname: `${t.nombres} ${t.apellidos}` });

// Lazy load handlers para virtual scroller
async function onLazyLoadSocios(e: VirtualScrollerLazyEvent) {
    await sociosLazy.onLazyLoad(e,
        (p) => socios.retrieveSocios(p),
        { isOnline: isOnline.value, hasSession: hasSession() }
    );
}

async function onLazyLoadFincas(e: VirtualScrollerLazyEvent) {
    if (!selectedSocioId.value) return;
    await fincasLazy.onLazyLoad(e,
        (p) => fincas.retrieveFincas({ ...p, socioId: selectedSocioId.value! }),
        { isOnline: isOnline.value, hasSession: hasSession() }
    );
}

async function onLazyLoadTecnicos(e: VirtualScrollerLazyEvent) {
    await tecnicosLazy.onLazyLoad(e,
        (p) => tecnicos.retrieveTecnicos(p),
        { mapFn: mapTecnico, isOnline: isOnline.value, hasSession: hasSession() }
    );
}

// Carga inicial (primera página de 50 elementos)
async function loadInitialSocios() {
    await sociosLazy.loadInitial(
        (p) => socios.retrieveSocios(p),
        { cacheFn: getSocios, isOnline: isOnline.value, hasSession: hasSession() }
    );
}

async function loadInitialFincas() {
    // Sin socio seleccionado no hay nada que listar (una finca siempre pertenece a un socio)
    if (!selectedSocioId.value) {
        fincasLazy.reset();
        return;
    }
    await fincasLazy.loadInitial(
        (p) => fincas.retrieveFincas({ ...p, socioId: selectedSocioId.value! }),
        {
            cacheFn: () => getFincas().filter((f: any) => (f.socioIds ?? []).includes(selectedSocioId.value)),
            isOnline: isOnline.value,
            hasSession: hasSession()
        }
    );
}

async function loadInitialTecnicos() {
    await tecnicosLazy.loadInitial(
        (p) => tecnicos.retrieveTecnicos(p),
        {
            cacheFn: () => getTecnicos().map(mapTecnico),
            mapFn: mapTecnico,
            isOnline: isOnline.value,
            hasSession: hasSession()
        }
    );
}

async function copyAnterior() {
	return loadNavigation("listado-anterior", true);
}

async function loadNavigation(mode: RetrieveMode, justCopy: boolean = false) {
	if (loadingAlbaran.value)
		return;

	loadingAlbaran.value = true;
	try {
		const response = await albaranes.retrieveAlbaran(props.formSlot.albaranId.value, mode);

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra el albarán");
					break;
				case 401:
					alert("No has iniciado sesión");
					break;
				default:
					alert("Error HTTP 500\n");
					console.error("HTTP error 500");
					console.error(await response.json());
					break;
			}
			return;
		}

		const data : RetrieveAlbaranResponse = await response.json();
		if (!justCopy) {
			// Fully load the object
			dialogState.value.originalValues = data;
			props.formSlot.albaranId.value = data.albaranFullId;
		}
		loadAlbaranToForm(data);
	} catch (err: unknown) {
		console.error(err);
	} finally {
		loadingAlbaran.value = false;
	}
}

async function loadPrimerListado() {
	return loadNavigation("primer-listado");
}

async function loadListadoAnterior() {
	return loadNavigation("listado-anterior");
}

async function loadListadoSiguiente() {
	return loadNavigation("listado-siguiente");
}

async function loadUltimoListado() {
	return loadNavigation("ultimo-listado");
}

async function loadSocioAnterior() {
	return loadNavigation("socio-anterior");
}

async function loadSocioSiguiente() {
	return loadNavigation("socio-siguiente");
}

async function loadThis() {
	return onClickFind();
}

function setAlbaranIdField(content: string) {
	props.formSlot.albaranId.value = content;
}

defineExpose({
    loadPrimerListado,
    loadListadoAnterior,
    loadListadoSiguiente,
    loadUltimoListado,
    loadSocioAnterior,
    loadSocioSiguiente,
    loadThis,
    setAlbaranIdField,
    copyAnterior,
    selectedSocioId,
    selectedFincaId
});

async function onClickFind() {
	if (loadingAlbaran.value)
		return;

	loadingAlbaran.value = true;
	try {
		const response = await albaranes.retrieveAlbaran(props.formSlot.albaranId.value);

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra el albarán");
					break;
				case 401:
					alert("No has iniciado sesión");
					break;
				default:
					alert("Error HTTP 500\n");
					console.error("HTTP error 500");
					console.error(await response.json());
					break;
			}
			return;
		}

		const data : RetrieveAlbaranResponse = await response.json();
		dialogState.value.originalValues = data;
		loadAlbaranToForm(data);
	} catch (err: unknown) {
		console.error(err);
	} finally {
		loadingAlbaran.value = false;
	}
}

// Aplica la selección de un socio: sincroniza el input de código y recarga las fincas
// de ESE socio (una finca siempre pertenece a un único socio, así que cambiar de socio
// invalida cualquier finca previamente seleccionada).
// syncCodeInput=false cuando la llamada viene del propio input de código: mientras el
// usuario está escribiendo ahí, reescribir su valor pisa lo que está tecleando (el propio
// input de PrimeVue Forms ya sincroniza su valor con lo tecleado).
function applySocioSelection(socioId: number, opts?: { syncCodeInput?: boolean }) {
    selectedSocioId.value = socioId;
    if (opts?.syncCodeInput ?? true) {
        const socioSel = sociosList.value.find(s => s.id === socioId);
        props.formSlot.socioId.value = socioSel?.bc_id ?? socioId.toString().padStart(4, "0");
    }

    selectedFincaId.value = null;
    props.formSlot.fincaId.value = "";
    clearSectores();
    fincasLazy.reset();
    loadInitialFincas();
}

function onChangeSelectSocio(e: SelectChangeEvent) {
    applySocioSelection(e.value as number);
}

// Limpia el texto de filtro interno de un Select (propiedad interna de PrimeVue).
// Se usa al seleccionar desde el input de código de afuera, para que no quede texto
// de una búsqueda anterior dentro del Select.
function clearSelectFilter(selectRef: any) {
    if (selectRef?.value) selectRef.value.filterValue = null;
}

// Busca coincidencias de socio SOLO por código (bc_id), nunca por nombre, en cache y,
// si no hay, en la API. Si hay una única coincidencia la selecciona; si hay varias,
// selecciona la primera. (El filtro por nombre corresponde al Select, no a este input.)
// Todo el proceso espera DEBOUNCE_MS de inactividad antes de decidir, para no seleccionar
// una coincidencia parcial mientras el usuario todavía está escribiendo el código.
const CODE_INPUT_DEBOUNCE_MS = 600;

function onChangeSocioId(event: Event) {
    const target = event.target as HTMLInputElement;
    const codigo = target.value.trim();

    if (socioInputTimeout) clearTimeout(socioInputTimeout);

	// Limpiar selección si el input está vacío
	if (!codigo || codigo.length === 0) {
		selectedSocioId.value = null;
		return;
	}

    socioInputTimeout = setTimeout(async () => {
        // Primero buscar en la lista ya cargada (cache local) por bc_id
        const term = codigo.toLowerCase();
        const coincidencias = sociosList.value.filter(socio =>
            (socio.bc_id ?? '').toString().trim().toLowerCase().includes(term)
        );

        if (coincidencias.length > 0) {
            applySocioSelection(coincidencias[0].id, { syncCodeInput: false });
            clearSelectFilter(socioSelectRef);
            return;
        }

        // Si no se encuentra en cache, buscar en la API por código
        if (!isOnline.value || !hasSession()) {
            selectedSocioId.value = null;
            return;
        }

        try {
            const response = await socios.retrieveSocios({ code: codigo, limit: 50 });
            if (response.ok) {
                const data: RetrieveSocioResponse[] = await response.json();

                if (data.length > 0) {
                    sociosLazy.addItems(data);
                    applySocioSelection(data[0].id);
                    clearSelectFilter(socioSelectRef);
                } else {
                    selectedSocioId.value = null;
                }
            } else {
                selectedSocioId.value = null;
            }
        } catch (err) {
            console.error('Error buscando socio en API:', err);
            selectedSocioId.value = null;
        }
    }, CODE_INPUT_DEBOUNCE_MS);
}

async function changePlaceholderNewItem() {
    // Si no hay sesión o conexión, no consultar API
    if (!isOnline.value || !hasSession()) return;
    console.log(selectedFincaId.value, selectedSocioId.value)
    const response = await fetch(`${import.meta.env.VITE_API_HOST}/albaranes/placeholder?fincaId=${selectedFincaId.value}&socioId=${selectedSocioId.value}`, {
        method: "GET",
        headers: {
            Accept: "application/json"
        },
        mode: "cors",
        credentials: "include"
    });

    const data = await response.json();
    myPlaceholder.value = data.placeholder;
}

const myPlaceholder = ref<string>("");

function loadAlbaranToForm(data: RetrieveAlbaranResponse) {
	onChangeSelectFinca({
		value: data.general.fincaId,
		originalEvent: new Event("workaround")
	});

	// Mostrar el bc_id del socio si está disponible; fallback al id formateado
	const socioSel = sociosList.value.find(s => s.id === data.general.socioId);
	props.formSlot.socioId.value = socioSel?.bc_id ?? data.general.socioId.toString().padStart(4, "0");
	selectedSocioId.value = data.general.socioId; // Sincronizar el Select con el código cargado
	// Mostrar bc_id de la finca si existe en cache; fallback al id formateado
	const fincaSel = fincasList.value.find(f => f.id === data.general.fincaId);
	props.formSlot.fincaId.value = fincaSel?.bc_id ?? data.general.fincaId.toString().padStart(4, "0");
	selectedFincaId.value = data.general.fincaId; // Sincronizar el Select de finca con el código cargado
	props.formSlot.sectorIds.value = data.general.sectoresActivados;
	props.formSlot.tecnico.value = data.general.tecnicoId;
	props.formSlot.fechaInstrucciones.value = new Date(data.general.fechaInstrucciones);
	props.formSlot.fechaEjecucion.value = new Date(data.general.fechaEjecucion);
	props.formSlot.plazoEjecucion.value = data.general.plazoEjecucionDias;
	props.formSlot.sinInventario.value = data.general.sinInventario ?? false;
	props.formSlot.motivoSinInventario.value = data.general.motivoSinInventario ?? "";

	props.formSlot.riegoCE.value = data.riego.ce;
	props.formSlot.riegoLm2.value = data.riego.lm2;
	props.formSlot.riegoTiempoMin.value = data.riego.tiempoRiegoMin;
	props.formSlot.riegoEquilibrio.value = data.riego.equilibrio;
	props.formSlot.riegoDuracionPlanAbono.value = data.riego.duracionPlanAbono;
	props.formSlot.riegoTanqueDias.value = data.riego.tanqueDiasSemana;

	props.formSlot.laboresCulturales.value = data.laboresCulturales;
	props.formSlot.observaciones.value = data.observaciones;
	props.formSlot.firma.value = data.firma;

	dialogState.value.products = data.productos.map<ProductData>((product: any) => ({
		dosis: data.view.productos.find((item: any) => item.id === product.productoId)!.dosis,
		gastosL: product.gastosL,
		id: product.productoId,
		maquinaria: product.maquinaria,
		materiaActiva: data.view.productos.find((item: any) => item.id === product.productoId)!.materiaActiva,
		nivel: product.nivel,
		nombre: data.view.productos.find((item: any) => item.id === product.productoId)!.nombre,
		plaga: data.view.productos.find((item: any) => item.id === product.productoId)!.plaga,
		plazoSeguimiento: data.view.productos.find((item: any) => item.id === product.productoId)!.plazoSeguimiento
	}));

	dialogState.value.abonosTanqueA = data.abono.tanqueA.map<AbonoData>((abono: any) => ({
		id: abono.abonoId,
		kilos: abono.kilos,
		nombre: data.view.abonos.find((item: any) => item.id === abono.abonoId)!.nombre
	}));

	dialogState.value.abonosTanqueB = data.abono.tanqueB.map<AbonoData>((abono: any) => ({
		id: abono.abonoId,
		kilos: abono.kilos,
		nombre: data.view.abonos.find((item: any) => item.id === abono.abonoId)!.nombre
	}));

	workaroundSelectSocio.value = data.view.socioNombre;
	workaroundSelectFinca.value = data.view.fincaNombre;
	workaroundSelectTecnico.value = `${data.view.tecnicoNombres} ${data.view.tecnicoApellidos}`;
}

// Aplica la selección de una finca: sectores, bc_id visible y placeholder.
// syncCodeInput=false cuando la llamada viene del propio input de código: mientras el
// usuario está escribiendo ahí, reescribir su valor pisa lo que está tecleando.
function applyFincaSelection(finca: RetrieveFincaResponse, opts?: { syncCodeInput?: boolean }) {
    // "sector" = fincas hermanas del mismo socio (incluida esta), no una subdivisión de
    // la finca. La vista previa muestra el bc_id real de cada una, no un código armado.
    const sectores = finca.sectores || [];
    props.formSlot.sectorIdsPreview.value = sectores.map(s => s.bc_id).join("-");
    if (opts?.syncCodeInput ?? true) {
        props.formSlot.fincaId.value = finca.bc_id ?? finca.id.toString().padStart(4, "0");
    }
    dialogState.value.selectedFincaSectorIds = finca.sectorIds || [];
    dialogState.value.selectedFincaSectores = sectores;
    selectedFincaId.value = finca.id;

    if (props.formSlot.socioId.value && props.formSlot.fincaId.value && !dialogState.value.originalValues)
        changePlaceholderNewItem().then().catch();
}

async function onChangeSelectFinca(e: SelectChangeEvent) {
	try {
		// Buscar la finca en la lista ya cargada (cache)
		const finca = fincasList.value.find(f => f.id === e.value);

		if (finca) {
			applyFincaSelection(finca);
        } else {
            // Fallback: si no está en cache, hacer consulta (solo si hay sesión y conexión)
            if (!hasSession() || !isOnline.value) {
                console.warn('Finca no encontrada en cache y no hay sesión/conexión; omitiendo consulta');
                return;
            }
            console.warn('Finca no encontrada en cache, haciendo consulta a API');
            const response = await fincas.retrieveFinca(e.value);

			if (!response.ok) {
				alert(`HTTP status: ${response.status}`);
				return;
			}

			const data: RetrieveFincaResponse = await response.json();
			applyFincaSelection(data);
		}
	} catch (err: unknown) {
		console.error('Error en onChangeSelectFinca:', err);
	}
}

// Busca coincidencias de finca SOLO por código (bc_id), nunca por nombre, acotado al
// socio seleccionado, primero en cache y si no en la API. Si hay una única coincidencia
// la selecciona; si hay varias, selecciona la primera. (El filtro por nombre corresponde
// al Select, no a este input.)
// Todo el proceso espera CODE_INPUT_DEBOUNCE_MS de inactividad antes de decidir, para no
// seleccionar una coincidencia parcial mientras el usuario todavía está escribiendo el código.
function onChangeFincaId(event: Event) {
    const target = event.target as HTMLInputElement;
    const codigo = target.value.trim();

    if (fincaInputTimeout) clearTimeout(fincaInputTimeout);

    // Limpiar si está vacío
    if (codigo.length === 0) {
        selectedFincaId.value = null;
        clearSectores();
        return;
    }

    fincaInputTimeout = setTimeout(async () => {
        // Primero buscar en la lista ya cargada (cache local) por bc_id. El bc_id de finca
        // es {código de socio}{secuencia de 4 dígitos}: si el usuario escribe 1 a 4 dígitos,
        // se interpreta como el número de secuencia (no un substring libre, que podría
        // matchear el código de socio y devolver varias fincas en vez de una sola).
        const term = codigo.toLowerCase();
        const term4 = /^\d{1,4}$/.test(codigo) ? codigo.padStart(4, "0") : null;
        const coincidencias = fincasList.value.filter(f => {
            const bcId = (f.bc_id ?? '').toString().trim().toLowerCase();
            return term4 ? bcId.endsWith(term4) : bcId.includes(term);
        });

        if (coincidencias.length > 0) {
            applyFincaSelection(coincidencias[0], { syncCodeInput: false });
            clearSelectFilter(fincaSelectRef);
            return;
        }

        // No hay coincidencia en cache - limpiar sectores
        clearSectores();

        // Buscar en la API por código si estamos online
        if (!isOnline.value || !hasSession()) {
            selectedFincaId.value = null;
            return;
        }

        try {
            const response = await fincas.retrieveFincas({ code: codigo, limit: 50, socioId: selectedSocioId.value ?? undefined });
            if (response.ok) {
                const data: RetrieveFincaResponse[] = await response.json();

                if (data.length > 0) {
                    fincasLazy.addItems(data);
                    applyFincaSelection(data[0]);
                    clearSelectFilter(fincaSelectRef);
                } else {
                    selectedFincaId.value = null;
                    // Sectores ya fueron limpiados arriba
                }
            } else {
                selectedFincaId.value = null;
            }
        } catch (err) {
            console.error('Error buscando finca en API:', err);
            selectedFincaId.value = null;
            // Sectores ya fueron limpiados arriba
        }
    }, CODE_INPUT_DEBOUNCE_MS);
}

// Limpiar datos de sectores
function clearSectores() {
    props.formSlot.sectorIdsPreview.value = "";
    props.formSlot.sectorIds.value = [];
    dialogState.value.selectedFincaSectorIds = [];
    dialogState.value.selectedFincaSectores = [];
}

function onClickCheckAll() {
	if (dialogState.value.selectedFincaSectorIds.length <= 0)
		return;

	props.formSlot.sectorIds.value = dialogState.value.selectedFincaSectorIds;
}

// Buscar socios en API cuando el usuario filtra por nombre en el Select
function onFilterSocio(e: SelectFilterEvent) {
    const searchTerm = e.value?.trim() ?? '';
    
    // Si el término es muy corto, no buscar en API
    if (searchTerm.length < 2) return;
    
    // Debounce: esperar 300ms antes de buscar
    if (socioFilterTimeout) clearTimeout(socioFilterTimeout);
    
    socioFilterTimeout = setTimeout(async () => {
        // Solo buscar en API si estamos online y hay sesión
        if (!isOnline.value || !hasSession()) return;

        try {
            const response = await socios.retrieveSocios({ contains: searchTerm, limit: 50 });
            if (response.ok) {
                const data: RetrieveSocioResponse[] = await response.json();

                sociosLazy.addItems(data);
                // Única coincidencia -> seleccionarla; varias -> seleccionar la primera
                if (data.length > 0) applySocioSelection(data[0].id);
            }
        } catch (err) {
            console.error('Error buscando socios en API:', err);
        }
    }, 750);
}

// Buscar fincas en API cuando el usuario filtra por nombre en el Select
function onFilterFinca(e: SelectFilterEvent) {
    const searchTerm = e.value?.trim() ?? '';
    
    // Si el término es muy corto, no buscar en API
    if (searchTerm.length < 2) return;
    
    // Debounce: esperar 300ms antes de buscar
    if (fincaFilterTimeout) clearTimeout(fincaFilterTimeout);
    
    fincaFilterTimeout = setTimeout(async () => {
        // Solo buscar en API si estamos online y hay sesión
        if (!isOnline.value || !hasSession()) return;

        try {
            const response = await fincas.retrieveFincas({ contains: searchTerm, limit: 50, socioId: selectedSocioId.value ?? undefined });
            if (response.ok) {
                const data: RetrieveFincaResponse[] = await response.json();

                fincasLazy.addItems(data);
                // Única coincidencia -> seleccionarla; varias -> seleccionar la primera
                if (data.length > 0) applyFincaSelection(data[0]);
            }
        } catch (err) {
            console.error('Error buscando fincas en API:', err);
        }
    }, 750);
}

// Cargar socios y fincas inicialmente cuando se monta el componente.
// No se gatea por hasSession(): loadInitial* ya intentan backend si hay conexión
// y caen a cache si la sesión resulta inválida (evita selects vacíos por falso negativo
// de hasSession(), p. ej. justo tras borrar datos del navegador).
onMounted(() => {
    loadInitialSocios();
    loadInitialFincas();
    loadInitialTecnicos();
});
</script>

<template>
	<div class="max-w-lg space-y-4">
		<div class="flex items-center">
			<label class="w-24 text-end font-semibold pr-2" for="albaran-albaran-id">Albáran:</label>
			<div class="flex-1 flex flex-col gap-1">
				<InputText name="albaranId" id="albaran-albaran-id" spellcheck="false" :placeholder="myPlaceholder"/>
				<Message
					v-if="props.formSlot.albaranId?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.albaranId.error.message">
				</Message>
			</div>
			<Button
				label="Buscar"
				variant="outlined"
				icon="pi pi-search"
				type="button"
				class="ml-2"
				:disabled="props.formSlot.albaranId?.invalid ?? false"
				:loading="loadingAlbaran"
				@click="onClickFind"/>
		</div>
		<div class="flex items-center">
			<label class="w-24 text-end font-semibold pr-2" for="albaran-socio-id">Socio:</label>
			<InputText
				name="socioId"
				id="albaran-socio-id"
				spellcheck="false"
				class="w-17 mr-2"
				:disabled="dialogState.originalValues !== null"
				:invalid="(props.formSlot.socioId?.invalid ?? false) && (props.formSlot.socioId?.touched ?? false)"
				@input="onChangeSocioId"/>
			<div class="flex-1 flex flex-col gap-1 min-w-0">
                <Select
                    ref="socioSelectRef"
                    v-model="selectedSocioId"
                    :options="sociosList"
                    :disabled="dialogState.originalValues !== null"
                    :scrollHeight="socioScrollHeight"
                    :virtualScrollerOptions="{
                        lazy: true,
                        onLazyLoad: onLazyLoadSocios,
                        itemSize: 36,
                        showLoader: true,
                        loading: loadingSocio
                    }"
                    @change="onChangeSelectSocio"
                    @filter="onFilterSocio"
                    optionLabel="nombre"
                    optionValue="id"
                    :filterFields="['nombre','bc_id']"
                    :placeholder="dialogState.originalValues !== null ? workaroundSelectSocio : 'Seleccione'"
                    filter
                    class="w-full">
                </Select>
				<Message
					v-if="(props.formSlot.socioId?.invalid ?? false) && (props.formSlot.socioId?.touched ?? false)"
					severity="error"
					size="small"
					variant="simple">
					{{ props.formSlot.socioId.error.message }}
				</Message>
			</div>
		</div>
		<div class="flex items-center">
			<label class="w-24 text-end font-semibold pr-2" for="albaran-finca-id">Finca:</label>
			<InputText
				name="fincaId"
				id="albaran-finca-id"
				spellcheck="false"
				class="w-17 mr-2"
				inputmode="text"
				:disabled="dialogState.originalValues !== null || !selectedSocioId"
				:invalid="(props.formSlot.fincaId?.invalid ?? false) && (props.formSlot.fincaId?.touched ?? false)"
				@input="onChangeFincaId"/>
			<div class="flex-1 flex flex-col gap-1 min-w-0">
				<Select
					ref="fincaSelectRef"
					v-model="selectedFincaId"
					:options="fincasList"
					:disabled="dialogState.originalValues !== null || !selectedSocioId"
					:scrollHeight="fincaScrollHeight"
					:virtualScrollerOptions="{
						lazy: true,
						onLazyLoad: onLazyLoadFincas,
						itemSize: 36,
						showLoader: true,
						loading: loadingFinca
					}"
					@change="onChangeSelectFinca"
					@filter="onFilterFinca"
					optionLabel="nombre"
					optionValue="id"
					:filterFields="['nombre','bc_id']"
					:placeholder="dialogState.originalValues !== null ? workaroundSelectFinca : (selectedSocioId ? 'Seleccione' : 'Seleccione un socio primero')"
					filter
					class="w-full">
				</Select>
				<Message
					v-if="(props.formSlot.fincaId?.invalid ?? false) && (props.formSlot.fincaId?.touched ?? false)"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.fincaId.error.message">
				</Message>
			</div>
		</div>
		<div class="flex items-center">
			<label class="w-24 text-end font-semibold pr-2 self-start" for="albaran-sector-id">Sector:</label>
			<Textarea class="flex-1 min-h-24 h-24" name="sectorIdsPreview" readonly/>
		</div>
		<div class="flex items-center">
			<div class="w-24 pr-2 self-start">
				<Button
					type="button"
					class="w-full"
					label="Activar todas"
					variant="outlined"
					@click="onClickCheckAll"/>
			</div>
			<CheckboxGroup name="sectorIds" class="flex-1 flex flex-wrap gap-4 items-start">
				<template v-for="sector in dialogState.selectedFincaSectores" :key="sector.id">
					<div class="flex items-center gap-2">
						<Checkbox :inputId="`albaran-sector-${sector.id}`" :value="sector.id"/>
					<label
						:for="`albaran-sector-${sector.id}`"
						v-text="sector.bc_id"></label>
					</div>
				</template>
			</CheckboxGroup>
		</div>
		<div class="flex items-center">
			<label class="w-24 text-end font-semibold pr-2" for="albaran-tecnico">Técnico:</label>
			<div class="flex-1 flex flex-col gap-1 min-w-0">
				<Select
					:options="tecnicosList"
					:scrollHeight="tecnicoScrollHeight"
					:virtualScrollerOptions="{
						lazy: true,
						onLazyLoad: onLazyLoadTecnicos,
						itemSize: 36,
						showLoader: true,
						loading: loadingTecnico
					}"
					optionLabel="fullname"
					optionValue="id"
					name="tecnico"
					:placeholder="dialogState.originalValues !== null ? workaroundSelectTecnico : 'Seleccione'"
					filter
					class="w-full"/>
				<Message
					v-if="props.formSlot.tecnico?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.tecnico.error.message">
				</Message>
			</div>
		</div>
		<div class="flex items-center">
			<label class="w-48 text-end font-semibold pr-2" for="albaran-fecha-instrucciones">Fecha instrucciones:</label>
			<div class="flex-1 flex flex-col gap-1">
				<DatePicker name="fechaInstrucciones" dateFormat="yy-mm-dd" showIcon fluid iconDisplay="input" inputId="albaran-fecha-instrucciones" />
				<Message
					v-if="props.formSlot.fechaInstrucciones?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.fechaInstrucciones.error.message">
				</Message>
			</div>
		</div>
		<div class="flex items-center">
			<label class="w-48 text-end font-semibold pr-2" for="albaran-fecha-ejecucion">Fecha de ejecución:</label>
			<div class="flex-1 flex flex-col gap-1 mr-2">
				<DatePicker name="fechaEjecucion" dateFormat="yy-mm-dd" showIcon fluid iconDisplay="input" inputId="albaran-fecha-ejecucion" />
				<Message
					v-if="props.formSlot.fechaEjecucion?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.fechaEjecucion.error.message">
				</Message>
			</div>
			<div class="flex items-center gap-2">
				<Checkbox inputId="albaran-pendiente" name="pendiente" binary />
				<label for="albaran-pendiente">Pendiente</label>
			</div>
		</div>
		<div class="flex items-center">
			<label class="w-48 text-end font-semibold pr-2" for="albaran-plazo-ejecucion">Plazo de ejecución:</label>
			<div class="flex-1 items-center gap-2">
				<InputNumber
					inputId="albaran-plazo-ejecucion"
					suffix=" días"
					fluid
					placeholder="Número de días"
					name="plazoEjecucion" />
				<Message
					v-if="props.formSlot.plazoEjecucion?.invalid ?? false"
					severity="error"
					size="small"
					variant="simple"
					v-text="props.formSlot.plazoEjecucion.error.message">
				</Message>
			</div>
		</div>
	</div>
</template>

<style scoped>

</style>
