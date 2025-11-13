<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import {ref, onMounted} from "vue";
import type {SelectChangeEvent, VirtualScrollerLazyEvent} from "primevue";
import * as albaranes from "@/services/albaranes";
import * as socios from "@/services/socios";
import * as fincas from "@/services/fincas";
import * as tecnicos from "@/services/tecnicos";
import { useMasterDataCache } from "@/composables/useMasterDataCache";
import { useNetworkStatus } from "@/composables/useNetworkStatus";
import { cacheService } from "@/services/cacheService";
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
const loadingSocio = ref<boolean>(false);
const loadingFinca = ref<boolean>(false);
const loadingTecnico = ref<boolean>(false);

const sociosList = ref<RetrieveSocioResponse[]>([]);
const fincasList = ref<RetrieveFincaResponse[]>([]);
const tecnicosList = ref<TecnicoOption[]>([]);

// Variables reactivas para los valores seleccionados de los Select
const selectedSocioId = ref<number | null>(null);
const selectedFincaId = ref<number | null>(null);

// Cache y estado de red
const { isOnline } = useNetworkStatus();
const { getSocios, getFincas, getTecnicos } = useMasterDataCache();

// Inicializar listas con datos del cache al montar el componente
onMounted(() => {
	console.log('Inicializando listas con datos del cache...');
	
	// Cargar socios del cache
	const cachedSocios = getSocios();
	if (cachedSocios.length > 0) {
		sociosList.value = cachedSocios;
		console.log(`Cargados ${cachedSocios.length} socios desde cache`);
	}
	
	// Cargar fincas del cache
	const cachedFincas = getFincas();
	if (cachedFincas.length > 0) {
		fincasList.value = cachedFincas;
		console.log(`Cargadas ${cachedFincas.length} fincas desde cache`);
	}
	
	// Cargar técnicos del cache
	const cachedTecnicos = getTecnicos();
	if (cachedTecnicos.length > 0) {
		tecnicosList.value = cachedTecnicos.map(tecnico => ({
			...tecnico,
			fullname: `${tecnico.nombres} ${tecnico.apellidos}`
		}));
		console.log(`Cargados ${cachedTecnicos.length} técnicos desde cache`);
	}
});

