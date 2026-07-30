<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Form, type FormResolverOptions, type FormSubmitEvent } from '@primevue/forms'
import type { VirtualScrollerLazyEvent, SelectChangeEvent } from 'primevue'
import type { RetrieveFincaResponse, RetrieveSocioResponse } from '@coa/api-types'
import { useMasterDataCache } from '@/composables/useMasterDataCache'
import { useLazySelect } from '@/composables/useLazySelect'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { useSession } from '@/composables/useSession'
import * as socios from '@/services/socios'
import * as fincas from '@/services/fincas'
// Nota: para sectores offline, usamos retrieveSectoresByFinca del servicio de sectores,
// que ya resuelve desde cache leyendo los sectores asociados a la finca
import { cacheService } from '@/services/cacheService'
import * as sectoresService from '@/services/sectores'
import { selectScrollHeight } from '@/utils/selectSizing'

const visible = defineModel('visible', { type: Boolean, required: true, default: false })

// Estado de red y caché
const { isOnline } = useNetworkStatus()
const { hasSession } = useSession()
const { getSocios, getFincas } = useMasterDataCache()

// Tipos locales para opciones en Select (incluye bc_id opcional si viene del backend/cache)
type FincaOption = RetrieveFincaResponse & { bc_id?: string }

// Selects con lazy loading paginado
const sociosLazy = useLazySelect<RetrieveSocioResponse>()
const sociosList = sociosLazy.items
const loadingSocio = sociosLazy.loading

const fincasLazy = useLazySelect<FincaOption>()
const fincasList = fincasLazy.items
const loadingFinca = fincasLazy.loading
const selectedSocioId = ref<number | null>(null)
const selectedFincaId = ref<number | null>(null)

// Altura del panel de cada Select según la cantidad de opciones cargadas, para que no
// quede un espacio vacío enorme cuando hay pocos resultados.
const socioScrollHeight = computed(() => selectScrollHeight(sociosList.value.length))
const fincaScrollHeight = computed(() => selectScrollHeight(fincasList.value.length))
const socioCodigo = ref<string>('')
const fincaCodigo = ref<string>('')

// UI y rol
const readOnlyMode = ref<boolean>(true)
const editMode = computed({
  get: () => !readOnlyMode.value,
  set: (val: boolean) => {
    readOnlyMode.value = !val
  }
})
type UserRole = 'socio' | 'tecnico'
const currentRole = ref<UserRole | null>(null)

// Sectores
const loadingSectores = ref<boolean>(false)
type SectorRow = { id?: number; socio: string; finca: string; sector: string; sinInventario?: boolean }
const sectoresRows = ref<SectorRow[]>([])
const sectoresOriginalRows = ref<SectorRow[]>([])
const pendingUpdates = ref<Array<{ id: number; sinInventario: boolean }>>([])

function formResolver(e: FormResolverOptions): Record<string, any> {
  return { values: e.values, errors: {} }
}

async function onSubmitForm(e: FormSubmitEvent) {
  // Guardar cambios pendientes de sectores
  if (currentRole.value !== 'socio') return
  if (!selectedFincaId.value) return
  if (pendingUpdates.value.length === 0) return
  try {
    const res = await sectoresService.bulkUpdateSectores(selectedFincaId.value, pendingUpdates.value)
    if (!res.ok) throw new Error(`Error al guardar sectores: ${res.status}`)
    pendingUpdates.value = []
    // Aceptar cambios en snapshot original tras guardar
    sectoresOriginalRows.value = sectoresRows.value.map(r => ({ ...r }))
  } catch (err) {
    console.error('Fallo al guardar cambios de sectores:', err)
  }
}

function resetAll() {
  // Limpiar selects y códigos
  selectedSocioId.value = null
  selectedFincaId.value = null
  socioCodigo.value = ''
  fincaCodigo.value = ''

  // Vaciar listas y tabla
  sociosLazy.reset()
  fincasLazy.reset()
  sectoresRows.value = []
  sectoresOriginalRows.value = []
  pendingUpdates.value = []

  // Reset de flags de carga y modo
  loadingSectores.value = false
  readOnlyMode.value = true
}

function onHideDialog() {
  // Al cerrar el diálogo, limpiar todo
  resetAll()
}

