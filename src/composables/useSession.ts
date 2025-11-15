/*
 * Detecta si existe una sesión activa comprobando la cookie de sesión.
 */
export function useSession() {
  const hasSession = (): boolean => {
    try {
      return document.cookie.split('; ').some(c => c.startsWith('sid='))
    } catch {
      return false
    }
  }

  return { hasSession }
}