async function onLazyLoadSocios(e: VirtualScrollerLazyEvent) {
	loadingSocio.value = true;

	try {
    // No esperamos inicialización: usamos cache si está disponible
		
		// Primero verificar si hay datos válidos en cache (respeta las 6 horas)
		if (!cacheService.needsUpdate('socios')) {
			console.log('Cache de socios válido, usando datos en cache para lazy load...');
			const cachedSocios = getSocios();
			
			// Simular paginación con los datos del cache
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedSocios.slice(startIndex, endIndex);
			
			const items = [...sociosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			sociosList.value = items;
			return;
		}

		// Si no hay internet, usar cache aunque esté expirado
		if (!isOnline.value) {
			console.log('Sin conexión, cargando socios desde cache para lazy load...');
			const cachedSocios = getSocios();
			
			// Simular paginación con los datos del cache
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedSocios.slice(startIndex, endIndex);
			
			const items = [...sociosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			sociosList.value = items;
			return;
		}

		// Solo hacer llamada a API si cache está expirado y hay conexión
		let limit = e.last - e.first;

		if (limit <= 0)
			limit = 10000;

		const response = await socios.retrieveSocios({
			limit: limit,
			offset: e.first
		});

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra los socios");
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

		const data: RetrieveSocioResponse[] = await response.json();

		const items = [...sociosList.value];
		for (let i = 0; i < data.length; i++)
			items[e.first + i] = data[i];

		sociosList.value = items;
	} catch (err: unknown) {
		console.error("Error al cargar socios:", err);
		// En caso de error, intentar cargar desde cache
		console.log('Error en API, intentando cargar socios desde cache...');
		const cachedSocios = getSocios();
		if (cachedSocios.length > 0) {
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedSocios.slice(startIndex, endIndex);
			
			const items = [...sociosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			sociosList.value = items;
		}
	} finally {
		loadingSocio.value = false;
	}
}

// Función para cargar socios inicialmente
async function loadInitialSocios() {
    if (sociosList.value.length > 0) return; // Ya están cargados
    loadingSocio.value = true;
    try {
        // Pintar rápido desde caché si existe
        const cachedSocios = getSocios();
        if (cachedSocios.length > 0) {
            sociosList.value = cachedSocios;
        }

        // Con conexión, consultar API siempre
        if (isOnline.value) {
            const response = await socios.retrieveSocios({ limit: 1000, offset: 0 });
            if (response.ok) {
                const data: RetrieveSocioResponse[] = await response.json();
                sociosList.value = data;
            }
            return;
        }
        // Sin conexión, mantener cache
    } catch (err: unknown) {
        console.error("Error al cargar socios iniciales:", err);
        const fallback = getSocios();
        if (fallback.length > 0) {
            sociosList.value = fallback;
        }
    } finally {
        loadingSocio.value = false;
    }
}

// Función para cargar fincas inicialmente
async function loadInitialFincas() {
	if (fincasList.value.length > 0) return; // Ya están cargadas
	
	loadingFinca.value = true;
	try {
		// Si no hay internet, usar cache
		if (!isOnline.value) {
			console.log('Sin conexión, cargando fincas desde cache...');
			const cachedFincas = getFincas();
			fincasList.value = cachedFincas;
			return;
		}

		// Si hay internet, cargar desde API
		const response = await fincas.retrieveFincas({
			limit: 1000, // Cargar las primeras 1000 fincas
			offset: 0
		});

		if (response.ok) {
			const data: RetrieveFincaResponse[] = await response.json();
			fincasList.value = data;
		}
	} catch (err: unknown) {
		console.error("Error al cargar fincas iniciales:", err);
		// En caso de error, intentar cargar desde cache
		console.log('Error en API, intentando cargar fincas desde cache...');
		const cachedFincas = getFincas();
		if (cachedFincas.length > 0) {
			fincasList.value = cachedFincas;
		}
	} finally {
		loadingFinca.value = false;
	}
}

// Función para cargar técnicos inicialmente
async function loadInitialTecnicos() {
    if (tecnicosList.value.length > 0) return; // Ya están cargados
    loadingTecnico.value = true;
    try {
        // Pintar rápido desde caché si existe
        const cachedTecnicos = getTecnicos();
        if (cachedTecnicos.length > 0) {
            tecnicosList.value = cachedTecnicos.map(tecnico => ({
                ...tecnico,
                fullname: `${tecnico.nombres} ${tecnico.apellidos}`
            }));
        }

        // Con conexión, consultar API siempre
        if (isOnline.value) {
            const response = await tecnicos.retrieveTecnicos({ limit: 1000, offset: 0 });
            if (response.ok) {
                const data: RetrieveTecnicoResponse[] = await response.json();
                tecnicosList.value = data.map(tecnico => ({
                    ...tecnico,
                    fullname: `${tecnico.nombres} ${tecnico.apellidos}`
                }));
            }
            return;
        }
        // Sin conexión, mantener cache
    } catch (err: unknown) {
        console.error("Error al cargar técnicos iniciales:", err);
        const fallbackTec = getTecnicos();
        if (fallbackTec.length > 0) {
            tecnicosList.value = fallbackTec.map(tecnico => ({
                ...tecnico,
                fullname: `${tecnico.nombres} ${tecnico.apellidos}`
            }));
        }
    } finally {
        loadingTecnico.value = false;
    }
}

async function onLazyLoadFincas(e: VirtualScrollerLazyEvent) {
	loadingFinca.value = true;

	try {
    // No esperamos inicialización: usamos cache si está disponible
		
		// Primero verificar si hay datos válidos en cache (respeta las 6 horas)
		if (!cacheService.needsUpdate('fincas')) {
			console.log('Cache de fincas válido, usando datos en cache para lazy load...');
			const cachedFincas = getFincas();
			
			// Simular paginación con los datos del cache
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedFincas.slice(startIndex, endIndex);
			
			const items = [...fincasList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			fincasList.value = items;
			return;
		}

		// Si no hay internet, usar cache aunque esté expirado
		if (!isOnline.value) {
			console.log('Sin conexión, cargando fincas desde cache para lazy load...');
			const cachedFincas = getFincas();
			
			// Simular paginación con los datos del cache
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedFincas.slice(startIndex, endIndex);
			
			const items = [...fincasList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			fincasList.value = items;
			return;
		}

		// Solo hacer llamada a API si cache está expirado y hay conexión
		let limit = e.last - e.first;

		if (limit <= 0)
			limit = 10000;

		const response = await fincas.retrieveFincas({
			limit: limit,
			offset: e.first
		});

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra las fincas");
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

		const data: RetrieveFincaResponse[] = await response.json();
		const items = [...fincasList.value];
		for (let i = 0; i < data.length; i++)
			items[e.first + i] = data[i];

		fincasList.value = items;
	} catch (err: unknown) {
		console.error("Error al cargar fincas:", err);
		// En caso de error, intentar cargar desde cache
		console.log('Error en API, intentando cargar fincas desde cache...');
		const cachedFincas = getFincas();
		if (cachedFincas.length > 0) {
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedFincas.slice(startIndex, endIndex);
			
			const items = [...fincasList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = paginatedData[i];
			}
			
			fincasList.value = items;
		}
	} finally {
		loadingFinca.value = false;
	}
}

async function onLazyLoadTecnicos(e: VirtualScrollerLazyEvent) {
	if (loadingTecnico.value)
		return;

	loadingTecnico.value = true;

	try {
    // No esperamos inicialización: usamos cache si está disponible
		
		// Primero verificar si hay datos válidos en cache (respeta las 6 horas)
		if (!cacheService.needsUpdate('tecnicos')) {
			console.log('Cache de técnicos válido, usando datos en cache para lazy load...');
			const cachedTecnicos = getTecnicos();
			
			// Simular paginación con los datos del cache
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedTecnicos.slice(startIndex, endIndex);
			
			const items = [...tecnicosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = {
					...paginatedData[i],
					fullname: `${paginatedData[i].nombres} ${paginatedData[i].apellidos}`
				};
			}
			
			tecnicosList.value = items;
			return;
		}

		// Si no hay internet, usar cache aunque esté expirado
		if (!isOnline.value) {
			console.log('Sin conexión, cargando técnicos desde cache para lazy load...');
			const cachedTecnicos = getTecnicos();
			
			// Simular paginación con los datos del cache
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedTecnicos.slice(startIndex, endIndex);
			
			const items = [...tecnicosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = {
					...paginatedData[i],
					fullname: `${paginatedData[i].nombres} ${paginatedData[i].apellidos}`
				};
			}
			
			tecnicosList.value = items;
			return;
		}

		// Solo hacer llamada a API si cache está expirado y hay conexión
		let limit = e.last - e.first;

		if (limit <= 0)
			limit = 10000;

		const response = await tecnicos.retrieveTecnicos({
			limit: limit,
			offset: e.first
		});

		if (!response.ok) {
			switch (response.status) {
				case 404:
					alert("No se encuentra los técnicos");
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

		const data: RetrieveTecnicoResponse[] = await response.json();
		const items = [...tecnicosList.value];
		for (let i = 0; i < data.length; i++) {
			items[e.first + i] = {
				...data[i],
				fullname: `${data[i].nombres} ${data[i].apellidos}`
			};
		}

		tecnicosList.value = items;
	} catch (err: unknown) {
		console.error("Error al cargar técnicos:", err);
		// En caso de error, intentar cargar desde cache
		console.log('Error en API, intentando cargar técnicos desde cache...');
		const cachedTecnicos = getTecnicos();
		if (cachedTecnicos.length > 0) {
			const startIndex = e.first;
			const endIndex = e.last;
			const paginatedData = cachedTecnicos.slice(startIndex, endIndex);
			
			const items = [...tecnicosList.value];
			for (let i = 0; i < paginatedData.length; i++) {
				items[startIndex + i] = {
					...paginatedData[i],
					fullname: `${paginatedData[i].nombres} ${paginatedData[i].apellidos}`
				};
			}
			
			tecnicosList.value = items;
		}
	} finally {
		loadingTecnico.value = false;
	}
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
	copyAnterior
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

function onChangeSelectSocio(e: SelectChangeEvent) {
    // Al seleccionar, mostrar el bc_id en el input (fallback al id formateado)
    selectedSocioId.value = e.value;
    const socioSel = sociosList.value.find(s => s.id === e.value);
    props.formSlot.socioId.value = socioSel?.bc_id ?? e.value.toString().padStart(4, "0");

	if (props.formSlot.socioId.value && props.formSlot.fincaId.value && !dialogState.value.originalValues)
		changePlaceholderNewItem().then().catch();
}

// Función optimizada para buscar socio por código (solo en lista ya cargada)
function onChangeSocioId() {
    const codigo = props.formSlot.socioId.value;
	
	// Limpiar selección si el input está vacío
	if (!codigo || codigo.length === 0) {
		selectedSocioId.value = null;
		return;
	}

	// Solo buscar si se han ingresado al menos 3 caracteres
	if (codigo.length < 3) {
		selectedSocioId.value = null;
		return;
	}

    // Buscar el socio por su bc_id en la lista ya cargada
    const socioEncontrado = sociosList.value.find(socio => 
        (socio.bc_id ?? '').toString().trim().toLowerCase() === codigo.toLowerCase()
    );

	if (socioEncontrado) {
		selectedSocioId.value = socioEncontrado.id;
		
		// Actualizar placeholder si es necesario
        if (props.formSlot.fincaId.value && !dialogState.value.originalValues)
            changePlaceholderNewItem().then().catch();
	} else {
		// Si no se encuentra en la lista ya cargada, limpiar selección
		selectedSocioId.value = null;
	}
}

async function changePlaceholderNewItem() {
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

	props.formSlot.socioId.value = data.general.socioId.toString().padStart(4, "0");
	selectedSocioId.value = data.general.socioId; // Sincronizar el Select con el código cargado
	// Mostrar bc_id si existe en cache; fallback al id formateado
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

async function onChangeSelectFinca(e: SelectChangeEvent) {
	try {
		// Buscar la finca en la lista ya cargada (cache)
		const finca = fincasList.value.find(f => f.id === e.value);
		
		if (finca) {
			// Usar datos directamente del cache
			const fullSectorIds = finca.sectorIds.map((sectorId: any) => e.value.toString().padStart(4, "0") + sectorId.toString().padStart(4, "0"));
			props.formSlot.sectorIdsPreview.value = fullSectorIds.join("-");
			props.formSlot.fincaId.value = finca.bc_id ?? e.value.toString().padStart(4, "0");
			dialogState.value.selectedFincaSectorIds = finca.sectorIds;
			selectedFincaId.value = e.value; // Sincronizar con la variable reactiva

			if (props.formSlot.socioId.value && props.formSlot.fincaId.value && !dialogState.value.originalValues)
				changePlaceholderNewItem().then().catch();
		} else {
			// Fallback: si no está en cache, hacer consulta (solo como respaldo)
			console.warn('Finca no encontrada en cache, haciendo consulta a API');
			const response = await fincas.retrieveFinca(e.value);

			if (!response.ok) {
				alert(`HTTP status: ${response.status}`);
				return;
			}

			const data: RetrieveFincaResponse = await response.json();
			const fullSectorIds = data.sectorIds.map((sectorId: any) => e.value.toString().padStart(4, "0") + sectorId.toString().padStart(4, "0"));
			props.formSlot.sectorIdsPreview.value = fullSectorIds.join("-");
			props.formSlot.fincaId.value = e.value.toString().padStart(4, "0");
			dialogState.value.selectedFincaSectorIds = data.sectorIds;
			selectedFincaId.value = e.value;

			if (props.formSlot.socioId.value && props.formSlot.fincaId.value && !dialogState.value.originalValues)
				changePlaceholderNewItem().then().catch();
		}
	} catch (err: unknown) {
		console.error('Error en onChangeSelectFinca:', err);
	} finally {

	}
}

// Función para buscar finca por ID y actualizar el Select
function onChangeFincaId(event: Event) {
    const target = event.target as HTMLInputElement;
    const codigo = target.value.trim();
    
    // Solo buscar si se han ingresado al menos 3 caracteres
    if (codigo.length < 3) {
        selectedFincaId.value = null;
        return;
    }
    
    // Buscar por bc_id; fallback por id formateado
    const finca = fincasList.value.find(f =>
        (f.bc_id ?? '').toString().trim().toLowerCase() === codigo.toLowerCase() ||
        f.id.toString().padStart(4, "0") === codigo.padStart(4, "0")
    );
    
    if (finca) {
        selectedFincaId.value = finca.id;
        // Actualizar los sectores y otros campos relacionados
        const fullSectorIds = finca.sectorIds.map((sectorId: any) => finca.id.toString().padStart(4, "0") + sectorId.toString().padStart(4, "0"));
        props.formSlot.sectorIdsPreview.value = fullSectorIds.join("-");
        dialogState.value.selectedFincaSectorIds = finca.sectorIds;
        
        if (props.formSlot.socioId.value && props.formSlot.fincaId.value && !dialogState.value.originalValues)
            changePlaceholderNewItem().then().catch();
    } else {
        selectedFincaId.value = null;
    }
}

function onClickCheckAll() {
	if (dialogState.value.selectedFincaSectorIds.length <= 0)
		return;

	props.formSlot.sectorIds.value = dialogState.value.selectedFincaSectorIds;
}

// Cargar socios y fincas inicialmente cuando se monta el componente
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
				@input="onChangeSocioId"/>
			<div class="flex-1 flex flex-col gap-1">
                <Select
                    v-model="selectedSocioId"
                    :options="sociosList"
                    :disabled="dialogState.originalValues !== null"
                    :virtualScrollerOptions="{
                        lazy: true,
                        onLazyLoad: onLazyLoadSocios,
                        itemSize: 36,
                        showLoader: true,
                        loading: loadingSocio
                    }"
                    @change="onChangeSelectSocio"
                    optionLabel="nombre"
                    optionValue="id"
                    :filterFields="['nombre','bc_id']"
                    :placeholder="dialogState.originalValues !== null ? workaroundSelectSocio : 'Seleccione'"
                    filter
                    class="w-full">
                </Select>
				<Message
					v-if="props.formSlot.socioId?.invalid ?? false"
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
				:disabled="dialogState.originalValues !== null"
				@input="onChangeFincaId"/>
			<div class="flex-1 flex flex-col gap-1">
				<Select
					v-model="selectedFincaId"
					:options="fincasList"
					:disabled="dialogState.originalValues !== null"
					:virtualScrollerOptions="{
						lazy: true,
						onLazyLoad: onLazyLoadFincas,
						itemSize: 36,
						showLoader: true,
						loading: loadingFinca
					}"
					@change="onChangeSelectFinca"
					optionLabel="nombre"
					optionValue="id"
					:filterFields="['nombre','bc_id']"
					:placeholder="dialogState.originalValues !== null ? workaroundSelectFinca : 'Seleccione'"
					filter
					class="w-full">
				</Select>
				<Message
					v-if="props.formSlot.fincaId?.invalid ?? false"
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
				<template v-for="(sectorId, index) in dialogState.selectedFincaSectorIds" :key="index">
					<div class="flex items-center gap-2">
						<Checkbox :inputId="`albaran-sector-${index}`" :value="sectorId"/>
					<label
						:for="`albaran-sector-${index}`"
						v-text="(selectedFincaId ?? 0).toString().padStart(4, '0') + sectorId.toString().padStart(4, '0')"></label>
					</div>
				</template>
			</CheckboxGroup>
		</div>
		<div class="flex items-center">
			<label class="w-24 text-end font-semibold pr-2" for="albaran-tecnico">Técnico:</label>
			<div class="flex-1 flex flex-col gap-1">
				<Select
					:options="tecnicosList"
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
				<DatePicker name="fechaInstrucciones" showIcon fluid iconDisplay="input" inputId="albaran-fecha-instrucciones" />
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
				<DatePicker name="fechaEjecucion" showIcon fluid iconDisplay="input" inputId="albaran-fecha-ejecucion" />
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