function detectRoleFromLocalStorage(): UserRole | null {
  try {
    const direct = localStorage.getItem('userRole') || localStorage.getItem('role')
    if (direct === 'tecnico' || direct === 'socio') return direct
    const authUser = localStorage.getItem('auth.user') || localStorage.getItem('authUser') || localStorage.getItem('currentUser')
    if (authUser) {
      const parsed = JSON.parse(authUser)
      const r = parsed?.role
      if (r === 'tecnico' || r === 'socio') return r
    }
  } catch { }
  return null
}

// Carga inicial (primera página de 50 elementos)
async function loadInitialSocios() {
  await sociosLazy.loadInitial(
    (p) => socios.retrieveSocios(p),
    { cacheFn: getSocios, isOnline: isOnline.value, hasSession: hasSession() }
  )
}

async function loadInitialFincas() {
  // Sin socio seleccionado no hay nada que listar (una finca siempre pertenece a un socio)
  if (!selectedSocioId.value) {
    fincasLazy.reset()
    return
  }
  await fincasLazy.loadInitial(
    (p) => fincas.retrieveFincas({ ...p, socioId: selectedSocioId.value! }),
    {
      cacheFn: () => getFincas().filter((f: any) => f.socioId === selectedSocioId.value),
      isOnline: isOnline.value,
      hasSession: hasSession()
    }
  )
}

// Lazy load handlers para virtual scroller
async function onLazyLoadSocios(e: VirtualScrollerLazyEvent) {
  await sociosLazy.onLazyLoad(e,
    (p) => socios.retrieveSocios(p),
    { isOnline: isOnline.value, hasSession: hasSession() }
  )
}

async function onLazyLoadFincas(e: VirtualScrollerLazyEvent) {
  if (!selectedSocioId.value) return
  await fincasLazy.onLazyLoad(e,
    (p) => fincas.retrieveFincas({ ...p, socioId: selectedSocioId.value! }),
    { isOnline: isOnline.value, hasSession: hasSession() }
  )
}

// Sincronización entre Select y Input de código (Socio)
function onChangeSelectSocio(e: SelectChangeEvent) {
  const v = (e as any)?.value ?? null
  selectedSocioId.value = v
  // Mostrar el bc_id del socio seleccionado en el input (fallback al id formateado)
  if (v) {
    const socioSel = sociosList.value.find(s => s.id === v)
    const codigo = socioSel?.bc_id ?? v.toString().padStart(4, '0')
    socioCodigo.value = codigo
  } else {
    socioCodigo.value = ''
  }

  // Cambiar de socio invalida la finca previamente seleccionada (pertenece a otro socio)
  selectedFincaId.value = null
  fincaCodigo.value = ''
  sectoresRows.value = []
  pendingUpdates.value = []
  fincasLazy.reset()
  loadInitialFincas()
}

async function onChangeSocioId(event: Event) {
  const target = event.target as HTMLInputElement
  const codigo = target.value.trim()
  socioCodigo.value = codigo
  // Permitir coincidencias desde 1 carácter; limpiar sólo si está vacío
  if (codigo.length === 0) {
    selectedSocioId.value = null
    selectedFincaId.value = null
    fincaCodigo.value = ''
    fincasLazy.reset()
    return
  }

  // Buscar coincidencias por nombre o bc_id (ilike); si hay varias, usar la primera
  const term = codigo.toLowerCase()
  const coincidencias = sociosList.value.filter(s =>
    (s.bc_id ?? '').toString().trim().toLowerCase().includes(term) ||
    (s.nombre ?? '').toLowerCase().includes(term)
  )
  const socio = coincidencias[0]

  const socioIdAnterior = selectedSocioId.value

  if (socio) {
    selectedSocioId.value = socio.id
    // Inyectar en opciones si no existe para que el Select muestre etiqueta
    if (!sociosList.value.some(s => s.id === socio.id)) {
      sociosList.value = [socio, ...sociosList.value]
    }
  } else {
    selectedSocioId.value = null
  }

  // Cambiar de socio invalida la finca previamente seleccionada
  if (selectedSocioId.value !== socioIdAnterior) {
    selectedFincaId.value = null
    fincaCodigo.value = ''
    sectoresRows.value = []
    pendingUpdates.value = []
    fincasLazy.reset()
    if (selectedSocioId.value) loadInitialFincas()
  }
  // No sobrescribir lo que el usuario está escribiendo
}

