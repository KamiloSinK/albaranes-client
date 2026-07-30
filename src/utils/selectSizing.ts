/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

const ITEM_HEIGHT_PX = 36;
const MAX_VISIBLE_ITEMS = 6;

// El <ul> de la lista de opciones (dentro del área con scroll) tiene su propio padding
// y gap entre filas (tokens `list.padding` = 0.25rem arriba/abajo y `list.gap` = 2px en
// el tema Aura). Si no se suman aquí, esa altura extra desborda el contenedor y aparece
// scroll incluso con una sola opción.
const LIST_PADDING_Y_PX = 8;
const ITEM_GAP_PX = 2;

/**
 * Altura del panel de un Select (scrollHeight) según la cantidad de opciones
 * visibles, para que no quede un espacio vacío cuando hay pocos resultados.
 * Se limita a MAX_VISIBLE_ITEMS filas, igual que el valor por defecto de PrimeVue.
 */
export function selectScrollHeight(count: number): string {
	const items = Math.min(Math.max(count, 1), MAX_VISIBLE_ITEMS);
	const height = LIST_PADDING_Y_PX + items * ITEM_HEIGHT_PX + Math.max(items - 1, 0) * ITEM_GAP_PX;
	return `${height}px`;
}
