/*
 * Copyright (c) 2025 Coagrisan Servicios S.L. Todos los derechos reservados.
 */

export async function triggerBcSync() {
  return fetch(`${import.meta.env.VITE_API_HOST}/bc-sync`, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    },
    mode: 'cors',
    credentials: 'include'
  })
}

export async function retrieveBcSyncStatus() {
  return fetch(`${import.meta.env.VITE_API_HOST}/bc-sync/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    mode: 'cors',
    credentials: 'include'
  })
}