// Sincronización entre Select y Input de código (Finca)
function onChangeSelectFinca(e: SelectChangeEvent) {
  // Mostrar bc_id si está disponible; fallback al id formateado
  const fincaSel = fincasList.value.find(f => f.id === e.value)
  fincaCodigo.value = fincaSel?.bc_id ?? e.value.toString().padStart(4, '0')
  selectedFincaId.value = e.value ?? null
  loadSectoresForSelection()
}

async function onChangeFincaId(event: Event) {
  const target = event.target as HTMLInputElement
  const codigo = target.value.trim()
  fincaCodigo.value = codigo

  if (codigo.length === 0) {
    selectedFincaId.value = null
    pendingUpdates.value = []
    return
  }

  // Buscar coincidencias por nombre o bc_id (ilike); si hay varias, usar la primera
  const term = codigo.toLowerCase()
  const finca = fincasList.value.find(f => {
    const bc = (f.bc_id ?? '').toString().trim().toLowerCase()
    const nombre = (f.nombre ?? '').toLowerCase()
    return bc.includes(term) || nombre.includes(term)
  })

  if (finca) {
    selectedFincaId.value = finca.id
    // Inyectar en opciones si no existe para que el Select muestre etiqueta
    if (!fincasList.value.some(ff => ff.id === finca!.id)) {
      fincasList.value = [finca!, ...fincasList.value]
    }
  } else {
    selectedFincaId.value = null
  }
  // No sobrescribir lo que el usuario está escribiendo
  loadSectoresForSelection()
}

async function loadSectoresForSelection() {
  // Limpiar si falta finca
  if (!selectedFincaId.value) {
    sectoresRows.value = []
    pendingUpdates.value = []
    return
  }
  // Si no hay sesión o conexión, cargar sectores desde cache a través del servicio
  if (!hasSession() || !isOnline.value) {
    loadingSectores.value = true
    try {
      const fincaSel = fincasList.value.find(f => f.id === selectedFincaId.value)
      const socioNombre = (() => {
        if (selectedSocioId.value) return sociosList.value.find(s => s.id === selectedSocioId.value)?.nombre ?? ''
        const sid = (fincaSel as any)?.socioId
        return sid ? (sociosList.value.find(s => s.id === sid)?.nombre ?? '') : ''
      })()
      const fincaNombre = fincaSel?.nombre ?? ''
      const resp = await sectoresService.retrieveSectoresByFinca(selectedFincaId.value)
      if (!resp.ok) {
        sectoresRows.value = []
        pendingUpdates.value = []
        return
      }
      const sectores: any[] = await resp.json()
      sectoresRows.value = (sectores || []).map((sec: any) => ({
        id: sec?.id,
        socio: socioNombre,
        finca: fincaNombre,
        sector: sectoresService.parseSectorNumero(sec),
        sinInventario: (typeof sec?.sin_inventario !== 'undefined') ? sec.sin_inventario : sec?.sinInventario
      }))
      sectoresOriginalRows.value = sectoresRows.value.map(r => ({ ...r }))
      pendingUpdates.value = []
    } catch (err) {
      console.error('Error al cargar sectores (offline/cache):', err)
      sectoresRows.value = []
    } finally {
      loadingSectores.value = false
    }
    return
  }
  loadingSectores.value = true
  try {
    const fincaSel = fincasList.value.find(f => f.id === selectedFincaId.value)
    const socioNombre = (() => {
      if (selectedSocioId.value) return sociosList.value.find(s => s.id === selectedSocioId.value)?.nombre ?? ''
      const sid = (fincaSel as any)?.socioId
      return sid ? (sociosList.value.find(s => s.id === sid)?.nombre ?? '') : ''
    })()
    const fincaNombre = fincaSel?.nombre ?? ''

    const resp = await sectoresService.retrieveSectoresByFinca(selectedFincaId.value)
    if (!resp.ok) {
      sectoresRows.value = []
      pendingUpdates.value = []
      return
    }
    const sectores: any[] = await resp.json()
    sectoresRows.value = (sectores || []).map((sec: any) => ({
      id: sec?.id,
      socio: socioNombre,
      finca: fincaNombre,
      sector: sectoresService.parseSectorNumero(sec),
      sinInventario: (typeof sec?.sin_inventario !== 'undefined') ? sec.sin_inventario : sec?.sinInventario
    }))
    sectoresOriginalRows.value = sectoresRows.value.map(r => ({ ...r }))
    pendingUpdates.value = []
  } catch (err) {
    console.error('Error al cargar sectores:', err)
    sectoresRows.value = []
  } finally {
    loadingSectores.value = false
  }
}

