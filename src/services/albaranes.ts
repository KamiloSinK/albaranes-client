/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

import type {
	DuplicateAlbaranRequest,
	NewAlbaranAbonoRequest,
	NewAlbaranProductRequest,
	NewAlbaranRequest,
	RetrieveAlbaranesQueryParams,
	RetrieveAlbaranResponse,
	UpdateAlbaranRequest
} from "@coa/api-types";

export type RetrieveMode
	= "this"
	| "socio-anterior"
	| "socio-siguiente"
	| "primer-listado"
	| "listado-anterior"
	| "listado-siguiente"
	| "ultimo-listado";

export async function retrieveAlbaran(id: string, mode: RetrieveMode = "this") {
	let suffix: string = "";
	if (mode !== "this") suffix = `/${mode}`;

	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}${suffix}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export async function retrieveAlbaranes(filter: RetrieveAlbaranesQueryParams) {
	let queryParams = new URLSearchParams({
		from_id: filter.from_id.toString(),
		to_id: filter.to_id.toString(),
		from_fecha: filter.from_fecha,
		to_fecha: filter.to_fecha,
		socio_id: filter.socio_id.toString(),
		finca_id: filter.finca_id.toString()
	});
	return fetch(`${import.meta.env.VITE_API_HOST}/albaranes?${queryParams.toString()}`, {
		method: "GET",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export async function newAlbaran(data: NewAlbaranRequest) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaranes`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(data)
	});
}

export async function duplicateAlbaran(data: DuplicateAlbaranRequest) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaranes/duplicate`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(data)
	});
}

export async function updateAlbaran(id: string, data: UpdateAlbaranRequest) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}`, {
		method: "PATCH",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(data)
	});
}

export async function addAlbaranProductos(id: string, data: NewAlbaranProductRequest) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}/productos`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(data)
	});
}

export async function deleteAlbaranProductos(id: string, productIds: number[]) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}/productos`, {
		method: "DELETE",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(productIds)
	});
}

export async function addAlbaranAbonos(id: string, data: NewAlbaranAbonoRequest) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}/abonos`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(data)
	});
}

export async function deleteAlbaranAbonos(id: string, productIds: number[]) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}/abonos`, {
		method: "DELETE",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		mode: "cors",
		credentials: "include",
		body: JSON.stringify(productIds)
	});
}

export async function deleteAlbaran(id: string) {
	return fetch(`${import.meta.env.VITE_API_HOST}/albaran/${id}`, {
		method: "DELETE",
		headers: {
			Accept: "application/json"
		},
		mode: "cors",
		credentials: "include"
	});
}

export function buildPartialUpdates(original: RetrieveAlbaranResponse, newData: NewAlbaranRequest): UpdateAlbaranRequest {
	let ret: UpdateAlbaranRequest = {};

	if (JSON.stringify(original.general.sectoresActivados) !== JSON.stringify(newData.general.sectoresActivados)) {
		if (!ret.general) ret.general = {};
		ret.general!.sectoresActivados = newData.general.sectoresActivados;
	}

	if (original.general.tecnicoId !== newData.general.tecnicoId) {
		if (!ret.general) ret.general = {};
		ret.general!.tecnicoId = newData.general.tecnicoId;
	}

	if (original.general.fechaInstrucciones !== newData.general.fechaInstrucciones) {
		if (!ret.general) ret.general = {};
		ret.general!.fechaInstrucciones = newData.general.fechaInstrucciones;
	}

	if (original.general.fechaEjecucion !== newData.general.fechaEjecucion) {
		if (!ret.general) ret.general = {};
		ret.general!.fechaEjecucion = newData.general.fechaEjecucion;
	}

	if (original.general.plazoEjecucionDias !== newData.general.plazoEjecucionDias) {
		if (!ret.general) ret.general = {};
		ret.general!.plazoEjecucionDias = newData.general.plazoEjecucionDias;
	}

	if (original.general.sinInventario !== newData.general.sinInventario) {
		if (!ret.general) ret.general = {};
		ret.general!.sinInventario = newData.general.sinInventario;
	}

	if (original.general.motivoSinInventario !== newData.general.motivoSinInventario) {
		if (!ret.general) ret.general = {};
		ret.general!.motivoSinInventario = newData.general.motivoSinInventario;
	}

	if (original.riego.ce !== newData.riego.ce) {
		if (!ret.riego) ret.riego = {};
		ret.riego!.ce = newData.riego.ce;
	}

	if (original.riego.lm2 !== newData.riego.lm2) {
		if (!ret.riego) ret.riego = {};
		ret.riego!.lm2 = newData.riego.lm2;
	}

	if (original.riego.tiempoRiegoMin !== newData.riego.tiempoRiegoMin) {
		if (!ret.riego) ret.riego = {};
		ret.riego!.tiempoRiegoMin = newData.riego.tiempoRiegoMin;
	}

	if (original.riego.equilibrio !== newData.riego.equilibrio) {
		if (!ret.riego) ret.riego = {};
		ret.riego!.equilibrio = newData.riego.equilibrio;
	}

	if (original.riego.duracionPlanAbono !== newData.riego.duracionPlanAbono) {
		if (!ret.riego) ret.riego = {};
		ret.riego!.duracionPlanAbono = newData.riego.duracionPlanAbono;
	}

	if (JSON.stringify(original.riego.tanqueDiasSemana) !== JSON.stringify(newData.riego.tanqueDiasSemana)) {
		if (!ret.riego) ret.riego = {};
		ret.riego!.tanqueDiasSemana = newData.riego.tanqueDiasSemana;
	}

	if (JSON.stringify(original.laboresCulturales) !== JSON.stringify(newData.laboresCulturales))
		ret.laboresCulturales = newData.laboresCulturales;

	if (original.observaciones !== newData.observaciones)
		ret.observaciones = newData.observaciones;

	if (original.firma !== newData.firma)
		ret.firma = newData.firma;

	return ret;
}

export const printableHTMLHead = `
<style>
body {
	font-family: Inter, sans-serif;
}

