<!--
  - Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
  -->

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Form, type FormResolverOptions, type FormSubmitEvent } from '@primevue/forms'
import type { VirtualScrollerLazyEvent, SelectChangeEvent } from 'primevue'
import type { RetrieveFincaResponse, RetrieveSocioResponse } from '@coa/api-types'
import { useMasterDataCache } from '@/composables/useMasterDataCache'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import * as socios from '@/services/socios'
import * as fincas from '@/services/fincas'
import { cacheService } from '@/services/cacheService'
import * as sectoresService from '@/services/sectores'

const visible = defineModel('visible', { type: Boolean, required: true, default: false })

// Estado de red y caché
const { isOnline } = useNetworkStatus()
const { getSocios, getFincas } = useMasterDataCache()

// Selects
const sociosList = ref<RetrieveSocioResponse[]>([])
const fincasList = ref<RetrieveFincaResponse[]>([])
const loadingSocio = ref<boolean>(false)
const loadingFinca = ref<boolean>(false)
const selectedSocioId = ref<number | null>(null)
const selectedFincaId = ref<number | null>(null)
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

function onHideDialog() {}

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
  } catch {}
  return null
}

// Carga inicial rápida desde caché
async function loadInitialSocios() {
  if (sociosList.value.length > 0) return
  loadingSocio.value = true
  try {
    const cached = getSocios()
    if (cached.length > 0) {
      sociosList.value = cached
    } else if (isOnline.value) {
      const response = await socios.retrieveSocios({ limit: 1000, offset: 0 })
      if (response.ok) sociosList.value = await response.json()
    }
  } catch (err) {
    console.error('Error al cargar socios (maquetación):', err)
  } finally {
    loadingSocio.value = false
  }
}

async function loadInitialFincas() {
  if (fincasList.value.length > 0) return
  loadingFinca.value = true
  try {
    const cached = getFincas()
    if (cached.length > 0) {
      fincasList.value = cached
    } else if (isOnline.value) {
      const response = await fincas.retrieveFincas({ limit: 1000, offset: 0 })
      if (response.ok) fincasList.value = await response.json()
    }
  } catch (err) {
    console.error('Error al cargar fincas (maquetación):', err)
  } finally {
    loadingFinca.value = false
  }
}

// Lazy loaders (simulan paginación con datos en caché)
async function onLazyLoadSocios(e: VirtualScrollerLazyEvent) {
  if (loadingSocio.value) return
  loadingSocio.value = true
  try {
    const cached = getSocios()
    const start = e.first
    const end = e.last
    const slice = cached.slice(start, end)
    const items = [...sociosList.value]
    for (let i = 0; i < slice.length; i++) items[start + i] = slice[i]
    sociosList.value = items
  } finally {
    loadingSocio.value = false
  }
}

async function onLazyLoadFincas(e: VirtualScrollerLazyEvent) {
  if (loadingFinca.value) return
  loadingFinca.value = true
  try {
    const cached = getFincas()
    const start = e.first
    const end = e.last
    const slice = cached.slice(start, end)
    const items = [...fincasList.value]
    for (let i = 0; i < slice.length; i++) items[start + i] = slice[i]
    fincasList.value = items
  } finally {
    loadingFinca.value = false
  }
}

// Sincronización entre Select y Input de código (Socio)
function onChangeSelectSocio(e: SelectChangeEvent) {
  const v = (e as any)?.value ?? null
  selectedSocioId.value = v
  socioCodigo.value = v ? v.toString().padStart(4, '0') : ''
  if (!v) {
    selectedFincaId.value = null
    fincaCodigo.value = ''
    sectoresRows.value = []
    pendingUpdates.value = []
  }
}

function onChangeSocioId(event: Event) {
  const target = event.target as HTMLInputElement
  const codigo = target.value.trim()
  socioCodigo.value = codigo

  if (codigo.length < 3) {
    selectedSocioId.value = null
    // Al no haber socio, inhabilitar y limpiar finca
    selectedFincaId.value = null
    fincaCodigo.value = ''
    return
  }

  const socio = sociosList.value.find(s => s.id.toString().padStart(4, '0') === codigo.padStart(4, '0'))
  selectedSocioId.value = socio ? socio.id : null
}

// Sincronización entre Select y Input de código (Finca)
function onChangeSelectFinca(e: SelectChangeEvent) {
  fincaCodigo.value = e.value?.toString().padStart(4, '0') ?? ''
  selectedFincaId.value = e.value ?? null
  loadSectoresForSelection()
}

