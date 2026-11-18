let lastLocalMutationAt = 0;

/**
 * Registra que esta pestaña acaba de ejecutar una Server Action con `revalidatePath`.
 * Permite que RealtimeRefresher omita el rebote duplicado de `router.refresh()`
 * que llegaría ~200ms después vía WebSocket para la misma mutación.
 */
export function markLocalMutation() {
  lastLocalMutationAt = Date.now();
}

export function isRecentLocalMutation(windowMs = 2000): boolean {
  return Date.now() - lastLocalMutationAt < windowMs;
}