table {
	border-collapse: collapse;
	width: 100%;
	border: 1px solid black;
	
	td, th {
		 border: 1px solid black;
	}
}

h1 {
	font-weight: normal;
	text-decoration: underline;
	font-size: 130%;
}

.leftright {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.twopanel {
	display: flex;
	flex-direction: row;
	gap: 1rem;
	
	> div {
		flex-grow: 1;
		width: 100%;
	}
}

.page .page-break {
	break-after: page;
}

@media screen {
	.page .page-break {
		content: "";
		width: 100%;
		height: 4rem;
	}
}

@media print {
	.unprintable {
		display: none;
	}
	
	.page .page-break {
		break-after: page;
	}
}
</style>
<title>Vista previa</title>
`;

export function generatePrintableHTMLBody(data: RetrieveAlbaranResponse[]): string {
	const htmlRepeatHelper = (max: number, content: (i: number) => string): string => {
		let ret: string = "";

		for (let j = 0; j < max; j++)
			ret += content(j);

		return ret;
	};

	const templateHTML: string[] = data.map<string>((albaran: RetrieveAlbaranResponse) => `
<div><button type="button" onclick="window.print()" class="unprintable" style="font-size: 125%; font-family: inherit; padding: 8px 12px;">Imprimir</button></div>
<div class="page">
<div>
COAGRISAN O.P. 1.011/551
</div>
<table>
	<tr>
		<td>SOCIO Nº: ${albaran.general.socioId} ${albaran.view.socioNombre}</td>
		<td colspan="2" rowspan="2">
		TÉCNICO RESPONSABLE:<br>
		${albaran.view.tecnicoNombres} ${albaran.view.tecnicoApellidos}
		</td>
	</tr>
<tr>
 <td>FINCA Nº: ${albaran.general.fincaId.toString().padStart(4, "0")} ${albaran.view.fincaNombre}</td>
</tr>
<tr>
	<td colspan="3">SECTOR ${
	albaran.general.sectoresActivados.map<string>((sectorId: any) =>
		`${albaran.general.fincaId.toString().padStart(4, "0")} ${sectorId.toString().padStart(4, "0")}`
	).join("-")
	}</td>
</tr>
<tr>
	<td>ALBARÁN Nº ${albaran.albaranFullId}</td>
	<td>
		Fecha de instrucción y firma:<br>
		${new Date(albaran.general.fechaInstrucciones).toLocaleDateString("es-ES")}
	</td>
	<td>
		Fecha de ejecución y firma:<br>
		${new Date(albaran.general.fechaEjecucion).toLocaleDateString("es-ES")} - ${albaran.firma}
	</td>
</tr>
</table>
<div class="leftright">
<h1>TRATAMIENTOS FITOSANITARIOS:</h1>
<p><strong>PLAZO DE EJECUCIÓN</strong> ${albaran.general.plazoEjecucionDias}</p>
</div>
<table>
<thead>
<tr>
	<th>Maquinaria</th>
	<th>Producto Comercial</th>
	<th>Materia Activa</th>
	<th>Dosis x 100/L</th>
	<th>Gastos L</th>
	<th>Plazo Seg.</th>
</tr>
</thead>
<tbody>
	${albaran.productos.map((producto: any) => `
	<tr>
		<td>${({
		pulverizador: "Pulverizador",
		espolvoreador: "Espolvoreador",
		riego: "Riego",
		mochila: "Mochila",
		"siembra-manual": "Siembra manual"
	} as any)[producto.maquinaria]}</td>
		<td>${albaran.view.productos.find((productView: any) => productView.id === producto.productoId)?.nombre}</td>
		<td>${albaran.view.productos.find((productView: any) => productView.id === producto.productoId)?.materiaActiva}</td>
		<td>${albaran.view.productos.find((productView: any) => productView.id === producto.productoId)?.dosis}</td>
		<td>${producto.gastosL}</td>
		<td>${albaran.view.productos.find((productView: any) => productView.id === producto.productoId)?.plazoSeguimiento ?? "NP"}</td>
	</tr>
	`).join("")}
</tbody>
</table>
<h1>FERTIRRIGACIÓN:</h1>
<div class="twopanel">
<div>
<table>
<thead>
 <tr>
	 <th>ABONO TANQUE A</th>
	 <th>Kgr</th>
	 <th>ABONO TANQUE B</th>
	 <th>Kgr</th>
 </tr> 
</thead>
<tbody>
	${htmlRepeatHelper(Math.max(albaran.abono.tanqueA.length, albaran.abono.tanqueB.length), i => `
	<tr>
	<td>${albaran.abono.tanqueA[i] ? albaran.view.abonos.find((abono: any) => abono.id === albaran.abono.tanqueA[i].abonoId)!.nombre : ""}</td>
	<td>${albaran.abono.tanqueA[i]?.kilos ?? ""}</td>
	<td>${albaran.abono.tanqueB[i] ? albaran.view.abonos.find((abono: any) => abono.id === albaran.abono.tanqueB[i].abonoId)!.nombre : ""}</td>
		<td>${albaran.abono.tanqueB[i]?.kilos ?? ""}</td>
	</tr>
	`)}
</tbody>
</table>
</div>
<div>
<table>
<thead>
	<tr>
		<th colspan="2">Riego</th>
		<th>Equilibro</th>
	</tr>
</thead>
<tbody>
	<tr>
		<th>C.E.</th>
		<th>L/m2</th>
		<td rowspan="2">${albaran.riego.equilibrio}</td>
	</tr>
	<tr>
		<td>${albaran.riego.ce}</td>
		<td>${albaran.riego.lm2}</td>
	</tr>
</tbody>
</table>
<p></p>
<table>
<thead>
	<tr><th>Tiempo de riego</th></tr>
</thead>
<tbody>
	<tr><td>${albaran.riego.tiempoRiegoMin} min.</td></tr>
</tbody>
</table>
<p></p>
<table>
<thead>
	<tr><th>Duración Plan Abonado</th></tr>
</thead>
<tbody>
	<tr><td>${
		({
			"1semana": "1 semana",
			"15dias": "15 días",
			"1mes": "1 mes",
			"indefinido": "Indefinido"
		} as any)[albaran.riego.duracionPlanAbono]
	}</td></tr>
</tbody>
</table>
<p></p>
<table>
<caption><b>TANQUE</b></caption>
<thead>
	<tr>
		<th>L</th>
		<th>M</th>
		<th>X</th>
		<th>J</th>
		<th>V</th>
		<th>S</th>
		<th>D</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("lunes") ? "X" : ""}</td>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("martes") ? "X" : ""}</td>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("miercoles") ? "X" : ""}</td>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("jueves") ? "X" : ""}</td>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("viernes") ? "X" : ""}</td>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("sabado") ? "X" : ""}</td>
		<td style="text-align: center;">${albaran.riego.tanqueDiasSemana.includes("domingo") ? "X" : ""}</td>
	</tr>
</tbody>
</table>
</div>
</div>
<h1>OBSERVACIONES:</h1>
<pre>${albaran.observaciones}</pre>
<div class="page-break"></div>
</div>
	`);
	return templateHTML.join("");
}