function onToggleSectorEstado(row: SectorRow, newVal?: boolean) {
  const nextVal = typeof newVal === 'boolean' ? newVal : !!row.sinInventario
  row.sinInventario = nextVal
  if (!row.id && row.id !== 0) {
    console.warn('Sector sin id, no se puede preparar actualización en lote')
    return
  }
  const idx = pendingUpdates.value.findIndex(u => u.id === row.id)
  if (idx >= 0) {
    pendingUpdates.value[idx].sinInventario = nextVal
  } else {
    pendingUpdates.value.push({ id: row.id!, sinInventario: nextVal })
  }
}

onMounted(() => {
  currentRole.value = detectRoleFromLocalStorage()
  if (currentRole.value === 'tecnico') {
    readOnlyMode.value = true
  }
  // Al abrir por primera vez, garantizar estado limpio
  resetAll()
  loadInitialSocios()
  loadInitialFincas()
})

// Re-evaluar rol al abrir/cerrar el diálogo para evitar persistencias tras logout/login
watch(visible, (isOpen) => {
  if (isOpen) {
    currentRole.value = detectRoleFromLocalStorage()
    // Técnicos siempre en modo lectura
    if (currentRole.value === 'tecnico') {
      readOnlyMode.value = true
    } else {
      // Al abrir, mantener el estado actual de edición, pero nunca permitir edición a técnicos
      // Si venimos de un logout, el reset ya dejó en lectura; el usuario podrá activar edición si es socio
      readOnlyMode.value = readOnlyMode.value && currentRole.value !== 'socio' ? true : readOnlyMode.value
    }

    // Repoblar selects al abrir: tras cerrar se vacían por resetAll()
    // Carga inicial rápida desde caché y luego API si hay sesión/conexión
    loadInitialSocios()
    loadInitialFincas()
  } else {
    // Al cerrar, limpiar estado para no arrastrar valores entre sesiones
    resetAll()
  }
})

// Responder dinámicamente a cambios de conectividad para repoblar selects
watch(isOnline, (online) => {
  if (!visible.value) return
  if (online && hasSession()) {
    // Con conexión y sesión: refrescar desde API en background
    void loadInitialSocios()
    void loadInitialFincas()
  } else {
    // Sin conexión o sin sesión: asegurar que los Selects muestren cache
    sociosLazy.reset()
    sociosList.value = getSocios()
    sociosLazy.hasMore.value = false
    fincasLazy.reset()
    fincasList.value = selectedSocioId.value
      ? getFincas().filter((f: any) => f.socioId === selectedSocioId.value)
      : []
    fincasLazy.hasMore.value = false
  }
})

// Al volver a modo lectura sin guardar, deshacer cambios
watch(readOnlyMode, (val, oldVal) => {
  if (currentRole.value === 'tecnico') {
    // Forzar lectura para técnicos siempre
    readOnlyMode.value = true
    return
  }
  if (val === true && oldVal === false) {
    // Revertir cambios locales no guardados
    sectoresRows.value = sectoresOriginalRows.value.map(r => ({ ...r }))
    pendingUpdates.value = []
  }
})
</script>

