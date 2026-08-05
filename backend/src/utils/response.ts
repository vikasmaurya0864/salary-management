/**
 * Standard success envelope every `/api/*` route should return, mirroring
 * the `{ success: false, error }` shape used by the global error handler
 * (see `src/plugins/error-handler.ts`) so API consumers always get one of
 * exactly two predictable response shapes.
 */
export interface SuccessResponseBody<T> {
  success: true;
  data: T;
}

export function successResponse<T>(data: T): SuccessResponseBody<T> {
  return { success: true, data };
}