function onChangeFincaId(event: Event) {
  const target = event.target as HTMLInputElement
  const codigo = target.value.trim()
  fincaCodigo.value = codigo

  if (codigo.length < 3) {
    selectedFincaId.value = null
    pendingUpdates.value = []
    return
  }

  const finca = fincasList.value.find(f => f.id.toString().padStart(4, '0') === codigo.padStart(4, '0'))
  selectedFincaId.value = finca ? finca.id : null
  loadSectoresForSelection()
}

async function loadSectoresForSelection() {
  // Limpiar si falta socio o finca
  if (!selectedSocioId.value || !selectedFincaId.value) {
    sectoresRows.value = []
    pendingUpdates.value = []
    return
  }
  loadingSectores.value = true
  try {
    const socioNombre = sociosList.value.find(s => s.id === selectedSocioId.value)?.nombre ?? ''
    const fincaNombre = fincasList.value.find(f => f.id === selectedFincaId.value)?.nombre ?? ''

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
  loadInitialSocios()
  loadInitialFincas()
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
  <Dialog
    header="Gestión de inventario"
    modal
    v-model:visible="visible"
    :style="{ width: '70rem' }"
    :breakpoints="{ '1000px': '95vw' }"
    appendTo="body"
    @hide="onHideDialog"
  >
    <Form v-slot="$form" :resolver="formResolver" @submit="onSubmitForm" autocomplete="off" class="p-2">
  <div class="w-full flex flex-row gap-4">
        <!-- Columna izquierda: filtros y acciones rápidas -->
        <div class="flex flex-col gap-4 w-80 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <label class="w-20 text-end font-semibold pr-2" for="gestion-inventario-socio-id">Socio:</label>
            <InputText
              name="socioId"
              id="gestion-inventario-socio-id"
              spellcheck="false"
              inputmode="numeric"
              class="w-24"
              v-model="socioCodigo"
              @input="onChangeSocioId"
            />
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <Select
                v-model="selectedSocioId"
                :options="sociosList"
                :virtualScrollerOptions="{
                  lazy: true,
                  onLazyLoad: onLazyLoadSocios,
                  itemSize: 36,
                  showLoader: true,
                  loading: loadingSocio
                }"
                optionLabel="nombre"
                optionValue="id"
                placeholder="Seleccione"
                name="socio"
                filter
                class="w-full max-w-full"
                @change="onChangeSelectSocio"
              ></Select>
              <Message
                v-if="$form.socio?.invalid ?? false"
                severity="error"
                size="small"
                variant="simple"
                v-text="$form.socio.error.message"
              ></Message>
            </div>
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <label class="w-20 text-end font-semibold pr-2" for="gestion-inventario-finca-id">Finca:</label>
            <InputText
              name="fincaId"
              id="gestion-inventario-finca-id"
              spellcheck="false"
              class="w-24"
              inputmode="numeric"
              v-model="fincaCodigo"
              @input="onChangeFincaId"
              :disabled="!selectedSocioId"
            />
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <Select
                v-model="selectedFincaId"
                :options="fincasList"
                :virtualScrollerOptions="{
                  lazy: true,
                  onLazyLoad: onLazyLoadFincas,
                  itemSize: 36,
                  showLoader: true,
                  loading: loadingFinca
                }"
                optionLabel="nombre"
                optionValue="id"
                placeholder="Seleccione"
                name="finca"
                filter
                class="w-full max-w-full"
                @change="onChangeSelectFinca"
                :disabled="!selectedSocioId"
              ></Select>
              <Message
                v-if="$form.finca?.invalid ?? false"
                severity="error"
                size="small"
                variant="simple"
                v-text="$form.finca.error.message"
              ></Message>
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
                    <InputSwitch
                      :disabled="readOnlyMode || currentRole !== 'socio'"
                      v-model="data.sinInventario"
                      @change="(e) => onToggleSectorEstado(data, e?.value ?? data.sinInventario)"
                    />
                    <span class="text-sm">{{ (data.sinInventario === undefined) ? '—' : (data.sinInventario ? 'Pendiente' : 'Realizado') }}</span>
                  </div>
                </template>
              </Column>
            </DataTable>
          </Fieldset>
        </div>
      </div>

      <div class="flex items-center justify-between py-4">
        <Button icon="pi pi-save" label="Grabar" iconPos="left" type="submit" variant="outlined" :disabled="currentRole !== 'socio' || readOnlyMode || pendingUpdates.length === 0" />
        <div class="flex items-center gap-2">
          <span>{{ editMode ? 'Modo Edición' : 'Modo Lectura' }}</span>
          <InputSwitch v-model="editMode" :disabled="currentRole !== 'socio'" />
        </div>
      </div>
    </Form>
  </Dialog>
</template>

<style scoped>
</style>