<template>
  <Dialog header="Gestión de inventario" modal v-model:visible="visible" :style="{ width: '70rem' }"
    :breakpoints="{ '1000px': '95vw' }" appendTo="body" @hide="onHideDialog">
    <Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off" class="p-2">
      <div class="w-full flex flex-row gap-4">
        <!-- Columna izquierda: filtros y acciones rápidas -->
        <div class="flex flex-col gap-4 w-80 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <label class="w-20 text-end font-semibold pr-2" for="gestion-inventario-socio-id">Socio:</label>
            <InputText name="socioId" id="gestion-inventario-socio-id" spellcheck="false" class="w-24"
              v-model="socioCodigo" @input="onChangeSocioId" />
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <Select v-model="selectedSocioId" :options="sociosList" :scrollHeight="socioScrollHeight" :virtualScrollerOptions="{
                lazy: true,
                onLazyLoad: onLazyLoadSocios,
                itemSize: 36,
                showLoader: true,
                loading: loadingSocio
              }" optionLabel="nombre" optionValue="id" :filterFields="['nombre', 'bc_id']" placeholder="Seleccione"
                name="socio" filter class="w-full max-w-full" @change="onChangeSelectSocio"></Select>
              <Message v-if="$form.socio?.invalid ?? false" severity="error" size="small" variant="simple"
                v-text="$form.socio.error.message"></Message>
            </div>
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <label class="w-20 text-end font-semibold pr-2" for="gestion-inventario-finca-id">Finca:</label>
            <InputText name="fincaId" id="gestion-inventario-finca-id" spellcheck="false" class="w-24" inputmode="text"
              v-model="fincaCodigo" @input="onChangeFincaId" :disabled="!selectedSocioId" />
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <Select v-model="selectedFincaId" :options="fincasList" :scrollHeight="fincaScrollHeight" :virtualScrollerOptions="{
                lazy: true,
                onLazyLoad: onLazyLoadFincas,
                itemSize: 36,
                showLoader: true,
                loading: loadingFinca
              }" optionLabel="nombre" optionValue="id" :filterFields="['nombre', 'bc_id']" placeholder="Seleccione"
                name="finca" filter class="w-full max-w-full" @change="onChangeSelectFinca"
                :disabled="!selectedSocioId"></Select>
              <Message v-if="$form.finca?.invalid ?? false" severity="error" size="small" variant="simple"
                v-text="$form.finca.error.message"></Message>
            </div>
          </div>
        </div>

        <!-- Columna derecha: listado -->
        <div class="flex-1">
          <Fieldset legend="Listado de sectores">
            <DataTable :value="sectoresRows" size="small">
              <Column field="socio" header="Socio" />
              <Column field="finca" header="Finca" />
              <Column field="sector" header="Sector" />
              <Column header="Estado">
                <template #body="{ data }">
                  <div class="flex items-center gap-2">
                    <span class="text-sm pr-2" :class="data.sinInventario ? 'text-red-500' : 'text-green-500'">{{ (data.sinInventario === undefined) ? '—' : (data.sinInventario ?
                      'Pendiente' : 'Realizado') }}</span>
                      <ToggleSwitch :disabled="readOnlyMode || currentRole !== 'socio'" :modelValue="!data.sinInventario"
                        :pt="{
                          slider: (options) => {
                            if (options.context.disabled) {
                              return 'bg-black/5! outline-[2px]! outline-gray-400!';
                            } else if (options.context.checked) {
                              return 'bg-green-600/10! outline! outline-green-600!';
                            } else if (!options.context.checked) {
                              return 'bg-red-500/10! outline! outline-red-500!';
                            }
                          },
                          handle: (options) => {
                            if (options.context.disabled) {
                              return 'bg-gray-400!';
                            } else if (options.context.checked) {
                              return 'bg-green-600!';
                            } else if (!options.context.checked) {
                              return 'bg-red-500/80!';
                            }
                          }
                        }" @update:modelValue="(val) => onToggleSectorEstado(data, !val)" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Fieldset>
        </div>
      </div>

      <div class="flex items-center justify-between py-4">
        <Button icon="pi pi-save" label="Grabar" iconPos="left" type="submit" variant="outlined"
          :disabled="currentRole !== 'socio' || readOnlyMode || pendingUpdates.length === 0" />
        <div class="flex items-center gap-2">
          <span :class="{ 'text-primary': editMode }">{{ editMode ? 'Modo Edición' : 'Modo Lectura' }}</span>
          <ToggleSwitch v-model="editMode" :disabled="currentRole !== 'socio'" :pt="{
            slider: (options) => {
              if (options.context.disabled) {
                return 'bg-black/5! outline-[2px]! outline-gray-400!';
              } else if (options.context.checked) {
                return 'bg-primary/10! outline! outline-primary!';
              } else if (!options.context.checked) {
                return 'bg-white! outline! outline-black!';
              }
            },
            handle: (options) => {
              if (options.context.disabled) {
                return 'bg-gray-400!';
              } else if (options.context.checked) {
                return 'bg-primary!';
              } else if (!options.context.checked) {
                return 'bg-black/80!';
              }
            }
          }" />
        </div>
      </div>
    </Form>
  </Dialog>
</template>

<style scoped></style>