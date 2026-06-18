export type AlbaranDuracionPlanAbono = "1semana" | "15dias" | "1mes" | "indefinido";
export type AlbaranMaquinaria = "pulverizador" | "espolvoreador" | "riego" | "mochila" | "siembra-manual";
export type AlbaranNivel = "alta" | "media" | "baja";
export type AlbaranDiasSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
export type AlbaranLaboresCulturales = "eliminar-malas-hierbas" | "colocar-placas" | "despuntar" | "deshijar" | "deshojar" | "eliminar-plantas-viroticas" | "reponer-abejorros" | "entuturar" | "descolgar";

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface NewItemResponse {
	id: number;
}

export interface AlbaranProductType {
	maquinaria: AlbaranMaquinaria;
	nivel: AlbaranNivel;
	gastosL: number;
	productoId: number;
}

export interface AlbaranAbonoType {
	abonoId: number;
	kilos: number;
}

export 	interface NewAlbaranRequest {
		general: {
			socioId: number;
			fincaId: number;
			anio: number;
			sectoresActivados: number[];
			tecnicoId: number;
			fechaInstrucciones: string;
			fechaEjecucion: string;
			plazoEjecucionDias: number;
			pendiente: boolean;
			sinInventario: boolean;
			motivoSinInventario?: string;
		};
		productos: AlbaranProductType[];
		abono: {
			tanqueA: AlbaranAbonoType[];
			tanqueB: AlbaranAbonoType[];
		};
		riego: {
			ce: number;
			lm2: number;
			tiempoRiegoMin: number;
			equilibrio: string;
			duracionPlanAbono: AlbaranDuracionPlanAbono;
			tanqueDiasSemana: AlbaranDiasSemana[];
		};
		laboresCulturales: AlbaranLaboresCulturales[];
		observaciones?: string;
		firma: string;
	}

export interface RetrieveAlbaranResponse extends NewAlbaranRequest {
		albaranId: number;
		albaranFullId: string;
		view: {
			socioNombre: string;
			fincaNombre: string;
			tecnicoNombres: string;
			tecnicoApellidos: string;
			sectorIds: number[];
			sectorFullIds: string[];
			productos: RetrieveProductResponse[];
			abonos: RetrieveAbonoResponse[];
		};
	}

export interface DuplicateAlbaranRequest {
		socioDesdeId: number;
		socioHastaId: number;
		fechaDesde: string;
		fechaHasta: string;
	}

export interface PaginationQueryParams {
		limit?: number;
		offset?: number;
	}

export interface RetrieveAlbaranesQueryParams {
		from_id: number;
		to_id: number;
		from_fecha: string;
		to_fecha: string;
		socio_id: number;
		finca_id: number;
	}

export interface RetrieveSociosQueryParams extends PaginationQueryParams {
		contains?: string;
	}

export interface RetrieveFincasQueryParams extends PaginationQueryParams {
		contains?: string;
	}

export interface RetrieveTecnicosQueryParams extends PaginationQueryParams {
		contains?: string;
	}

export interface RetrieveProductsQueryParams extends PaginationQueryParams {
		contains?: string;
		itemCategoryCode?: string;
	}

export interface RetrieveAbonosQueryParams extends PaginationQueryParams {
		contains?: string;
	}

export interface RetrieveSocioResponse {
  id: number;
  nombre: string;
  // Identificador de código de barras / business code
  bc_id?: string;
}

export interface RetrieveSectorResponse {
		id: number;
		bc_id: string;
		finca_id: number;
		sinInventario: boolean;
	}

export interface RetrieveFincaResponse {
		id: number;
		bc_id: string;
		nombre: string;
		sectorIds: number[];
		sectores?: RetrieveSectorResponse[];
	}

export interface RetrieveTecnicoResponse {
		id: number;
		nombres: string;
		apellidos: string;
	}

export interface RetrieveProductResponse {
		id: number;
		bc_id?: string;
		nombre: string;
		itemCategoryCode?: string;
		materiaActiva: string;
		plazoSeguimiento?: number;
		dosis: string;
		plaga?: string;
	}

export interface RetrieveAbonoResponse {
		id: number;
		nombre: string;
	}

export interface GenerarCuarentenaQueryParams {
		desde: string;
		hasta: string;
		filename?: string;
	}

export interface RetrieveVisitasQueryParams {
		fecha_inicio: string;
		fecha_fin: string;
	}

export interface RetrieveVisitaResponse {
		albaranFullId: string;
		fecha: string;
		hora: string;
		fincaNombre: string;
		tecnicoNombre: string;
		diagnosticoCorto: string;
	}

export type UpdateAlbaranRequest = DeepPartial<Omit<NewAlbaranRequest, "productos" | "abono">>;

export type NewAlbaranProductRequest = AlbaranProductType[];

export interface NewAlbaranAbonoRequest {
	tanqueA: AlbaranAbonoType[];
	tanqueB: AlbaranAbonoType[];
}

export interface BcSyncResponse {
	ok: boolean;
	message: string;
}

export interface BcSyncStatusResponse {
	running: boolean;
	lastSyncAt: string | null;
}

// También incluir un export por defecto para compatibilidad
export interface LoginResponse {
	token: string;
	userName: string;
}
